import { run } from '../../lib/db.js';
import { json, handler, readBody } from '../../lib/http.js';
import { str, email, oneOf } from '../../lib/validate.js';
import { AREAS, PERFIS, ESTAGIOS } from '../../lib/options.js';

// Submissão pública/anônima (a partir do formulário "Participar" da home).
export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const data = {
    nome:       str(b.nome, { label: 'nome', max: 120 }),
    email:      email(b.email),
    proponente: str(b.proponente, { label: 'proponente', max: 160 }),
    cnpj:       str(b.cnpj, { required: false, label: 'CNPJ', max: 32 }),
    perfil:     oneOf(b.perfil, PERFIS, 'perfil'),
    area:       oneOf(b.area, AREAS, 'área'),
    estagio:    oneOf(b.estagio, ESTAGIOS, 'estágio'),
    objetivo:   str(b.objetivo, { label: 'objetivo', max: 300 }),
    resumo:     str(b.resumo, { label: 'resumo', min: 20, max: 4000 }),
  };
  const r = await run(
    `INSERT INTO proposals (nome, email, proponente, cnpj, perfil, area, estagio, objetivo, resumo)
     VALUES (@nome, @email, @proponente, @cnpj, @perfil, @area, @estagio, @objetivo, @resumo)
     RETURNING id`,
    data
  );
  return json({ id: r.lastInsertRowid, ok: true }, 201);
});
