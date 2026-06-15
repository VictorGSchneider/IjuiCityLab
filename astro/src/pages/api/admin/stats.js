import db from '../../../lib/db.js';
import { json, handler } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';

export const GET = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const proposals = db.prepare(`SELECT status, COUNT(*) AS n FROM proposals GROUP BY status`).all();
  const contacts  = db.prepare(`SELECT status, COUNT(*) AS n FROM contacts GROUP BY status`).all();
  const projects  = db.prepare(`SELECT status, COUNT(*) AS n FROM projects GROUP BY status`).all();
  const participants = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'participant'`).get().n;
  const dataPoints = db.prepare(`SELECT COUNT(*) AS n FROM measurements`).get().n;
  const apiKeys = db.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 0`).get().n;

  return json({
    participants,
    dataPoints,
    apiKeys,
    proposals: Object.fromEntries(proposals.map((r) => [r.status, r.n])),
    contacts:  Object.fromEntries(contacts.map((r) => [r.status, r.n])),
    projects:  Object.fromEntries(projects.map((r) => [r.status, r.n])),
    totalProposals: proposals.reduce((a, r) => a + r.n, 0),
    totalContacts:  contacts.reduce((a, r) => a + r.n, 0),
    totalProjects:  projects.reduce((a, r) => a + r.n, 0),
  });
});
