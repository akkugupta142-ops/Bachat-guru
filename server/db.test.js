import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { createDatabase, createPostgresAdapter, toPostgresSql } from './db.js';

describe('SQLite schema migrations', () => {
  it('adds account preference columns to an existing database without changing users', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bachat-guru-db-'));
    const filename = path.join(directory, 'legacy.sqlite');
    const legacy = new Database(filename);
    legacy.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users (email, password_hash, name)
      VALUES ('existing@example.com', 'hash', 'Existing User');
    `);
    legacy.close();

    const db = createDatabase(filename);
    try {
      const user = db.get('SELECT email, name, monthly_income, theme FROM users WHERE id = 1');
      assert.deepEqual(user, {
        email: 'existing@example.com',
        name: 'Existing User',
        monthly_income: 0,
        theme: 'dark',
      });
      assert.equal(db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'category_budgets'").name, 'category_budgets');
    } finally {
      db.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('PostgreSQL database adapter', () => {
  it('converts parameter placeholders and monthly date aggregation to PostgreSQL syntax', () => {
    assert.equal(toPostgresSql(
      "SELECT strftime('%Y-%m', date) AS month FROM expenses WHERE user_id = ? AND date >= ?",
    ), "SELECT TO_CHAR(date, 'YYYY-MM') AS month FROM expenses WHERE user_id = $1 AND date >= $2");
  });

  it('runs parameterized reads, writes, inserts, and transactions through a pool', async () => {
    const calls = [];
    const pool = {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT')) return { rows: [{ id: 8 }], rowCount: 1 };
        if (sql.includes('RETURNING id')) return { rows: [{ id: 9 }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      },
      async connect() {
        return {
          query: async (sql, params = []) => {
            calls.push({ sql, params });
            return { rows: [], rowCount: 1 };
          },
          release() { calls.push({ sql: 'RELEASE', params: [] }); },
        };
      },
      async end() {},
    };
    const db = createPostgresAdapter(pool);

    assert.deepEqual(await db.get('SELECT id FROM users WHERE id = ?', 8), { id: 8 });
    assert.equal((await db.run('DELETE FROM users WHERE id = ?', 8)).changes, 1);
    assert.equal(await db.insert('INSERT INTO users (name) VALUES (?)', 'Demo'), 9);
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM sessions WHERE user_id = ?', 8);
    });

    assert.deepEqual(calls.map((call) => call.sql), [
      'SELECT id FROM users WHERE id = $1',
      'DELETE FROM users WHERE id = $1',
      'INSERT INTO users (name) VALUES ($1) RETURNING id',
      'BEGIN',
      'DELETE FROM sessions WHERE user_id = $1',
      'COMMIT',
      'RELEASE',
    ]);
    assert.deepEqual(calls[0].params, [8]);
    assert.deepEqual(calls[2].params, ['Demo']);
  });
});
