import crypto from 'node:crypto';
import db from './db.js';
import { httpError } from './http.js';

// Formato da chave entregue ao usuário: icl_<prefix>_<secret>
// Guardamos apenas o hash SHA-256 do segredo + o prefixo (para lookup e exibição).

export function generateKey() {
  const prefix = crypto.randomBytes(6).toString('hex'); // 12 chars
  const secret = crypto.randomBytes(24).toString('base64url'); // 32 chars
  const full = `icl_${prefix}_${secret}`;
  const hash = hashSecret(secret);
  return { prefix, secret, full, hash };
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function parseKey(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^icl_([0-9a-f]{12})_(.+)$/);
  if (!m) return null;
  return { prefix: m[1], secret: m[2] };
}

// Valida a chave recebida no header e confere o escopo exigido.
// `required` = 'read' | 'ingest'. Atualiza last_used_at.
export function authenticateKey(request, required) {
  const raw = request.headers.get('x-api-key') || '';
  const parsed = parseKey(raw);
  if (!parsed) throw httpError(401, 'Chave de API ausente ou malformada (header X-API-Key)');

  const row = db.prepare('SELECT * FROM api_keys WHERE prefix = ?').get(parsed.prefix);
  if (!row || row.revoked) throw httpError(401, 'Chave de API inválida ou revogada');

  const ok = crypto.timingSafeEqual(
    Buffer.from(hashSecret(parsed.secret)),
    Buffer.from(row.key_hash)
  );
  if (!ok) throw httpError(401, 'Chave de API inválida');

  const scopeOk =
    row.scope === 'read_ingest' ||
    (required === 'read' && row.scope === 'read') ||
    (required === 'ingest' && row.scope === 'ingest');
  if (!scopeOk) throw httpError(403, `Esta chave não tem permissão de '${required}'`);

  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  return row;
}
