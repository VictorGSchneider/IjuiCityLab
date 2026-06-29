import { all, one } from '../../../lib/db.js';
import { json, handler, httpError } from '../../../lib/http.js';
import { authenticateKey } from '../../../lib/apikey.js';

// GET /api/v1/measurements?project=slug&metric=&from=&to=&limit=&format=json|csv
// (header: X-API-Key com escopo de leitura). Apenas projetos publicados.
export const GET = handler(async ({ request, url }) => {
  await authenticateKey(request, 'read');
  const q = url.searchParams;
  const slug = q.get('project');
  if (!slug) throw httpError(400, "Parâmetro 'project' (slug) é obrigatório");

  const project = await one('SELECT id, name FROM projects WHERE slug = ? AND is_published = 1', [slug]);
  if (!project) throw httpError(404, `Projeto publicado '${slug}' não encontrado`);

  const where = ['project_id = @project_id'];
  const args = { project_id: project.id };
  if (q.get('metric')) { where.push('metric = @metric'); args.metric = q.get('metric'); }
  if (q.get('from'))   { where.push('recorded_at >= @from'); args.from = q.get('from'); }
  if (q.get('to'))     { where.push('recorded_at <= @to'); args.to = q.get('to'); }

  let limit = Number(q.get('limit')) || 1000;
  limit = Math.min(Math.max(limit, 1), 10000);

  const rows = await all(`
    SELECT metric, value, unit, recorded_at FROM measurements
    WHERE ${where.join(' AND ')} ORDER BY recorded_at DESC LIMIT ${limit}
  `, args);

  if (q.get('format') === 'csv') {
    const header = 'metric,value,unit,recorded_at';
    const esc = (v) => v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const body = rows.map((r) => [r.metric, r.value, r.unit, r.recorded_at].map(esc).join(',')).join('\n');
    return new Response(`${header}\n${body}\n`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}-measurements.csv"`,
      },
    });
  }

  return json({ project: slug, count: rows.length, measurements: rows });
});
