import { one, run } from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

// Revoga (não apaga, para preservar o vínculo histórico com measurements).
export const DELETE = handler(async ({ request, params }) => {
  const u = requireUser(request, 'participant');
  const row = await one('SELECT id FROM api_keys WHERE id = ? AND user_id = ?', [params.id, u.sub]);
  if (!row) return json({ error: 'Chave não encontrada' }, 404);
  await run('UPDATE api_keys SET revoked = 1 WHERE id = ?', [params.id]);
  return json({ ok: true });
});
