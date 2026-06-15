import db from '../../../../lib/db.js';
import { json, handler } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';

// Projetos dos quais o participante é dono (criados/atribuídos pela administração).
export const GET = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const rows = db.prepare(`
    SELECT p.id, p.slug, p.name, p.area, p.status, p.is_published, p.updated_at,
           (SELECT COUNT(*) FROM measurements m WHERE m.project_id = p.id) AS data_points
    FROM projects p
    WHERE p.owner_user_id = ?
    ORDER BY p.updated_at DESC
  `).all(u.sub);
  return json(rows);
});
