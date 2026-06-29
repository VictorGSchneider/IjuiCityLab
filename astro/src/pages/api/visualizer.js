import { all, one } from '../../lib/db.js';
import { json, handler } from '../../lib/http.js';
import { PROJECT_STATUS, AREAS, AREA_LABEL } from '../../lib/options.js';

// Dados públicos agregados que alimentam o painel ao vivo da home.
// É o próprio site mostrando o próprio estado — não exige chave de API
// (o acesso programático de terceiros é o /api/v1/*, esse sim com chave).
export const GET = handler(async () => {
  const projects = await all(`
    SELECT p.id, p.slug, p.name, p.description, p.area, p.status, p.zone, p.map_x, p.map_y,
           p.updated_at,
           (SELECT COUNT(*) FROM measurements m WHERE m.project_id = p.id) AS data_points
    FROM projects p
    WHERE p.is_published = 1
    ORDER BY p.updated_at DESC
  `);

  const byStatus = Object.fromEntries(PROJECT_STATUS.map((s) => [s, 0]));
  const byArea = Object.fromEntries(AREAS.map((a) => [a, 0]));
  for (const p of projects) {
    if (byStatus[p.status] !== undefined) byStatus[p.status]++;
    if (byArea[p.area] !== undefined) byArea[p.area]++;
  }

  const totalDataPoints = (await one(`
    SELECT COUNT(*) AS n FROM measurements m
    JOIN projects p ON p.id = m.project_id WHERE p.is_published = 1
  `)).n;

  return json({
    generatedAt: new Date().toISOString(),
    totals: {
      projects: projects.length,
      active: byStatus.active || 0,
      dataPoints: totalDataPoints,
    },
    byStatus,
    byArea,
    areaLabels: AREA_LABEL,
    projects,
  }, 200, { 'Cache-Control': 'no-store' });
});
