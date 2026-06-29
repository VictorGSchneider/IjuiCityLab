import { run } from '../../lib/db.js';
import { json, handler, readBody } from '../../lib/http.js';
import { str, email, oneOf } from '../../lib/validate.js';
import { AREAS } from '../../lib/options.js';

export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const data = {
    name: str(b.name, { label: 'nome', max: 120 }),
    email: email(b.email),
    company: str(b.company, { required: false, label: 'empresa', max: 120 }),
    area: b.area ? oneOf(b.area, AREAS, 'área') : null,
    message: str(b.message, { required: false, label: 'mensagem', max: 4000 }),
  };
  const r = await run(
    `INSERT INTO contacts (name, email, company, area, message) VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [data.name, data.email, data.company, data.area, data.message]
  );
  return json({ id: r.lastInsertRowid, ok: true }, 201);
});
