const siteData = window.ICL_SITE_DATA || {};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function safeUrl(value = '#') {
  const url = String(value || '#').trim();
  return /^(https?:|mailto:|tel:|#)/.test(url) ? url : '#';
}

function renderEmptyState(message) {
  return `<div class="empty-state reveal">${escapeHtml(message)}</div>`;
}

function renderSandboxMap() {
  const target = document.querySelector('[data-render="sandbox-map"]');
  const data = siteData.sandboxMap;
  if (!target) return;

  if (!data) {
    target.innerHTML = renderEmptyState('Mapa da sandbox ainda não configurado em site-data.js.');
    return;
  }

  const steps = Array.isArray(data.steps) ? data.steps : [];

  target.innerHTML = `
    <div class="map-frame reveal">
      <iframe title="${escapeHtml(data.title || 'Mapa da sandbox')}" src="${safeUrl(data.embedUrl)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <aside class="map-info reveal">
      <span class="map-status">${escapeHtml(data.status || 'Sandbox')}</span>
      <h3>${escapeHtml(data.title || 'Mapa da sandbox')}</h3>
      <p>${escapeHtml(data.description || '')}</p>
      <dl>
        <div>
          <dt>Endereço</dt>
          <dd>${escapeHtml(data.address || '')}</dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd>${escapeHtml(data.area || '')}</dd>
        </div>
      </dl>
      ${steps.length ? `<ol>${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}
      <p class="map-note">${escapeHtml(data.note || '')}</p>
      <a class="btn-solid" href="${safeUrl(data.externalUrl)}" target="_blank" rel="noopener">Abrir mapa completo</a>
    </aside>
  `;
}

function renderIncentives() {
  const target = document.querySelector('[data-render="incentives"]');
  const incentives = Array.isArray(siteData.incentives) ? siteData.incentives : [];
  if (!target) return;

  if (!incentives.length) {
    target.innerHTML = renderEmptyState('Incentivos ainda não configurados em site-data.js.');
    return;
  }

  target.innerHTML = incentives.map((item) => `
    <article class="incentive-card reveal">
      <div class="incentive-top">
        <div class="incentive-icon">${escapeHtml(item.icon || '•')}</div>
        <span>${escapeHtml(item.badge || 'Incentivo')}</span>
      </div>
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml(item.description || '')}</p>
      <ul>
        ${(Array.isArray(item.benefits) ? item.benefits : []).map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join('')}
      </ul>
      <a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(item.source || 'Fonte')} · ${escapeHtml(item.updatedAt || '')}</a>
    </article>
  `).join('');
}

function renderImpactResults() {
  const target = document.querySelector('[data-render="impact-results"]');
  const results = Array.isArray(siteData.impactResults) ? siteData.impactResults : [];
  if (!target) return;

  if (!results.length) {
    target.innerHTML = renderEmptyState('Resultados ainda não configurados em site-data.js.');
    return;
  }

  target.innerHTML = results.map((item) => `
    <article class="result-card reveal">
      <span class="result-type">${escapeHtml(item.type || 'Resultado')}</span>
      <h3>${escapeHtml(item.name || '')}</h3>
      <div class="result-metric">${escapeHtml(item.metric || '')}</div>
      <p>${escapeHtml(item.result || '')}</p>
      <small>${escapeHtml(item.detail || '')}</small>
      <a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(item.source || 'Fonte')} · ${escapeHtml(item.updatedAt || '')}</a>
    </article>
  `).join('');
}

function renderRegionalData() {
  const regional = siteData.regionalStats || {};
  const intro = document.querySelector('[data-render="regional-intro"]');
  const metricsTarget = document.querySelector('[data-render="regional-metrics"]');
  const sectorsTarget = document.querySelector('[data-render="regional-sectors"]');
  const sourcesTarget = document.querySelector('[data-render="regional-sources"]');
  const metrics = Array.isArray(regional.metrics) ? regional.metrics : [];
  const sectors = Array.isArray(regional.sectors) ? regional.sectors : [];
  const sources = Array.isArray(regional.sources) ? regional.sources : [];

  if (intro && regional.intro) intro.textContent = regional.intro;

  if (metricsTarget) {
    metricsTarget.innerHTML = metrics.length ? metrics.map((item) => `
      <article class="regional-card reveal">
        <span>${escapeHtml(item.label || '')}</span>
        <strong>${escapeHtml(item.value || '')}<em>${escapeHtml(item.suffix || '')}</em></strong>
        <p>${escapeHtml(item.description || '')}</p>
        <a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(item.source || 'Fonte')} · ${escapeHtml(item.updatedAt || '')}</a>
      </article>
    `).join('') : renderEmptyState('Indicadores regionais ainda não configurados em site-data.js.');
  }

  if (sectorsTarget) {
    sectorsTarget.innerHTML = sectors.length ? sectors.map((sector) => {
      const value = Math.max(0, Math.min(100, Number(sector.value) || 0));
      return `
        <div class="sector-row reveal">
          <div>
            <span>${escapeHtml(sector.label || '')}</span>
            <em>${value}%</em>
          </div>
          <div class="sector-bar"><span style="width: ${value}%"></span></div>
        </div>
      `;
    }).join('') : '<p class="empty-inline">Setores ainda não configurados.</p>';
  }

  if (sourcesTarget) {
    sourcesTarget.innerHTML = sources.length ? `
      <span>Fontes</span>
      ${sources.map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label || 'Fonte')}</a>`).join('')}
    ` : '';
  }
}

function renderParticipation() {
  const participation = siteData.participation || {};
  const title = document.querySelector('[data-render="participation-title"]');
  const description = document.querySelector('[data-render="participation-description"]');
  const criteriaTarget = document.querySelector('[data-render="participation-criteria"]');
  const checklistTarget = document.querySelector('[data-render="participation-checklist"]');
  const stepsTarget = document.querySelector('[data-render="participation-steps"]');
  const profilesTarget = document.querySelector('[data-render="participation-profiles"]');
  const areasTarget = document.querySelector('[data-render="participation-areas"]');
  const stagesTarget = document.querySelector('[data-render="participation-stages"]');

  if (title && participation.title) title.textContent = participation.title;
  if (description && participation.description) description.textContent = participation.description;

  if (criteriaTarget) {
    const criteria = Array.isArray(participation.criteria) ? participation.criteria : [];
    criteriaTarget.innerHTML = criteria.length ? criteria.map((item) => `
      <article class="criterion-card reveal">
        <h3>${escapeHtml(item.title || '')}</h3>
        <p>${escapeHtml(item.description || '')}</p>
      </article>
    `).join('') : renderEmptyState('Critérios ainda não configurados em site-data.js.');
  }

  if (checklistTarget) {
    const checklist = Array.isArray(participation.checklist) ? participation.checklist : [];
    checklistTarget.innerHTML = checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  if (stepsTarget) {
    const steps = Array.isArray(participation.steps) ? participation.steps : [];
    stepsTarget.innerHTML = steps.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  [
    [profilesTarget, participation.profiles],
    [areasTarget, participation.interestAreas],
    [stagesTarget, participation.solutionStages]
  ].forEach(([target, options]) => {
    if (!target) return;
    const currentPlaceholder = target.querySelector('option')?.outerHTML || '';
    const optionList = Array.isArray(options) ? options : [];
    target.innerHTML = currentPlaceholder + optionList.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  });
}

function renderLegalPolicies() {
  const target = document.querySelector('[data-render="legal-policies"]');
  const policies = Array.isArray(siteData.legalPolicies) ? siteData.legalPolicies : [];
  if (!target) return;

  if (!policies.length) {
    target.innerHTML = renderEmptyState('Documentos legais ainda não configurados em site-data.js.');
    return;
  }

  target.innerHTML = policies.map((policy) => `
    <article class="legal-card reveal" id="${escapeHtml(policy.id || '')}">
      <span class="legal-card-kicker">${escapeHtml(policy.title || '')}</span>
      <h3>${escapeHtml(policy.title || '')}</h3>
      <p>${escapeHtml(policy.summary || '')}</p>
      <ul>
        ${(Array.isArray(policy.items) ? policy.items : []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
      <a href="${safeUrl(policy.actionUrl)}" ${safeUrl(policy.actionUrl).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(policy.actionLabel || 'Saiba mais')}</a>
    </article>
  `).join('');
}

function renderSiteData() {
  renderSandboxMap();
  renderIncentives();
  renderImpactResults();
  renderRegionalData();
  renderParticipation();
  renderLegalPolicies();
}

renderSiteData();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal');

if (prefersReducedMotion) {
  revealItems.forEach((el) => el.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (!entry.isIntersecting) return;

      setTimeout(() => entry.target.classList.add('visible'), index * 90);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  revealItems.forEach((el) => observer.observe(el));
}

const heroVisual = document.querySelector('.hero-visual');
const orbitPoints = Array.from(document.querySelectorAll('.orbit-point'));
const orbitPanel = document.querySelector('.orbit-panel');
const orbitPanelTitle = document.querySelector('.orbit-panel-title');
const orbitPanelValue = document.querySelector('.orbit-panel-value');
const orbitPanelSub = document.querySelector('.orbit-panel-sub');
const orbitRings = Array.from(document.querySelectorAll('.ring'));

let orbitRotation = 0;
let selectedOrbitIndex = 0;
let orbitPaused = prefersReducedMotion;
let isOrbitDragging = false;
let orbitDragStartX = 0;
let orbitStartRotation = 0;
let orbitMoved = false;
let lastOrbitFrame = performance.now();

function getOrbitScale() {
  if (!heroVisual) return 1;
  return heroVisual.offsetWidth / 460;
}

function positionOrbitPoints() {
  const scale = getOrbitScale();

  orbitPoints.forEach((point) => {
    const baseAngle = Number(point.dataset.angle) || 0;
    const radius = (Number(point.dataset.radius) || 110) * scale;
    const angle = baseAngle + orbitRotation;

    point.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)`;
  });
}

function selectOrbitPoint(point) {
  if (!point || !orbitPanel) return;

  selectedOrbitIndex = Number(point.dataset.index) || 0;

  orbitPoints.forEach((item) => {
    const isActive = item === point;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });

  orbitRings.forEach((ring) => ring.classList.remove('active'));
  document.querySelector(`.ring-${point.dataset.ring}`)?.classList.add('active');

  orbitPanel.classList.add('active');
  orbitPanelTitle.textContent = point.dataset.title || point.dataset.label || '';
  orbitPanelValue.textContent = point.dataset.value || '';
  orbitPanelSub.textContent = point.dataset.sub || '';
}

function selectOrbitByIndex(index) {
  const nextIndex = (index + orbitPoints.length) % orbitPoints.length;
  const nextPoint = orbitPoints[nextIndex];

  selectOrbitPoint(nextPoint);
  nextPoint?.focus();
}

function animateOrbit(timestamp) {
  const delta = timestamp - lastOrbitFrame;
  lastOrbitFrame = timestamp;

  if (!orbitPaused && !isOrbitDragging) {
    orbitRotation = (orbitRotation + delta * 0.003) % 360;
    positionOrbitPoints();
  }

  requestAnimationFrame(animateOrbit);
}

if (heroVisual && orbitPoints.length) {
  positionOrbitPoints();
  selectOrbitPoint(orbitPoints[0]);

  if (!prefersReducedMotion) {
    requestAnimationFrame(animateOrbit);
  }

  window.addEventListener('resize', positionOrbitPoints);

  heroVisual.addEventListener('mouseenter', () => {
    orbitPaused = true;
    heroVisual.classList.add('is-paused');
  });

  heroVisual.addEventListener('mouseleave', () => {
    orbitPaused = prefersReducedMotion;
    heroVisual.classList.remove('is-paused');
  });

  heroVisual.addEventListener('focusin', () => {
    orbitPaused = true;
    heroVisual.classList.add('is-paused');
  });

  heroVisual.addEventListener('focusout', (event) => {
    if (heroVisual.contains(event.relatedTarget)) return;
    orbitPaused = prefersReducedMotion;
    heroVisual.classList.remove('is-paused');
  });

  heroVisual.addEventListener('wheel', (event) => {
    event.preventDefault();
    orbitRotation = (orbitRotation + event.deltaY * 0.08) % 360;
    positionOrbitPoints();
  }, { passive: false });

  heroVisual.addEventListener('pointerdown', (event) => {
    isOrbitDragging = true;
    orbitMoved = false;
    orbitDragStartX = event.clientX;
    orbitStartRotation = orbitRotation;
    heroVisual.classList.add('is-dragging', 'is-paused');
    heroVisual.setPointerCapture(event.pointerId);
  });

  heroVisual.addEventListener('pointermove', (event) => {
    if (!isOrbitDragging) return;

    const deltaX = event.clientX - orbitDragStartX;
    if (Math.abs(deltaX) > 3) orbitMoved = true;

    orbitRotation = orbitStartRotation + deltaX * 0.45;
    positionOrbitPoints();
  });

  heroVisual.addEventListener('pointerup', (event) => {
    isOrbitDragging = false;
    heroVisual.classList.remove('is-dragging');
    if (heroVisual.hasPointerCapture(event.pointerId)) {
      heroVisual.releasePointerCapture(event.pointerId);
    }
  });

  heroVisual.addEventListener('pointercancel', (event) => {
    isOrbitDragging = false;
    orbitMoved = false;
    heroVisual.classList.remove('is-dragging');
    if (heroVisual.hasPointerCapture(event.pointerId)) {
      heroVisual.releasePointerCapture(event.pointerId);
    }
  });

  orbitPoints.forEach((point, index) => {
    point.addEventListener('mouseenter', () => selectOrbitPoint(point));
    point.addEventListener('focus', () => selectOrbitPoint(point));
    point.addEventListener('click', (event) => {
      if (orbitMoved) {
        event.preventDefault();
        orbitMoved = false;
        return;
      }

      selectOrbitPoint(point);
    });

    point.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        selectOrbitByIndex(index + 1);
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        selectOrbitByIndex(index - 1);
      }
    });
  });
}

const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

function setMenuState(isOpen) {
  if (!hamburger || !mobileMenu) return;

  mobileMenu.classList.toggle('open', isOpen);
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  hamburger.classList.toggle('active', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('menu-open', isOpen);
}

hamburger?.addEventListener('click', () => {
  setMenuState(!mobileMenu.classList.contains('open'));
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu?.classList.contains('open')) {
    setMenuState(false);
    hamburger?.focus();
  }
});

const faqItems = document.querySelectorAll('.faq-item');
const faqButtons = document.querySelectorAll('.faq-question');

function closeFAQ(item) {
  item.classList.remove('open');
  const btn = item.querySelector('.faq-question');
  const ans = item.querySelector('.faq-answer');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (ans) ans.style.maxHeight = null;
}

function openFAQ(item) {
  item.classList.add('open');
  const btn = item.querySelector('.faq-question');
  const ans = item.querySelector('.faq-answer');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  if (ans) ans.style.maxHeight = `${ans.scrollHeight}px`;
}

faqButtons.forEach((button) => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentItem = button.closest('.faq-item');
    const isOpen = currentItem.classList.contains('open');

    // Fechar todas as outras FAQs
    faqItems.forEach((item) => {
      if (item !== currentItem) {
        closeFAQ(item);
      }
    });

    // Toggle a atual
    if (isOpen) {
      closeFAQ(currentItem);
    } else {
      openFAQ(currentItem);
    }
  });
});

document.querySelectorAll('.project-card').forEach((card) => {
  const panel = card.querySelector('.project-expand');
  if (!panel) return;

  const setProjectOpen = (isOpen) => {
    card.classList.toggle('open', isOpen);
    card.setAttribute('aria-expanded', String(isOpen));
    panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : null;
  };

  card.addEventListener('click', (event) => {
    if (event.target.closest('a')) return;

    const isOpen = card.classList.contains('open');

    document.querySelectorAll('.project-card.open').forEach((openCard) => {
      if (openCard === card) return;
      openCard.classList.remove('open');
      openCard.setAttribute('aria-expanded', 'false');
      openCard.querySelector('.project-expand').style.maxHeight = null;
    });

    setProjectOpen(!isOpen);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    card.click();
  });
});

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function updateActiveNav() {
  const scrollY = window.scrollY + 110;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');

    if (scrollY < top || scrollY >= top + height) return;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

document.querySelectorAll('.contact-form').forEach((form) => {
  const feedback = form.querySelector('.form-feedback');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (feedback) {
      feedback.textContent = 'Mensagem registrada. A equipe do Ijuí City Lab entrará em contato em breve.';
    }

    form.reset();
  });
});

document.querySelectorAll('.proposal-form').forEach((form) => {
  const feedback = form.querySelector('.proposal-feedback');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (feedback) {
      feedback.textContent = siteData.participation?.confirmationMessage || 'Proposta registrada nesta versão demonstrativa. Para envio oficial, entre em contato com a equipe do Ijuí City Lab.';
    }

    form.reset();
  });
});
