import crypto from 'node:crypto';
import { one, run } from './db.js';
import { httpError } from './http.js';

// Formato da chave entregue ao usuário: impulsa_<prefix>_<secret>
// Guardamos apenas o hash SHA-256 do segredo + o prefixo (para lookup e exibição).

const PUBLIC_KEY_NAMESPACE = 'impulsa';
const LEGACY_KEY_NAMESPACE = 'icl';

export function generateKey() {
  const prefix = crypto.randomBytes(6).toString('hex'); // 12 chars
  const secret = crypto.randomBytes(24).toString('base64url'); // 32 chars
  const full = `${PUBLIC_KEY_NAMESPACE}_${prefix}_${secret}`;
  const hash = hashSecret(secret);
  return { prefix, secret, full, hash };
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function parseKey(raw) {
  if (typeof raw !== 'string') return null;
  const namespacePattern = `(?:${PUBLIC_KEY_NAMESPACE}|${LEGACY_KEY_NAMESPACE})`;
  const m = raw.match(new RegExp(`^${namespacePattern}_([0-9a-f]{12})_(.+)$`));
  if (!m) return null;
  return { prefix: m[1], secret: m[2] };
}

// Valida a chave recebida no header e confere o escopo exigido.
// `required` = 'read' | 'ingest'. Atualiza last_used_at.
export async function authenticateKey(request, required) {
  const raw = request.headers.get('x-api-key') || '';
  const parsed = parseKey(raw);
  if (!parsed) throw httpError(401, 'Chave de API ausente ou malformada (header X-API-Key)');

  const row = await one('SELECT * FROM api_keys WHERE prefix = ?', [parsed.prefix]);
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

  await run(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`, [row.id]);
  return row;
}
