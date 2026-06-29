import { all } from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const GET = handler(async ({ request, url }) => {
  requireUser(request, 'admin');
  const status = url.searchParams.get('status');
  const base = `SELECT p.*, u.email AS user_email FROM proposals p LEFT JOIN users u ON u.id = p.user_id`;
  const rows = status
    ? await all(`${base} WHERE p.status = ? ORDER BY p.created_at DESC`, [status])
    : await all(`${base} ORDER BY p.created_at DESC`);
  return json(rows);
});
