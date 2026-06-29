import { one, run } from '../../../../lib/db.js';
import { json, handler, readBody } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf } from '../../../../lib/validate.js';
import { CONTACT_STATUS } from '../../../../lib/options.js';

export const PATCH = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  const row = await one('SELECT id FROM contacts WHERE id = ?', [params.id]);
  if (!row) return json({ error: 'Contato não encontrado' }, 404);
  const b = await readBody(request);
  const updates = {};
  if (b.status !== undefined) updates.status = oneOf(b.status, CONTACT_STATUS, 'status');
  if (b.admin_notes !== undefined) updates.admin_notes = str(b.admin_notes, { required: false, label: 'observações', max: 4000 });
  if (!Object.keys(updates).length) return json({ ok: true });
  const sets = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  await run(`UPDATE contacts SET ${sets}, updated_at = datetime('now') WHERE id = @id`, { ...updates, id: row.id });
  return json({ ok: true });
});

export const DELETE = handler(async ({ request, params }) => {
  requireUser(request, 'admin');
  await run('DELETE FROM contacts WHERE id = ?', [params.id]);
  return json({ ok: true });
});
