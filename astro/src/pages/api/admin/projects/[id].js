import { one, run } from '../../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf, num } from '../../../../lib/validate.js';
import { AREAS, PROJECT_STATUS } from '../../../../lib/options.js';

export const GET = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  const row = await one(`
    SELECT p.*, u.name AS owner_name, u.email AS owner_email
    FROM projects p LEFT JOIN users u ON u.id = p.owner_user_id WHERE p.id = ?
  `, [params.id]);
  if (!row) return json({ error: 'Projeto não encontrado' }, 404);
  return json(row);
});

export const PATCH = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  const row = await one('SELECT id FROM projects WHERE id = ?', [params.id]);
  if (!row) return json({ error: 'Projeto não encontrado' }, 404);
  const b = await readBody(request);
  const updates = {};
  if (b.name !== undefined)        updates.name = str(b.name, { label: 'nome', max: 160 });
  if (b.description !== undefined) updates.description = str(b.description, { required: false, label: 'descrição', max: 2000 });
  if (b.area !== undefined)        updates.area = oneOf(b.area, AREAS, 'área');
  if (b.status !== undefined)      updates.status = oneOf(b.status, PROJECT_STATUS, 'status');
  if (b.zone !== undefined)        updates.zone = str(b.zone, { required: false, label: 'zona', max: 120 });
  if (b.map_x !== undefined)       updates.map_x = num(b.map_x, { required: false, label: 'map_x', min: 0, max: 100 });
  if (b.map_y !== undefined)       updates.map_y = num(b.map_y, { required: false, label: 'map_y', min: 0, max: 100 });
  if (b.is_published !== undefined) updates.is_published = b.is_published ? 1 : 0;
  if (b.owner_user_id !== undefined) {
    if (b.owner_user_id === null || b.owner_user_id === '') {
      updates.owner_user_id = null;
    } else {
      const id = num(b.owner_user_id, { label: 'dono' });
      const owner = await one(`SELECT id FROM users WHERE id = ? AND role = 'participant'`, [id]);
      if (!owner) throw httpError(400, 'Dono inválido (precisa ser um participante)');
      updates.owner_user_id = id;
    }
  }
  if (!Object.keys(updates).length) return json({ ok: true });
  const sets = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  await run(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = @id`, { ...updates, id: row.id });
  return json({ ok: true });
});

export const DELETE = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  await run('DELETE FROM projects WHERE id = ?', [params.id]);
  return json({ ok: true });
});
