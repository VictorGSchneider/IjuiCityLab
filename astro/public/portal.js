const API = '/api';
const TOKEN_KEY = 'icl_participant_token';
const state = { token: null, user: null };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
const STATUS_LABEL = {
  submitted: 'Submetida', under_review: 'Em análise', approved: 'Aprovada',
  rejected: 'Rejeitada', archived: 'Arquivada',
  planning: 'Planejado', active: 'Em operação', paused: 'Pausado', completed: 'Concluído',
};
const SCOPE_LABEL = { read: 'Ler', ingest: 'Enviar', read_ingest: 'Ler e enviar' };

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || 'Erro de comunicação');
  return data;
}

function setSession(s) {
  state.token = s.token; state.user = s.user;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
  showApp();
}
function clearSession() {
  state.token = null; state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
}

function showApp() {
  $('.auth-wrap').hidden = true;
  $('.topbar').hidden = false;
  $('.app-wrap').hidden = false;
  $('.user-name').textContent = state.user?.name || '';
  switchView('proposals');
  fillAccountForm();
  prefillProposalForm();
}

function switchView(name) {
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach((s) => (s.hidden = s.dataset.view !== name));
  if (name === 'proposals') loadProposals();
  if (name === 'api') loadApiTab();
}

document.addEventListener('click', (e) => {
  if (e.target.matches('.tab')) switchView(e.target.dataset.view);
  if (e.target.matches('.logout')) clearSession();
  if (e.target.dataset.go) switchView(e.target.dataset.go);
  if (e.target.matches('.auth-tab')) {
    const m = e.target.dataset.mode;
    $$('.auth-tab').forEach((b) => b.classList.toggle('active', b === e.target));
    $('#loginForm').hidden = m !== 'login';
    $('#registerForm').hidden = m !== 'register';
  }
});

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  try {
    setSession(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: f.email.value, password: f.password.value }) }));
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  const body = { name: f.name.value, email: f.email.value, password: f.password.value, company: f.company.value, cnpj: f.cnpj.value, phone: f.phone.value };
  try {
    setSession(await api('/auth/register', { method: 'POST', body: JSON.stringify(body) }));
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

async function loadProposals() {
  const rows = await api('/me/proposals');
  $('#proposalsTable tbody').innerHTML = rows.map((p) => `
    <tr>
      <td>#${p.id}</td><td>${esc(p.proponente)}</td><td>${esc(p.area)}</td><td>${esc(p.estagio)}</td>
      <td><span class="status ${p.status}">${STATUS_LABEL[p.status]}</span></td>
      <td>${fmtDate(p.updated_at)}</td>
      <td><button class="btn" data-detail="${p.id}">Abrir</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="muted">Você ainda não submeteu nenhuma proposta.</td></tr>';
}

document.addEventListener('click', async (e) => {
  if (!e.target.dataset.detail) return;
  const p = await api(`/me/proposals/${e.target.dataset.detail}`);
  $('#detailContent').innerHTML = `
    <h3>Proposta #${p.id}</h3>
    <dl class="detail-grid">
      <dt>Proponente</dt><dd>${esc(p.proponente)}</dd>
      <dt>Área</dt><dd>${esc(p.area)}</dd>
      <dt>Estágio</dt><dd>${esc(p.estagio)}</dd>
      <dt>Objetivo</dt><dd>${esc(p.objetivo)}</dd>
      <dt>Resumo</dt><dd>${esc(p.resumo)}</dd>
      <dt>Status</dt><dd><span class="status ${p.status}">${STATUS_LABEL[p.status]}</span></dd>
      ${p.admin_notes ? `<dt>Retorno da equipe</dt><dd>${esc(p.admin_notes)}</dd>` : ''}
      <dt>Submetida</dt><dd>${fmtDate(p.created_at)}</dd>
    </dl>
    ${p.status === 'submitted' ? '<button class="btn danger" id="delMine">Excluir proposta</button>' : ''}`;
  $('#detailDialog').showModal();
  const del = $('#delMine');
  if (del) del.onclick = async () => {
    if (!confirm('Excluir esta proposta?')) return;
    await api(`/me/proposals/${p.id}`, { method: 'DELETE' });
    $('#detailDialog').close(); loadProposals();
  };
});

function prefillProposalForm() {
  const f = $('#proposalForm');
  if (!f || !state.user) return;
  f.nome.value = state.user.name || '';
  f.email.value = state.user.email || '';
  f.proponente.value = state.user.company || '';
  f.cnpj.value = state.user.cnpj || '';
}

$('#proposalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  const body = {
    nome: f.nome.value, email: f.email.value, proponente: f.proponente.value, cnpj: f.cnpj.value,
    perfil: f.perfil.value, area: f.area.value, estagio: f.estagio.value, objetivo: f.objetivo.value, resumo: f.resumo.value,
  };
  try {
    await api('/me/proposals', { method: 'POST', body: JSON.stringify(body) });
    fb.textContent = 'Proposta enviada! Acompanhe em "Minhas propostas".'; fb.classList.add('ok');
    f.reset(); prefillProposalForm();
    setTimeout(() => switchView('proposals'), 800);
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

/* ---------- API & Dados ---------- */
async function loadApiTab() {
  const [projects, keys] = await Promise.all([api('/me/projects'), api('/me/keys')]);
  $('#myProjectsTable tbody').innerHTML = projects.map((p) => `
    <tr>
      <td>${esc(p.name)}</td><td><code>${esc(p.slug)}</code></td><td>${esc(p.area)}</td>
      <td><span class="status ${p.status}">${STATUS_LABEL[p.status] || p.status}</span></td>
      <td>${p.data_points}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">Nenhum projeto atribuído ainda. A equipe do Lab cria os projetos a partir das propostas aprovadas.</td></tr>';

  $('#keysTable tbody').innerHTML = keys.map((k) => `
    <tr>
      <td>${esc(k.name)}</td><td><code>icl_${esc(k.prefix)}…</code></td><td>${SCOPE_LABEL[k.scope] || k.scope}</td>
      <td>${k.last_used_at ? fmtDate(k.last_used_at) : '—'}</td>
      <td>${k.revoked ? '<span class="key-revoked">Revogada</span>' : 'Ativa'}</td>
      <td>${k.revoked ? '' : `<button class="btn danger" data-revoke="${k.id}">Revogar</button>`}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma chave gerada.</td></tr>';

  const slug = projects[0]?.slug || 'meu-projeto-slug';
  $('#ingestExample').textContent =
`curl -X POST ${location.origin}/api/v1/ingest \\
  -H "X-API-Key: SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"project":"${slug}","metric":"temperatura","value":23.4,"unit":"C"}'`;
}

$('#keyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  try {
    const r = await api('/me/keys', { method: 'POST', body: JSON.stringify({ name: f.name.value, scope: f.scope.value }) });
    $('#newKeyValue').textContent = r.key;
    $('#newKeyBox').hidden = false;
    fb.textContent = 'Chave criada. Copie agora — ela não será exibida novamente.'; fb.classList.add('ok');
    f.name.value = '';
    loadApiTab();
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

document.addEventListener('click', async (e) => {
  if (!e.target.dataset.revoke) return;
  if (!confirm('Revogar esta chave? Integrações que a usam deixarão de funcionar.')) return;
  await api(`/me/keys/${e.target.dataset.revoke}`, { method: 'DELETE' });
  loadApiTab();
});

/* ---------- Conta ---------- */
function fillAccountForm() {
  const f = $('#accountForm');
  if (!f || !state.user) return;
  f.name.value = state.user.name || '';
  f.email.value = state.user.email || '';
  f.company.value = state.user.company || '';
  f.cnpj.value = state.user.cnpj || '';
  f.phone.value = state.user.phone || '';
}

$('#accountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  try {
    await api('/me', { method: 'PATCH', body: JSON.stringify({ name: f.name.value, company: f.company.value, cnpj: f.cnpj.value, phone: f.phone.value }) });
    state.user = { ...state.user, name: f.name.value, company: f.company.value, cnpj: f.cnpj.value, phone: f.phone.value };
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: state.token, user: state.user }));
    $('.user-name').textContent = state.user.name;
    fb.textContent = 'Dados atualizados.'; fb.classList.add('ok');
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

$('#passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, fb = $('.feedback', f);
  fb.textContent = ''; fb.className = 'feedback';
  try {
    await api('/me/password', { method: 'POST', body: JSON.stringify({ current: f.current.value, next: f.next.value }) });
    fb.textContent = 'Senha atualizada.'; fb.classList.add('ok'); f.reset();
  } catch (err) { fb.textContent = err.message; fb.classList.add('error'); }
});

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

(function restore() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    state.token = s.token; state.user = s.user;
    api('/me').then(() => showApp()).catch(clearSession);
  } catch { clearSession(); }
})();
