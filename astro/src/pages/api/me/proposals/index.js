import db from '../../../../lib/db.js';
import { json, handler, readBody } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, email, oneOf } from '../../../../lib/validate.js';
import { AREAS, PERFIS, ESTAGIOS } from '../../../../lib/options.js';

export const GET = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const rows = db.prepare(
    `SELECT id, proponente, area, estagio, objetivo, status, created_at, updated_at, admin_notes
     FROM proposals WHERE user_id = ? ORDER BY created_at DESC`
  ).all(u.sub);
  return json(rows);
});

export const POST = handler(async ({ request }) => {
  const u = requireUser(request, 'participant');
  const b = await readBody(request);
  const me = db.prepare('SELECT name, email, company, cnpj FROM users WHERE id = ?').get(u.sub);
  const data = {
    user_id:    u.sub,
    nome:       str(b.nome ?? me.name, { label: 'nome', max: 120 }),
    email:      email(b.email ?? me.email),
    proponente: str(b.proponente ?? me.company, { label: 'proponente', max: 160 }),
    cnpj:       str(b.cnpj ?? me.cnpj, { required: false, label: 'CNPJ', max: 32 }),
    perfil:     oneOf(b.perfil, PERFIS, 'perfil'),
    area:       oneOf(b.area, AREAS, 'área'),
    estagio:    oneOf(b.estagio, ESTAGIOS, 'estágio'),
    objetivo:   str(b.objetivo, { label: 'objetivo', max: 300 }),
    resumo:     str(b.resumo, { label: 'resumo', min: 20, max: 4000 }),
  };
  const r = db.prepare(
    `INSERT INTO proposals (user_id, nome, email, proponente, cnpj, perfil, area, estagio, objetivo, resumo)
     VALUES (@user_id, @nome, @email, @proponente, @cnpj, @perfil, @area, @estagio, @objetivo, @resumo)`
  ).run(data);
  return json({ id: r.lastInsertRowid, ok: true }, 201);
});
