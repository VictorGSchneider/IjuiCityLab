import { all } from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

export const GET = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const rows = await all(`
    SELECT u.id, u.name, u.email, u.company, u.cnpj, u.phone, u.created_at,
           (SELECT COUNT(*) FROM proposals p WHERE p.user_id = u.id) AS proposal_count,
           (SELECT COUNT(*) FROM projects pr WHERE pr.owner_user_id = u.id) AS project_count
    FROM users u WHERE u.role = 'participant' ORDER BY u.created_at DESC
  `);
  return json(rows);
});
