import db from '../../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf, num, slugify } from '../../../../lib/validate.js';
import { AREAS, PROJECT_STATUS } from '../../../../lib/options.js';

export const GET = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const rows = db.prepare(`
    SELECT p.*, u.name AS owner_name, u.email AS owner_email,
           (SELECT COUNT(*) FROM measurements m WHERE m.project_id = p.id) AS data_points
    FROM projects p LEFT JOIN users u ON u.id = p.owner_user_id
    ORDER BY p.created_at DESC
  `).all();
  return json(rows);
});

function uniqueSlug(base) {
  let slug = base, i = 2;
  while (db.prepare('SELECT id FROM projects WHERE slug = ?').get(slug)) slug = `${base}-${i++}`;
  return slug;
}

export const POST = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const b = await readBody(request);
  const name = str(b.name, { label: 'nome', max: 160 });
  const area = oneOf(b.area, AREAS, 'área');
  const data = {
    slug: uniqueSlug(slugify(b.slug || name)),
    name,
    description: str(b.description, { required: false, label: 'descrição', max: 2000 }),
    area,
    status: b.status ? oneOf(b.status, PROJECT_STATUS, 'status') : 'planning',
    zone: str(b.zone, { required: false, label: 'zona', max: 120 }),
    map_x: num(b.map_x, { required: false, label: 'map_x', min: 0, max: 100 }),
    map_y: num(b.map_y, { required: false, label: 'map_y', min: 0, max: 100 }),
    owner_user_id: b.owner_user_id ? num(b.owner_user_id, { label: 'dono' }) : null,
    proposal_id: b.proposal_id ? num(b.proposal_id, { label: 'proposta' }) : null,
    is_published: b.is_published ? 1 : 0,
  };
  if (data.owner_user_id) {
    const owner = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'participant'`).get(data.owner_user_id);
    if (!owner) throw httpError(400, 'Dono inválido (precisa ser um participante)');
  }
  const r = db.prepare(`
    INSERT INTO projects (slug, name, description, area, status, zone, map_x, map_y, owner_user_id, proposal_id, is_published)
    VALUES (@slug, @name, @description, @area, @status, @zone, @map_x, @map_y, @owner_user_id, @proposal_id, @is_published)
  `).run(data);
  return json({ id: r.lastInsertRowid, slug: data.slug, ok: true }, 201);
});
