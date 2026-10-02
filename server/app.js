import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.js';

const categories = new Set([
  'Food & dining', 'Transport', 'Entertainment', 'Bills', 'Health', 'Shopping', 'Other',
]);
const sessionCookie = 'bg_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cookieOptions(secure) {
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionDurationMs / 1000)}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(secure) {
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

function readSessionToken(request) {
  const cookies = (request.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === sessionCookie) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return '';
}

function sendError(response, status, message) {
  return response.status(status).json({ error: message });
}

function validDate(value, optional = false) {
  if (optional && (value === null || value === '')) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validateExpense(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const amount = Number(input.amount);
  const category = input.category;
  const date = input.date;
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!title || title.length > 100) return 'Expense name must be between 1 and 100 characters.';
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return 'Amount must be greater than zero and at most 1,000,000,000.';
  }
  if (!categories.has(category)) return 'Choose a valid expense category.';
  if (!validDate(date)) return 'Enter a valid expense date.';
  if (note.length > 500) return 'Note must be 500 characters or fewer.';
  return { title, category, amount: Math.round(amount * 100) / 100, date, note };
}

function validateGoal(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const targetAmount = Number(input.targetAmount);
  const currentAmount = Number(input.currentAmount ?? 0);
  const targetDate = input.targetDate || null;
  if (!title || title.length > 80) return 'Goal name must be between 1 and 80 characters.';
  if (!Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 1_000_000_000) {
    return 'Target amount must be greater than zero and at most 1,000,000,000.';
  }
  if (!Number.isFinite(currentAmount) || currentAmount < 0 || currentAmount > targetAmount) {
    return 'Current savings must be between zero and the target amount.';
  }
  if (!validDate(targetDate, true)) return 'Enter a valid target date.';
  return {
    title,
    targetAmount: Math.round(targetAmount * 100) / 100,
    currentAmount: Math.round(currentAmount * 100) / 100,
    targetDate,
  };
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

export function createApp({ db = createDatabase(), secureCookies = process.env.NODE_ENV === 'production', serveFrontend = true } = {}) {
  const app = express();
  app.locals.db = db;

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (request, response, next) => {
    if (request.body === undefined || request.body === null || typeof request.body !== 'object' || Array.isArray(request.body)) {
      request.body = {};
    }
    next();
  });

  app.use('/api', (request, response, next) => {
    const origin = request.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== request.get('host')) {
          return sendError(response, 403, 'Cross-origin requests are not allowed.');
        }
      } catch {
        return sendError(response, 403, 'Invalid request origin.');
      }
    }
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });

  function createSession(userId, response) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
    db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
      .run(userId, sha256(token), expiresAt);
    response.setHeader('Set-Cookie', `${sessionCookie}=${token}; ${cookieOptions(secureCookies)}`);
  }

  function authenticate(request, response, next) {
    const token = readSessionToken(request);
    if (!token) return sendError(response, 401, 'Please sign in to continue.');
    const session = db.prepare(`
      SELECT sessions.id AS sessionId, sessions.expires_at AS expiresAt,
             users.id, users.email, users.name
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
    `).get(sha256(token));
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      if (session) db.prepare('DELETE FROM sessions WHERE id = ?').run(session.sessionId);
      response.setHeader('Set-Cookie', clearSessionCookie(secureCookies));
      return sendError(response, 401, 'Your session has expired. Please sign in again.');
    }
    request.user = { id: session.id, email: session.email, name: session.name };
    request.sessionId = session.sessionId;
    next();
  }

  app.post('/api/auth/register', authLimiter, (request, response) => {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body.password;
    if (!name || name.length > 80) return sendError(response, 400, 'Name must be between 1 and 80 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return sendError(response, 400, 'Enter a valid email address.');
    }
    if (typeof password !== 'string' || password.length < 10 || password.length > 72) {
      return sendError(response, 400, 'Password must be between 10 and 72 characters.');
    }
    try {
      const result = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .run(email, bcrypt.hashSync(password, 12), name);
      const user = { id: Number(result.lastInsertRowid), email, name };
      createSession(user.id, response);
      return response.status(201).json({ user });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return sendError(response, 409, 'An account with this email already exists.');
      }
      throw error;
    }
  });

  app.post('/api/auth/login', authLimiter, (request, response) => {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body.password;
    if (!email || typeof password !== 'string' || password.length > 72) {
      return sendError(response, 400, 'Enter your email address and password.');
    }
    const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return sendError(response, 401, 'Email or password is incorrect.');
    }
    createSession(user.id, response);
    return response.json({ user: publicUser(user) });
  });

  app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: request.user }));

  app.post('/api/auth/logout', authenticate, (request, response) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(request.sessionId);
    response.setHeader('Set-Cookie', clearSessionCookie(secureCookies));
    return response.status(204).end();
  });

  app.use('/api', authenticate);

  app.patch('/api/profile', (request, response) => {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    if (!name || name.length > 80) return sendError(response, 400, 'Name must be between 1 and 80 characters.');
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, request.user.id);
    return response.json({ user: { ...request.user, name } });
  });

  app.get('/api/expenses', (request, response) => {
    const expenses = db.prepare(`
      SELECT id, title, category, amount, date, note
      FROM expenses WHERE user_id = ?
      ORDER BY date DESC, id DESC
    `).all(request.user.id);
    return response.json({ expenses });
  });

  app.post('/api/expenses', (request, response) => {
    const expense = validateExpense(request.body);
    if (typeof expense === 'string') return sendError(response, 400, expense);
    const result = db.prepare(`
      INSERT INTO expenses (user_id, title, category, amount, date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(request.user.id, expense.title, expense.category, expense.amount, expense.date, expense.note);
    return response.status(201).json({ expense: { id: Number(result.lastInsertRowid), ...expense } });
  });

  app.post('/api/expenses/import', (request, response) => {
    const entries = request.body.expenses;
    if (!Array.isArray(entries) || entries.length > 500) {
      return sendError(response, 400, 'Provide no more than 500 expenses to import.');
    }
    if (db.prepare('SELECT 1 FROM expenses WHERE user_id = ? LIMIT 1').get(request.user.id)) {
      return sendError(response, 409, 'This account already has expenses; local data was not imported.');
    }
    const validated = entries.map(validateExpense);
    const invalid = validated.find((entry) => typeof entry === 'string');
    if (invalid) return sendError(response, 400, `Local expense data could not be imported: ${invalid}`);
    const insert = db.prepare(`
      INSERT INTO expenses (user_id, title, category, amount, date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const importAll = db.transaction((expenses) => {
      for (const expense of expenses) {
        insert.run(request.user.id, expense.title, expense.category, expense.amount, expense.date, expense.note);
      }
    });
    importAll(validated);
    return response.status(201).json({ imported: validated.length });
  });

  app.patch('/api/expenses/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, 'Invalid expense ID.');
    const expense = validateExpense(request.body);
    if (typeof expense === 'string') return sendError(response, 400, expense);
    const result = db.prepare(`
      UPDATE expenses SET title = ?, category = ?, amount = ?, date = ?, note = ?
      WHERE id = ? AND user_id = ?
    `).run(expense.title, expense.category, expense.amount, expense.date, expense.note, id, request.user.id);
    if (!result.changes) return sendError(response, 404, 'Expense not found.');
    return response.json({ expense: { id, ...expense } });
  });

  app.delete('/api/expenses/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, 'Invalid expense ID.');
    const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, request.user.id);
    if (!result.changes) return sendError(response, 404, 'Expense not found.');
    return response.status(204).end();
  });

  app.get('/api/reports/summary', (request, response) => {
    const months = Number(request.query.months ?? 6);
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      return sendError(response, 400, 'Months must be a whole number from 1 to 24.');
    }
    const now = new Date();
    const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startDate = `${monthKey(firstMonth)}-01`;
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', date) AS month, ROUND(SUM(amount), 2) AS total
      FROM expenses WHERE user_id = ? AND date >= ?
      GROUP BY strftime('%Y-%m', date) ORDER BY month
    `).all(request.user.id, startDate);
    const totalsByMonth = new Map(rows.map((row) => [row.month, row.total]));
    const monthly = Array.from({ length: months }, (_, index) => {
      const month = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      const key = monthKey(month);
      return { month: key, name: month.toLocaleDateString('en-US', { month: 'short' }), value: totalsByMonth.get(key) || 0 };
    });
    const currentMonth = monthKey(now);
    const categoriesForMonth = db.prepare(`
      SELECT category AS name, ROUND(SUM(amount), 2) AS value
      FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
      GROUP BY category ORDER BY value DESC
    `).all(request.user.id, currentMonth);
    const total = categoriesForMonth.reduce((sum, category) => sum + category.value, 0);
    const count = db.prepare(`
      SELECT COUNT(*) AS count FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `).get(request.user.id, currentMonth).count;
    return response.json({
      monthly,
      categories: categoriesForMonth,
      totals: { spent: total, count, average: count ? Math.round((total / count) * 100) / 100 : 0 },
    });
  });

  app.get('/api/reports/export.csv', (request, response) => {
    const rows = db.prepare(`
      SELECT title, category, date, amount, note FROM expenses
      WHERE user_id = ? ORDER BY date DESC, id DESC
    `).all(request.user.id);
    const escape = (value) => {
      let text = String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = [
      ['Expense', 'Category', 'Date', 'Amount (INR)', 'Note'].map(escape).join(','),
      ...rows.map((row) => [row.title, row.category, row.date, row.amount.toFixed(2), row.note].map(escape).join(',')),
    ].join('\r\n');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="bachat-guru-expenses.csv"');
    return response.send(`\uFEFF${csv}`);
  });

  app.get('/api/goals', (request, response) => {
    const goals = db.prepare(`
      SELECT id, title, target_amount AS targetAmount, current_amount AS currentAmount, target_date AS targetDate
      FROM goals WHERE user_id = ? ORDER BY id DESC
    `).all(request.user.id);
    return response.json({ goals });
  });

  app.post('/api/goals', (request, response) => {
    const goal = validateGoal(request.body);
    if (typeof goal === 'string') return sendError(response, 400, goal);
    const result = db.prepare(`
      INSERT INTO goals (user_id, title, target_amount, current_amount, target_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(request.user.id, goal.title, goal.targetAmount, goal.currentAmount, goal.targetDate);
    return response.status(201).json({ goal: { id: Number(result.lastInsertRowid), ...goal } });
  });

  app.patch('/api/goals/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, 'Invalid goal ID.');
    const goal = validateGoal(request.body);
    if (typeof goal === 'string') return sendError(response, 400, goal);
    const result = db.prepare(`
      UPDATE goals SET title = ?, target_amount = ?, current_amount = ?, target_date = ?
      WHERE id = ? AND user_id = ?
    `).run(goal.title, goal.targetAmount, goal.currentAmount, goal.targetDate, id, request.user.id);
    if (!result.changes) return sendError(response, 404, 'Goal not found.');
    return response.json({ goal: { id, ...goal } });
  });

  app.delete('/api/goals/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, 'Invalid goal ID.');
    const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, request.user.id);
    if (!result.changes) return sendError(response, 404, 'Goal not found.');
    return response.status(204).end();
  });

  app.use('/api', (request, response) => sendError(response, 404, 'API endpoint not found.'));

  if (serveFrontend) {
    const dist = path.join(projectRoot, 'dist');
    app.use(express.static(dist));
    app.get(/.*/, (request, response) => response.sendFile(path.join(dist, 'index.html')));
  }

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error.type === 'entity.too.large') {
      return sendError(response, 413, 'Request body is too large.');
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return sendError(response, 400, 'Request body must be valid JSON.');
    }
    console.error(error);
    return sendError(response, 500, 'Something went wrong. Please try again.');
  });

  return app;
}
