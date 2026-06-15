import bcrypt from 'bcryptjs';
import db from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';
import { str, email } from '../../../lib/validate.js';

export const POST = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const b = await readBody(request);
  const name = str(b.name, { label: 'nome', max: 120 });
  const mail = email(b.email);
  const password = str(b.password, { label: 'senha', min: 8, max: 128 });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(mail)) {
    throw httpError(409, 'E-mail já cadastrado');
  }
  const r = db.prepare(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run(name, mail, bcrypt.hashSync(password, 10));
  return json({ id: r.lastInsertRowid, ok: true }, 201);
});
