import { one, run } from '../../../../lib/db.js';
import { json, handler, readBody } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf } from '../../../../lib/validate.js';
import { PROPOSAL_STATUS } from '../../../../lib/options.js';

export const GET = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  const row = await one(
    `SELECT p.*, u.email AS user_email, u.name AS user_name
     FROM proposals p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`
  , [params.id]);
  if (!row) return json({ error: 'Proposta não encontrada' }, 404);
  return json(row);
});

export const PATCH = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  const row = await one('SELECT id FROM proposals WHERE id = ?', [params.id]);
  if (!row) return json({ error: 'Proposta não encontrada' }, 404);
  const b = await readBody(request);
  const updates = {};
  if (b.status !== undefined) updates.status = oneOf(b.status, PROPOSAL_STATUS, 'status');
  if (b.admin_notes !== undefined) updates.admin_notes = str(b.admin_notes, { required: false, label: 'observações', max: 4000 });
  if (!Object.keys(updates).length) return json({ ok: true });
  const sets = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  await run(`UPDATE proposals SET ${sets}, updated_at = datetime('now') WHERE id = @id`, { ...updates, id: row.id });
  return json({ ok: true });
});

export const DELETE = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  await run('DELETE FROM proposals WHERE id = ?', [params.id]);
  return json({ ok: true });
});
