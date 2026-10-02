import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

describe('Bachat Guru API', () => {
  let app;
  let db;
  let owner;

  beforeEach(async () => {
    db = createDatabase(':memory:');
    app = createApp({ db, secureCookies: false, serveFrontend: false });
    owner = request.agent(app);
  });

  afterEach(() => db.close());

  async function register(agent = owner, email = 'akshat@example.com') {
    return agent.post('/api/auth/register').send({
      name: 'Akshat Kumar',
      email,
      password: 'correct horse battery staple',
    });
  }

  async function createExpense(agent = owner, fields = {}) {
    const now = new Date();
    return agent.post('/api/expenses').send({
      title: 'Grocery run',
      category: 'Food & dining',
      amount: 86.4,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      note: 'Weekly essentials',
      ...fields,
    });
  }

  it('creates accounts with bcrypt hashes and an HttpOnly session; rejects bad credentials', async () => {
    const created = await register();
    assert.equal(created.status, 201);
    assert.equal(created.body.user.email, 'akshat@example.com');
    assert.match(created.headers['set-cookie'][0], /HttpOnly/);
    assert.match(created.headers['set-cookie'][0], /SameSite=Strict/);
    const storedUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(created.body.user.id);
    assert.match(storedUser.password_hash, /^\$2[aby]\$12\$/);
    assert.notEqual(storedUser.password_hash, 'correct horse battery staple');
    const session = db.prepare('SELECT token_hash FROM sessions WHERE user_id = ?').get(created.body.user.id);
    assert.notEqual(session.token_hash, created.headers['set-cookie'][0].match(/bg_session=([^;]+)/)[1]);

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'akshat@example.com', password: 'incorrect password',
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal((await register()).status, 409);
  });

  it('requires authentication, validates expense input, and scopes expense CRUD to its owner', async () => {
    const unauthenticated = await request(app).get('/api/expenses');
    assert.equal(unauthenticated.status, 401);
    await register();
    const other = request.agent(app);
    await register(other, 'other@example.com');

    assert.equal((await createExpense(owner)).status, 201);
    const invalid = await createExpense(owner, { amount: -10 });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /Amount/);
    assert.equal((await createExpense(owner, { category: 'Unknown' })).status, 400);
    assert.equal((await owner.post('/api/expenses').send(null)).status, 400);
    assert.equal((await owner.post('/api/expenses').set('Origin', 'https://attacker.example').send({})).status, 403);

    const created = (await owner.get('/api/expenses')).body.expenses;
    assert.equal(created.length, 1);
    const id = created[0].id;
    assert.equal((await other.get('/api/expenses')).body.expenses.length, 0);
    assert.equal((await other.patch(`/api/expenses/${id}`).send(created[0])).status, 404);
    assert.equal((await owner.patch(`/api/expenses/${id}`).send({ ...created[0], title: 'Updated grocery run' })).status, 200);
    assert.equal((await owner.delete(`/api/expenses/${id}`)).status, 204);
    assert.equal((await owner.delete(`/api/expenses/${id}`)).status, 404);
  });

  it('aggregates report data and exports only the signed-in user’s CSV safely', async () => {
    await register();
    await createExpense(owner);
    await createExpense(owner, { title: '=SUM(1,1)', amount: 13.6 });
    const report = await owner.get('/api/reports/summary?months=6');
    assert.equal(report.status, 200);
    assert.equal(report.body.monthly.length, 6);
    assert.equal(report.body.totals.spent, 100);
    assert.equal(report.body.totals.count, 2);
    assert.equal(report.body.categories[0].name, 'Food & dining');
    assert.equal((await owner.get('/api/reports/summary?months=0')).status, 400);

    const csv = await owner.get('/api/reports/export.csv');
    assert.equal(csv.status, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /'=?SUM/);
    assert.match(csv.text, /"Weekly essentials"/);
  });

  it('supports user-scoped saving goals and bounded contributions', async () => {
    await register();
    const created = await owner.post('/api/goals').send({
      title: 'Emergency fund', targetAmount: 1000, currentAmount: 100, targetDate: null,
    });
    assert.equal(created.status, 201);
    const goal = created.body.goal;
    assert.equal(goal.currentAmount, 100);

    const other = request.agent(app);
    await register(other, 'other@example.com');
    assert.equal((await other.get('/api/goals')).body.goals.length, 0);
    assert.equal((await owner.patch(`/api/goals/${goal.id}`).send({
      ...goal, currentAmount: 300,
    })).body.goal.currentAmount, 300);
    assert.equal((await owner.patch(`/api/goals/${goal.id}`).send({
      ...goal, currentAmount: 1200,
    })).status, 400);
    assert.equal((await other.delete(`/api/goals/${goal.id}`)).status, 404);
    assert.equal((await owner.delete(`/api/goals/${goal.id}`)).status, 204);
  });

  it('updates profile, imports browser data only into an empty account, and revokes logout sessions', async () => {
    await register();
    const imported = await owner.post('/api/expenses/import').send({
      expenses: [{
        title: 'Older purchase', category: 'Other', amount: 10, date: '2026-09-01', note: '',
      }],
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.imported, 1);
    assert.equal((await owner.post('/api/expenses/import').send({ expenses: [] })).status, 409);
    assert.equal((await owner.patch('/api/profile').send({ name: 'Akshat G.' })).body.user.name, 'Akshat G.');
    assert.equal((await owner.get('/api/auth/me')).body.user.name, 'Akshat G.');
    assert.equal((await owner.post('/api/auth/logout')).status, 204);
    assert.equal((await owner.get('/api/auth/me')).status, 401);
  });
});
