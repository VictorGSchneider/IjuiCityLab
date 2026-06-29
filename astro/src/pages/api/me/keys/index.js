import { all, run } from '../../../../lib/db.js';
import { json, handler, readBody } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf } from '../../../../lib/validate.js';
import { KEY_SCOPES } from '../../../../lib/options.js';
import { generateKey } from '../../../../lib/apikey.js';

export const GET = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const rows = await all(`
    SELECT id, name, prefix, scope, revoked, last_used_at, created_at
    FROM api_keys WHERE user_id = ? ORDER BY created_at DESC
  `, [u.sub]);
  return json(rows);
});

// Cria uma chave e devolve o segredo completo UMA ÚNICA VEZ.
export const POST = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const b = await readBody(request);
  const name = str(b.name, { label: 'nome da chave', max: 80 });
  const scope = b.scope ? oneOf(b.scope, KEY_SCOPES, 'escopo') : 'read_ingest';
  const { prefix, full, hash } = generateKey();
  const r = await run(
    `INSERT INTO api_keys (user_id, name, prefix, key_hash, scope) VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [u.sub, name, prefix, hash, scope]
  );
  return json({ id: r.lastInsertRowid, name, prefix, scope, key: full }, 201);
});
