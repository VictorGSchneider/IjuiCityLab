import { run } from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const DELETE = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  await run(`DELETE FROM users WHERE id = ? AND role = 'participant'`, [params.id]);
  return json({ ok: true });
});
