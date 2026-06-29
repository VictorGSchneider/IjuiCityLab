import { all, one } from '../../../lib/db.js';
import { json, handler } from '../../../lib/http.js';
import { requireUser } from '../../../lib/auth.js';

export const GET = handler(async ({ request }) => {
  requireUser(request, 'admin');
  const proposals = await all(`SELECT status, COUNT(*) AS n FROM proposals GROUP BY status`);
  const contacts  = await all(`SELECT status, COUNT(*) AS n FROM contacts GROUP BY status`);
  const projects  = await all(`SELECT status, COUNT(*) AS n FROM projects GROUP BY status`);
  const participants = (await one(`SELECT COUNT(*) AS n FROM users WHERE role = 'participant'`)).n;
  const dataPoints = (await one(`SELECT COUNT(*) AS n FROM measurements`)).n;
  const apiKeys = (await one(`SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 0`)).n;

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
