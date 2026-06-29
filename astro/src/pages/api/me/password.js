import bcrypt from 'bcryptjs';
import { one, run } from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';
import { str } from '../../../lib/validate.js';

export const POST = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const b = await readBody(request);
  const current = str(b.current, { label: 'senha atual', min: 1, max: 256 });
  const next = str(b.next, { label: 'nova senha', min: 8, max: 128 });
  const row = await one('SELECT password_hash FROM users WHERE id = ?', [u.sub]);
  if (!row || !bcrypt.compareSync(current, row.password_hash)) {
    throw httpError(400, 'Senha atual incorreta');
  }
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(next, 10), u.sub]);
  return json({ ok: true });
});
