import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sqliteAdapter(raw) {
  const db = {
    dialect: 'sqlite',
    prepare: raw.prepare.bind(raw),
    pragma: raw.pragma.bind(raw),
    exec: raw.exec.bind(raw),
    close: raw.close.bind(raw),
    get(sql, ...params) {
      return raw.prepare(sql).get(...params);
    },
    all(sql, ...params) {
      return raw.prepare(sql).all(...params);
    },
    run(sql, ...params) {
      return raw.prepare(sql).run(...params);
    },
    insert(sql, ...params) {
      return raw.prepare(`${sql} RETURNING id`).get(...params).id;
    },
    transaction(callback) {
      return raw.transaction(() => callback(db))();
    },
  };
  return db;
}

export function createDatabase(filename = process.env.DB_FILE || './data/bachat-guru.sqlite') {
  const databasePath = filename === ':memory:'
    ? filename
    : path.isAbsolute(filename) ? filename : path.resolve(projectRoot, filename);
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const raw = new Database(databasePath);
  const db = sqliteAdapter(raw);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses(user_id, date DESC, id DESC);
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK(target_amount > 0),
      current_amount REAL NOT NULL DEFAULT 0 CHECK(current_amount >= 0),
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id, id DESC);
  `);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  return db;
}

export function toPostgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`)
    .replace(/strftime\('%Y-%m',\s*date\)/g, "TO_CHAR(date, 'YYYY-MM')");
}

export function createPostgresAdapter(pool) {
  return {
    dialect: 'postgres',
    async get(sql, ...params) {
      const result = await pool.query(toPostgresSql(sql), params);
      return result.rows[0];
    },
    async all(sql, ...params) {
      const result = await pool.query(toPostgresSql(sql), params);
      return result.rows;
    },
    async run(sql, ...params) {
      const result = await pool.query(toPostgresSql(sql), params);
      return { changes: result.rowCount };
    },
    async insert(sql, ...params) {
      const result = await pool.query(`${toPostgresSql(sql)} RETURNING id`, params);
      return result.rows[0].id;
    },
    async transaction(callback) {
      const client = await pool.connect();
      const tx = {
        async run(sql, ...params) {
          const result = await client.query(toPostgresSql(sql), params);
          return { changes: result.rowCount };
        },
      };
      try {
        await client.query('BEGIN');
        const result = await callback(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close() {
      return pool.end();
    },
  };
}

export async function createPostgresDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL.');
  const { Pool, types } = pg;
  types.setTypeParser(20, (value) => Number(value));
  types.setTypeParser(1700, (value) => Number(value));
  types.setTypeParser(1082, (value) => value);
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  const db = createPostgresAdapter(pool);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS expenses (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK(amount > 0),
        date DATE NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses(user_id, date DESC, id DESC);
      CREATE TABLE IF NOT EXISTS goals (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target_amount NUMERIC(12, 2) NOT NULL CHECK(target_amount > 0),
        current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK(current_amount >= 0),
        target_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id, id DESC);
      DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP
    `);
  } catch (error) {
    await pool.end();
    throw error;
  }
  return db;
}
