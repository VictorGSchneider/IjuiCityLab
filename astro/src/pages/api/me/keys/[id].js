import db from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

// Revoga (não apaga, para preservar o vínculo histórico com measurements).
export const DELETE = handler(async ({ request, params }) => {
  const u = requireUser(request, 'participant');
  const row = db.prepare('SELECT id FROM api_keys WHERE id = ? AND user_id = ?').get(params.id, u.sub);
  if (!row) return json({ error: 'Chave não encontrada' }, 404);
  db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(params.id);
  return json({ ok: true });
});
