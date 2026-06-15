import db from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const DELETE = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'participant'`).run(params.id);
  return json({ ok: true });
});
