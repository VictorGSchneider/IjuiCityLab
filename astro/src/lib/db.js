import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dbFile = process.env.DB_FILE
  ? path.resolve(projectRoot, process.env.DB_FILE)
  : path.join(projectRoot, 'data', 'icl.sqlite');

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

// Conexão única reaproveitada entre requisições (módulo singleton).
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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

  -- Projetos do sandbox (curados pela administração; podem nascer de uma proposta aprovada)
  CREATE TABLE IF NOT EXISTS projects (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name         TEXT NOT NULL,
    description  TEXT,
    area         TEXT NOT NULL,
    status       TEXT NOT NULL CHECK(status IN ('planning','active','paused','completed','archived')) DEFAULT 'planning',
    zone         TEXT,
    map_x        REAL,                 -- 0..100 (posição esquemática no mapa)
    map_y        REAL,                 -- 0..100
    owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    proposal_id  INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
    is_published INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Chaves de API: cada participante gera as suas. Guardamos só o hash.
  CREATE TABLE IF NOT EXISTS api_keys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    prefix      TEXT NOT NULL UNIQUE,
    key_hash    TEXT NOT NULL,
    scope       TEXT NOT NULL CHECK(scope IN ('read','ingest','read_ingest')) DEFAULT 'read_ingest',
    revoked     INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Séries de dados enviadas pelos participantes (telemetria / open data)
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

  CREATE INDEX IF NOT EXISTS idx_proposals_user   ON proposals(user_id);
  CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
  CREATE INDEX IF NOT EXISTS idx_contacts_status  ON contacts(status);
  CREATE INDEX IF NOT EXISTS idx_projects_owner    ON projects(owner_user_id);
  CREATE INDEX IF NOT EXISTS idx_projects_published ON projects(is_published);
  CREATE INDEX IF NOT EXISTS idx_apikeys_user      ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_meas_project      ON measurements(project_id);
  CREATE INDEX IF NOT EXISTS idx_meas_metric       ON measurements(project_id, metric, recorded_at);
`);

// Administrador inicial a partir das variáveis de ambiente (só na primeira vez).
(function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!email || !password) return;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
    .run(name, email, hash);
  console.log(`[db] admin inicial criado: ${email}`);
})();

export default db;
