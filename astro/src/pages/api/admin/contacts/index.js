import db from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const GET = handler(async ({ request, url }) => {
  requireUser(request, 'admin');
  const status = url.searchParams.get('status');
  const rows = status
    ? db.prepare(`SELECT * FROM contacts WHERE status = ? ORDER BY created_at DESC`).all(status)
    : db.prepare(`SELECT * FROM contacts ORDER BY created_at DESC`).all();
  return json(rows);
});
