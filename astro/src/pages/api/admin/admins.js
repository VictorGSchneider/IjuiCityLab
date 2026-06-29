import bcrypt from 'bcryptjs';
import { one, run } from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';
import { str, email } from '../../../lib/validate.js';

export const POST = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const b = await readBody(request);
  const name = str(b.name, { label: 'nome', max: 120 });
  const mail = email(b.email);
  const password = str(b.password, { label: 'senha', min: 8, max: 128 });
  if (await one('SELECT id FROM users WHERE email = ?', [mail])) {
    throw httpError(409, 'E-mail já cadastrado');
  }
  const r = await run(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin') RETURNING id`,
    [name, mail, bcrypt.hashSync(password, 10)]
  );
  return json({ id: r.lastInsertRowid, ok: true }, 201);
});
