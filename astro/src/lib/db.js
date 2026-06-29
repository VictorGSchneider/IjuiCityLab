import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { projectRoot } from './env.js';

const { Pool } = pg;
const hasPostgres = Boolean(process.env.DATABASE_URL);

let sqlite = null;
let pool = null;
let ready = null;

function sqliteFile() {
  const defaultDbFile = process.env.VERCEL
    ? path.join('/tmp', 'impulsa.sqlite')
    : path.join(projectRoot, 'data', 'icl.sqlite');

  return process.env.DB_FILE
    ? path.resolve(projectRoot, process.env.DB_FILE)
    : defaultDbFile;
}

function sqliteExec(sql) {
  sqlite.exec(sql);
}

function normalizeSql(sql, params) {
  let values = [];
  let text = sql
    .replace(/datetime\('now'\s*,\s*'-1 day'\)/g, "(CURRENT_TIMESTAMP - interval '1 day')")
    .replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP');

  if (params && !Array.isArray(params) && typeof params === 'object') {
    const seen = new Map();
    text = text.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, key) => {
      if (!seen.has(key)) {
        values.push(params[key]);
        seen.set(key, values.length);
      }
      return `$${seen.get(key)}`;
    });
  } else {
    values = Array.isArray(params) ? params : [];
    let i = 0;
    text = text.replace(/\?/g, () => `$${++i}`);
  }

  return { text, values };
}

async function initSqlite() {
  const dbFile = sqliteFile();

  if (process.env.VERCEL && dbFile.startsWith('/tmp')) {
    console.warn('[db] usando SQLite temporario em /tmp; configure DATABASE_URL para producao.');
  }

  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  sqlite = new DatabaseSync(dbFile);
  sqliteExec('PRAGMA journal_mode = WAL;');
  sqliteExec('PRAGMA foreign_keys = ON;');
  sqliteExec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('participant','admin')) DEFAULT 'participant',
      company       TEXT,
      cnpj          TEXT,
      phone         TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      company     TEXT,
      area        TEXT,
      message     TEXT,
      status      TEXT NOT NULL CHECK(status IN ('new','read','replied','archived')) DEFAULT 'new',
      admin_notes TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nome        TEXT NOT NULL,
      email       TEXT NOT NULL,
      proponente  TEXT NOT NULL,
      cnpj        TEXT,
      perfil      TEXT NOT NULL,
      area        TEXT NOT NULL,
      estagio     TEXT NOT NULL,
      objetivo    TEXT NOT NULL,
      resumo      TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('submitted','under_review','approved','rejected','archived')) DEFAULT 'submitted',
      admin_notes TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name           TEXT NOT NULL,
      description    TEXT,
      area           TEXT NOT NULL,
      status         TEXT NOT NULL CHECK(status IN ('planning','active','paused','completed','archived')) DEFAULT 'planning',
      zone           TEXT,
      map_x          REAL,
      map_y          REAL,
      owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      proposal_id    INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
      is_published   INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      prefix       TEXT NOT NULL UNIQUE,
      key_hash     TEXT NOT NULL,
      scope        TEXT NOT NULL CHECK(scope IN ('read','ingest','read_ingest')) DEFAULT 'read_ingest',
      revoked      INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      metric        TEXT NOT NULL,
      value         REAL NOT NULL,
      unit          TEXT,
      recorded_at   TEXT NOT NULL DEFAULT (datetime('now')),
      source_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash     TEXT NOT NULL UNIQUE,
      requested_role TEXT NOT NULL CHECK(requested_role IN ('participant','admin')),
      expires_at     TEXT NOT NULL,
      used_at        TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  sqliteIndexes();
}

async function initPostgres() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.POSTGRES_POOL_MAX || 3),
    ssl: process.env.POSTGRES_SSL === 'false' ? false : undefined,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('participant','admin')) DEFAULT 'participant',
      company       TEXT,
      cnpj          TEXT,
      phone         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      company     TEXT,
      area        TEXT,
      message     TEXT,
      status      TEXT NOT NULL CHECK(status IN ('new','read','replied','archived')) DEFAULT 'new',
      admin_notes TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nome        TEXT NOT NULL,
      email       TEXT NOT NULL,
      proponente  TEXT NOT NULL,
      cnpj        TEXT,
      perfil      TEXT NOT NULL,
      area        TEXT NOT NULL,
      estagio     TEXT NOT NULL,
      objetivo    TEXT NOT NULL,
      resumo      TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('submitted','under_review','approved','rejected','archived')) DEFAULT 'submitted',
      admin_notes TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id             INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      slug           TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      description    TEXT,
      area           TEXT NOT NULL,
      status         TEXT NOT NULL CHECK(status IN ('planning','active','paused','completed','archived')) DEFAULT 'planning',
      zone           TEXT,
      map_x          REAL,
      map_y          REAL,
      owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      proposal_id    INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
      is_published   INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      prefix       TEXT NOT NULL UNIQUE,
      key_hash     TEXT NOT NULL,
      scope        TEXT NOT NULL CHECK(scope IN ('read','ingest','read_ingest')) DEFAULT 'read_ingest',
      revoked      INTEGER NOT NULL DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      metric        TEXT NOT NULL,
      value         REAL NOT NULL,
      unit          TEXT,
      recorded_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id             INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash     TEXT NOT NULL UNIQUE,
      requested_role TEXT NOT NULL CHECK(requested_role IN ('participant','admin')),
      expires_at     TIMESTAMPTZ NOT NULL,
      used_at        TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await postgresIndexes();
}

function sqliteIndexes() {
  sqliteExec(`
    CREATE INDEX IF NOT EXISTS idx_proposals_user      ON proposals(user_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_status    ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_contacts_status     ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_projects_owner      ON projects(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_published  ON projects(is_published);
    CREATE INDEX IF NOT EXISTS idx_apikeys_user        ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_meas_project        ON measurements(project_id);
    CREATE INDEX IF NOT EXISTS idx_meas_metric         ON measurements(project_id, metric, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_reset_user          ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_hash          ON password_reset_tokens(token_hash);
  `);
}

async function postgresIndexes() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_proposals_user      ON proposals(user_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_status    ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_contacts_status     ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_projects_owner      ON projects(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_published  ON projects(is_published);
    CREATE INDEX IF NOT EXISTS idx_apikeys_user        ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_meas_project        ON measurements(project_id);
    CREATE INDEX IF NOT EXISTS idx_meas_metric         ON measurements(project_id, metric, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_reset_user          ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_hash          ON password_reset_tokens(token_hash);
  `);
}

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!email || !password) return;

  const existing = hasPostgres
    ? (await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])).rows[0]
    : sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return;

  const hash = bcrypt.hashSync(password, 10);
  if (hasPostgres) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      [name, email.toLowerCase(), hash]
    );
  } else {
    sqlite.prepare(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
    ).run(name, email.toLowerCase(), hash);
  }
  console.log(`[db] admin inicial criado: ${email.toLowerCase()}`);
}

async function init() {
  if (hasPostgres) {
    await initPostgres();
  } else {
    await initSqlite();
  }
  await bootstrapAdmin();
}

export async function ensureDb() {
  if (!ready) ready = init();
  return ready;
}

export async function all(sql, params = []) {
  await ensureDb();
  if (hasPostgres) {
    const { text, values } = normalizeSql(sql, params);
    const result = await pool.query(text, values);
    return result.rows;
  }
  const stmt = sqlite.prepare(sql);
  return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
}

export async function one(sql, params = []) {
  await ensureDb();
  if (hasPostgres) {
    const { text, values } = normalizeSql(sql, params);
    const result = await pool.query(text, values);
    return result.rows[0] || null;
  }
  const stmt = sqlite.prepare(sql);
  return Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
}

export async function run(sql, params = []) {
  await ensureDb();
  if (hasPostgres) {
    const { text, values } = normalizeSql(sql, params);
    const result = await pool.query(text, values);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows[0]?.id,
      row: result.rows[0] || null,
    };
  }
  const stmt = sqlite.prepare(sql);
  if (/\bRETURNING\b/i.test(sql)) {
    const row = Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
    return {
      changes: row ? 1 : 0,
      lastInsertRowid: row?.id,
      row: row || null,
    };
  }
  return Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
}

export async function exec(sql) {
  await ensureDb();
  if (hasPostgres) return pool.query(sql);
  return sqliteExec(sql);
}

export default { all, one, run, exec, ensureDb, isPostgres: hasPostgres };
