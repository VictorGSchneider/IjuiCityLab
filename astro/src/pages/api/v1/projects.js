import db from '../../../lib/db.js';
import { json, handler } from '../../../lib/http.js';
import { authenticateKey } from '../../../lib/apikey.js';

// GET /api/v1/projects  (header: X-API-Key com escopo de leitura)
// Catálogo aberto dos projetos publicados, com as métricas disponíveis.
export const GET = handler(async ({ request }) => {
  authenticateKey(request, 'read');
  const projects = db.prepare(`
    SELECT slug, name, description, area, status, zone, updated_at,
           (SELECT COUNT(*) FROM measurements m WHERE m.project_id = p.id) AS data_points
    FROM projects p WHERE p.is_published = 1 ORDER BY name
  `).all();

  const metricsStmt = db.prepare(`
    SELECT DISTINCT metric FROM measurements
    WHERE project_id = (SELECT id FROM projects WHERE slug = ?) ORDER BY metric
  `);
  for (const p of projects) {
    p.metrics = metricsStmt.all(p.slug).map((r) => r.metric);
  }
  return json({ count: projects.length, projects });
});
