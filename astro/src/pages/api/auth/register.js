import bcrypt from 'bcryptjs';
import db from '../../../lib/db.js';
import { json, handler, readBody } from '../../../lib/http.js';
import { str, email } from '../../../lib/validate.js';
import { httpError } from '../../../lib/http.js';
import { buildSession } from '../../../lib/auth.js';

export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const name = str(b.name, { label: 'nome', max: 120 });
  const mail = email(b.email);
  const password = str(b.password, { label: 'senha', min: 8, max: 128 });
  const company = str(b.company, { required: false, label: 'empresa', max: 160 });
  const cnpj    = str(b.cnpj,    { required: false, label: 'CNPJ', max: 32 });
  const phone   = str(b.phone,   { required: false, label: 'telefone', max: 40 });

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(mail)) {
    throw httpError(409, 'E-mail já cadastrado');
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, company, cnpj, phone)
     VALUES (?, ?, ?, 'participant', ?, ?, ?)`
  ).run(name, mail, hash, company, cnpj, phone);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
  return json(buildSession(user), 201);
});
