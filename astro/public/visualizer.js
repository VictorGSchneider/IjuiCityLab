/* Painel ao vivo do Ijuí City Lab — busca /api/visualizer e atualiza sozinho. */
(function () {
  const root = document.getElementById('painel');
  if (!root) return;

  const els = {
    updated: root.querySelector('[data-viz="updated"]'),
    filters: root.querySelector('[data-viz="filters"]'),
    stats: root.querySelector('[data-viz="stats"]'),
    areas: root.querySelector('[data-viz="areas"]'),
    pins: root.querySelector('[data-viz="pins"]'),
    mapEmpty: root.querySelector('[data-viz="map-empty"]'),
    list: root.querySelector('[data-viz="list"]'),
  };

  const STATUS_LABEL = {
    planning: 'Planejado', active: 'Em operação', paused: 'Pausado',
    completed: 'Concluído', archived: 'Arquivado',
  };
  const STATUS_ORDER = ['active', 'planning', 'paused', 'completed', 'archived'];

  let data = null;
  let filter = 'all';

  const esc = (s) => s == null ? '' : String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function relTime(iso) {
    const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (secs < 5) return 'agora mesmo';
    if (secs < 60) return `há ${secs}s`;
    const m = Math.round(secs / 60);
    if (m < 60) return `há ${m} min`;
    return `há ${Math.round(m / 60)} h`;
  }

  // Posição determinística estável quando o projeto não tem coordenadas definidas.
  function pinPos(p) {
    if (p.map_x != null && p.map_y != null) return { x: p.map_x, y: p.map_y };
    const seed = (p.id * 2654435761) >>> 0;
    return { x: 32 + (seed % 48), y: 18 + ((seed >> 8) % 38) };
  }

  function render() {
    if (!data) return;
    const { totals, byStatus, byArea, areaLabels, projects } = data;

    els.updated.textContent = relTime(data.generatedAt);

    // Filtros por status (só os que têm projetos)
    if (!els.filters.dataset.ready) {
      const active = STATUS_ORDER.filter((s) => (byStatus[s] || 0) > 0);
      const opts = [['all', 'Todos'], ...active.map((s) => [s, STATUS_LABEL[s]])];
      els.filters.innerHTML = opts.map(([v, l]) =>
        `<button class="viz-filter${v === filter ? ' active' : ''}" data-filter="${v}">${l}</button>`).join('');
      els.filters.dataset.ready = '1';
      els.filters.querySelectorAll('.viz-filter').forEach((b) => {
        b.addEventListener('click', () => {
          filter = b.dataset.filter;
          els.filters.querySelectorAll('.viz-filter').forEach((x) => x.classList.toggle('active', x === b));
          applyFilter();
        });
      });
    }

    // Estatísticas
    els.stats.innerHTML = [
      ['v', totals.projects, 'Projetos'],
      ['v', totals.active, 'Em operação'],
      ['v', totals.dataPoints, 'Pontos de dados'],
    ].map(([, v, l]) => `<div class="viz-stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

    // Barras por área
    const areaEntries = Object.entries(byArea).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...areaEntries.map(([, n]) => n));
    els.areas.innerHTML = areaEntries.length
      ? areaEntries.map(([a, n]) => `
        <div class="viz-bar-row">
          <span class="viz-bar-label">${esc(areaLabels[a] || a)}</span>
          <span class="viz-bar-track"><span class="viz-bar-fill" style="width:${(n / max) * 100}%"></span></span>
          <span class="viz-bar-val">${n}</span>
        </div>`).join('')
      : '<div class="viz-empty">Sem dados de área ainda.</div>';

    // Pins no mapa
    els.mapEmpty.hidden = projects.length > 0;
    els.pins.innerHTML = projects.map((p) => {
      const { x, y } = pinPos(p);
      return `<button class="viz-pin" data-status="${p.status}" data-id="${p.id}"
        style="left:${x}%;top:${y}%" aria-label="${esc(p.name)} — ${STATUS_LABEL[p.status] || p.status}">
        <span class="viz-pin-tip">${esc(p.name)} · ${STATUS_LABEL[p.status] || p.status}</span></button>`;
    }).join('');

    // Lista
    els.list.innerHTML = projects.length ? projects.map((p) => `
      <article class="viz-item" data-status="${p.status}" data-id="${p.id}">
        <div class="viz-item-top">
          <h4>${esc(p.name)}</h4>
          <span class="viz-badge" data-status="${p.status}">${STATUS_LABEL[p.status] || p.status}</span>
        </div>
        <p>${esc(p.description || '')}</p>
        <div class="viz-item-meta">
          <span>${esc(areaLabels[p.area] || p.area)}</span>
          ${p.zone ? `<span>· ${esc(p.zone)}</span>` : ''}
          <span>· ${p.data_points} dados</span>
        </div>
      </article>`).join('')
      : '<div class="viz-empty">Nenhum projeto publicado ainda. Em breve os primeiros pilotos aparecem aqui.</div>';

    applyFilter();
  }

  function applyFilter() {
    root.querySelectorAll('.viz-item, .viz-pin').forEach((el) => {
      el.classList.toggle('dim', filter !== 'all' && el.dataset.status !== filter);
    });
  }

  async function load() {
    try {
      const res = await fetch('/api/visualizer', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      data = await res.json();
      render();
    } catch { /* silencioso: tenta de novo no próximo ciclo */ }
  }

  load();
  setInterval(() => { if (!document.hidden) load(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  // Atualiza só o "há Xs" entre os ciclos
  setInterval(() => { if (data) els.updated.textContent = relTime(data.generatedAt); }, 1000);
})();
