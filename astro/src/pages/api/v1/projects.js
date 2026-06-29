import { all } from '../../../lib/db.js';
import { json, handler } from '../../../lib/http.js';
import { authenticateKey } from '../../../lib/apikey.js';

// GET /api/v1/projects  (header: X-API-Key com escopo de leitura)
// Catálogo aberto dos projetos publicados, com as métricas disponíveis.
export const GET = handler(async ({ request }) => {
  await authenticateKey(request, 'read');
  const projects = await all(`
    SELECT slug, name, description, area, status, zone, updated_at,
           (SELECT COUNT(*) FROM measurements m WHERE m.project_id = p.id) AS data_points
    FROM projects p WHERE p.is_published = 1 ORDER BY name
  `);

  for (const p of projects) {
    const metrics = await all(`
      SELECT DISTINCT metric FROM measurements
      WHERE project_id = (SELECT id FROM projects WHERE slug = ?) ORDER BY metric
    `, [p.slug]);
    p.metrics = metrics.map((r) => r.metric);
  }
  return json({ count: projects.length, projects });
});
