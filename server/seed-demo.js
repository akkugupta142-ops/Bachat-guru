import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { createDatabase } from './db.js';

const email = 'demo@bachatguru.local';
const name = 'Interviewer Demo';

function dateDaysAgo(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const demoExpenses = [
  { title: 'Monthly groceries', category: 'Food & dining', amount: 2480, daysAgo: 1, note: 'Weekly essentials and fresh produce' },
  { title: 'Metro card recharge', category: 'Transport', amount: 600, daysAgo: 0, note: 'Monthly commute' },
  { title: 'Coffee with a friend', category: 'Food & dining', amount: 340, daysAgo: 0, note: '' },
  { title: 'Electricity bill', category: 'Bills', amount: 1860, daysAgo: 4, note: 'Home utilities' },
  { title: 'Pharmacy', category: 'Health', amount: 520, daysAgo: 11, note: 'First-aid essentials' },
  { title: 'Dinner out', category: 'Food & dining', amount: 1250, daysAgo: 20, note: 'Weekend dinner' },
  { title: 'Internet plan', category: 'Bills', amount: 999, daysAgo: 35, note: 'Home broadband' },
  { title: 'Cab to the airport', category: 'Transport', amount: 780, daysAgo: 45, note: 'Work trip' },
  { title: 'Streaming subscription', category: 'Entertainment', amount: 299, daysAgo: 61, note: 'Monthly subscription' },
  { title: 'New running shoes', category: 'Shopping', amount: 3290, daysAgo: 75, note: 'Replacement trainers' },
  { title: 'Lunch near the office', category: 'Food & dining', amount: 420, daysAgo: 90, note: '' },
  { title: 'Water bill', category: 'Bills', amount: 640, daysAgo: 105, note: 'Home utilities' },
  { title: 'Train tickets', category: 'Transport', amount: 1450, daysAgo: 121, note: 'Family visit' },
  { title: 'Birthday gift', category: 'Shopping', amount: 1800, daysAgo: 135, note: 'A thoughtful surprise' },
  { title: 'Groceries', category: 'Food & dining', amount: 2140, daysAgo: 151, note: 'Monthly essentials' },
  { title: 'Movie night', category: 'Entertainment', amount: 720, daysAgo: 166, note: 'Tickets and snacks' },
  { title: 'Doctor appointment', category: 'Health', amount: 900, daysAgo: 178, note: 'Routine check-up' },
  { title: 'Weekend bus trip', category: 'Transport', amount: 540, daysAgo: 190, note: 'Day trip' },
];

const demoGoals = [
  { title: 'Emergency fund', target: 100000, current: 42000, targetDate: dateDaysAgo(-240) },
  { title: 'New laptop', target: 75000, current: 28500, targetDate: dateDaysAgo(-120) },
  { title: 'Weekend getaway', target: 30000, current: 18600, targetDate: dateDaysAgo(-75) },
];

const db = createDatabase();
try {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`Demo account ${email} already exists. No data was changed.`);
    console.log('To keep account data safe, this script does not reset or overwrite an existing demo account.');
    process.exitCode = 0;
  } else {
    const password = randomBytes(18).toString('base64url');
    const seed = db.transaction(() => {
      const user = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .run(email, bcrypt.hashSync(password, 12), name);
      const userId = Number(user.lastInsertRowid);
      const addExpense = db.prepare(`
        INSERT INTO expenses (user_id, title, category, amount, date, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const expense of demoExpenses) {
        addExpense.run(userId, expense.title, expense.category, expense.amount, dateDaysAgo(expense.daysAgo), expense.note);
      }
      const addGoal = db.prepare(`
        INSERT INTO goals (user_id, title, target_amount, current_amount, target_date)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const goal of demoGoals) {
        addGoal.run(userId, goal.title, goal.target, goal.current, goal.targetDate);
      }
      return userId;
    });
    const userId = seed();
    console.log('Created a local-only interviewer demo account and sample data.');
    console.log(`Email: ${email}`);
    console.log(`One-time password: ${password}`);
    console.log(`Added ${demoExpenses.length} expenses and ${demoGoals.length} savings goals for user ${userId}.`);
    console.log('Save this password now; it cannot be recovered from the database. Do not use this demo account in production.');
  }
} finally {
  db.close();
}
