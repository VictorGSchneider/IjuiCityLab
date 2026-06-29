import { all } from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const GET = handler(async ({ request, url }) => {
  requireUser(request, 'admin');
  const status = url.searchParams.get('status');
  const rows = status
    ? await all(`SELECT * FROM contacts WHERE status = ? ORDER BY created_at DESC`, [status])
    : await all(`SELECT * FROM contacts ORDER BY created_at DESC`);
  return json(rows);
});
