import { one, run } from '../../../../lib/db.js';
import { json, handler, readBody, httpError } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/auth.js';
import { str, oneOf } from '../../../../lib/validate.js';
import { AREAS, PERFIS, ESTAGIOS } from '../../../../lib/options.js';

export const GET = handler(async ({ request, params }) => {
  const u = requireUser(request, 'participant');
  const row = await one('SELECT * FROM proposals WHERE id = ? AND user_id = ?', [params.id, u.sub]);
  if (!row) return json({ error: 'Proposta não encontrada' }, 404);
  return json(row);
});

export const PATCH = handler(async ({ request, params }) => {
  const u = requireUser(request, 'participant');
  const row = await one('SELECT * FROM proposals WHERE id = ? AND user_id = ?', [params.id, u.sub]);
  if (!row) return json({ error: 'Proposta não encontrada' }, 404);
  if (row.status !== 'submitted') throw httpError(403, 'Proposta já em análise — não pode ser editada.');

  const b = await readBody(request);
  const updates = {};
  if (b.proponente !== undefined) updates.proponente = str(b.proponente, { label: 'proponente', max: 160 });
  if (b.cnpj !== undefined)       updates.cnpj       = str(b.cnpj, { required: false, label: 'CNPJ', max: 32 });
  if (b.perfil !== undefined)     updates.perfil     = oneOf(b.perfil, PERFIS, 'perfil');
  if (b.area !== undefined)       updates.area       = oneOf(b.area, AREAS, 'área');
  if (b.estagio !== undefined)    updates.estagio    = oneOf(b.estagio, ESTAGIOS, 'estágio');
  if (b.objetivo !== undefined)   updates.objetivo   = str(b.objetivo, { label: 'objetivo', max: 300 });
  if (b.resumo !== undefined)     updates.resumo     = str(b.resumo, { label: 'resumo', min: 20, max: 4000 });
  if (!Object.keys(updates).length) return json({ ok: true });

  const sets = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  await run(`UPDATE proposals SET ${sets}, updated_at = datetime('now') WHERE id = @id`, { ...updates, id: row.id });
  return json({ ok: true });
});

export const DELETE = handler(async ({ request, params }) => {
  const u = requireUser(request, 'participant');
  const row = await one('SELECT status FROM proposals WHERE id = ? AND user_id = ?', [params.id, u.sub]);
  if (!row) return json({ error: 'Proposta não encontrada' }, 404);
  if (row.status !== 'submitted') return json({ error: 'Proposta já em análise — não pode ser excluída.' }, 403);
  await run('DELETE FROM proposals WHERE id = ?', [params.id]);
  return json({ ok: true });
});
