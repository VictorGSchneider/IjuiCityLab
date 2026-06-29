import bcrypt from 'bcryptjs';
import { one } from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { str, email } from '../../../lib/validate.js';
import { buildSession } from '../../../lib/auth.js';

export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const mail = email(b.email);
  const password = str(b.password, { label: 'senha', min: 1, max: 256 });
  const user = await one('SELECT * FROM users WHERE email = ?', [mail]);
  if (!user || user.role !== 'participant' || !bcrypt.compareSync(password, user.password_hash)) {
    throw httpError(401, 'Credenciais inválidas');
  }
  return json(buildSession(user));
});
