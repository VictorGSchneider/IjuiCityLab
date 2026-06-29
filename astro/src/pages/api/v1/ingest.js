import { one, run } from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { authenticateKey } from '../../../lib/apikey.js';
import { str, num } from '../../../lib/validate.js';

// POST /api/v1/ingest  (header: X-API-Key com escopo de envio)
// Corpo: { project: "slug", metric, value, unit?, recorded_at? }
//   ou:  { project: "slug", measurements: [ { metric, value, unit?, recorded_at? }, ... ] }
export const POST = handler(async ({ request }) => {
  const key = await authenticateKey(request, 'ingest');
  const b = await readBody(request);

  const slug = str(b.project, { label: 'project', max: 60 });
  const project = await one('SELECT id, owner_user_id FROM projects WHERE slug = ?', [slug]);
  if (!project) throw httpError(404, `Projeto '${slug}' nao encontrado`);
  if (project.owner_user_id !== key.user_id) {
    throw httpError(403, 'Esta chave nao pertence ao dono do projeto');
  }

  const items = Array.isArray(b.measurements)
    ? b.measurements
    : [{ metric: b.metric, value: b.value, unit: b.unit, recorded_at: b.recorded_at }];
  if (!items.length) throw httpError(400, 'Nenhuma medicao informada');
  if (items.length > 1000) throw httpError(400, 'Maximo de 1000 medicoes por requisicao');

  let inserted = 0;
  for (const it of items) {
    const metric = str(it.metric, { label: 'metric', max: 80 });
    const value = num(it.value, { label: 'value' });
    const unit = str(it.unit, { required: false, label: 'unit', max: 24 });
    const recordedAt = it.recorded_at ? str(it.recorded_at, { label: 'recorded_at', max: 40 }) : null;
    await run(`
      INSERT INTO measurements (project_id, metric, value, unit, recorded_at, source_key_id)
      VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), ?)
    `, [project.id, metric, value, unit, recordedAt, key.id]);
    inserted++;
  }

  return json({ ok: true, project: slug, inserted }, 201);
});
