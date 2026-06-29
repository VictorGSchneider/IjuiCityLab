import { one, run } from '../../../lib/db.js';
import { json, handler, readBody } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';
import { str } from '../../../lib/validate.js';

export const GET = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const user = await one(
    `SELECT id, name, email, role, company, cnpj, phone, created_at FROM users WHERE id = ?`
  , [u.sub]);
  if (!user) return json({ error: 'Usuário não encontrado' }, 404);
  return json(user);
});

export const PATCH = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const b = await readBody(request);
  const fields = {};
  if (b.name !== undefined)    fields.name    = str(b.name, { label: 'nome', max: 120 });
  if (b.company !== undefined) fields.company = str(b.company, { required: false, label: 'empresa', max: 160 });
  if (b.cnpj !== undefined)    fields.cnpj    = str(b.cnpj, { required: false, label: 'CNPJ', max: 32 });
  if (b.phone !== undefined)   fields.phone   = str(b.phone, { required: false, label: 'telefone', max: 40 });
  if (Object.keys(fields).length === 0) return json({ ok: true });
  const sets = Object.keys(fields).map((k) => `${k} = @${k}`).join(', ');
  await run(`UPDATE users SET ${sets} WHERE id = @id`, { ...fields, id: u.sub });
  return json({ ok: true });
});
