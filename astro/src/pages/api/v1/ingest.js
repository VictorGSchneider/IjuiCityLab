import db from '../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { authenticateKey } from '../../../lib/apikey.js';
import { str, num } from '../../../lib/validate.js';

// POST /api/v1/ingest  (header: X-API-Key com escopo de envio)
// Corpo: { project: "slug", metric, value, unit?, recorded_at? }
//   ou:  { project: "slug", measurements: [ { metric, value, unit?, recorded_at? }, ... ] }
export const POST = handler(async ({ request }) => {
  const key = authenticateKey(request, 'ingest');
  const b = await readBody(request);

  const slug = str(b.project, { label: 'project', max: 60 });
  const project = db.prepare('SELECT id, owner_user_id FROM projects WHERE slug = ?').get(slug);
  if (!project) throw httpError(404, `Projeto '${slug}' não encontrado`);
  if (project.owner_user_id !== key.user_id) {
    throw httpError(403, 'Esta chave não pertence ao dono do projeto');
  }

  const items = Array.isArray(b.measurements)
    ? b.measurements
    : [{ metric: b.metric, value: b.value, unit: b.unit, recorded_at: b.recorded_at }];
  if (!items.length) throw httpError(400, 'Nenhuma medição informada');
  if (items.length > 1000) throw httpError(400, 'Máximo de 1000 medições por requisição');

  const insert = db.prepare(`
    INSERT INTO measurements (project_id, metric, value, unit, recorded_at, source_key_id)
    VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), ?)
  `);
  // node:sqlite ainda não expõe a helper db.transaction() do better-sqlite3.
  // Fazemos BEGIN/COMMIT explícitos para que toda a lote seja atômica.
  db.exec('BEGIN');
  let inserted = 0;
  try {
    for (const it of items) {
      const metric = str(it.metric, { label: 'metric', max: 80 });
      const value = num(it.value, { label: 'value' });
      const unit = str(it.unit, { required: false, label: 'unit', max: 24 });
      const recordedAt = it.recorded_at ? str(it.recorded_at, { label: 'recorded_at', max: 40 }) : null;
      insert.run(project.id, metric, value, unit, recordedAt, key.id);
      inserted++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return json({ ok: true, project: slug, inserted }, 201);
});
