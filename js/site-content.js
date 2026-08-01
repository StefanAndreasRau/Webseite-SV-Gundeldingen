(function () {
  const MONTH_MAP = {
    jan: 0, januar: 0, feb: 1, februar: 1, märz: 2, marz: 2, mrz: 2,
    april: 3, apr: 3, mai: 4, juni: 5, jun: 5, juli: 6, jul: 6,
    aug: 7, august: 7, sept: 8, sep: 8, september: 8, okt: 9, oktober: 9,
    nov: 10, november: 10, dez: 11, dezember: 11,
  };

  function normalizeMonth(value) {
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, '').trim();
  }

  function monthIndex(value) {
    const key = normalizeMonth(value);
    if (Object.prototype.hasOwnProperty.call(MONTH_MAP, key)) return MONTH_MAP[key];
    return MONTH_MAP[key.slice(0, 3)];
  }

  function parseAgendaMonthEnd(monthLabel) {
    const years = String(monthLabel).match(/\d{4}/g);
    const year = years ? parseInt(years[years.length - 1], 10) : new Date().getFullYear();
    const monthTokens = String(monthLabel).match(/[A-Za-zäöüÄÖÜ.]{3,}/g) || [];
    const monthIndexes = monthTokens.map((token) => monthIndex(token)).filter((value) => value !== undefined);
    if (!monthIndexes.length) return null;
    const endMonth = monthIndexes[monthIndexes.length - 1];
    return new Date(year, endMonth + 1, 0);
  }

  function shouldKeepAgendaMonth(monthLabel, now) {
    const end = parseAgendaMonthEnd(monthLabel);
    if (!end) return true;
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    return end >= cutoff;
  }

  const NEWS_LIMIT = 3;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderInlineMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const safeUrl = url.startsWith('#') ? url : escapeHtml(url);
      const external = !url.startsWith('#');
      const attrs = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${safeUrl}" class="ext-link"${attrs}>${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-strong">$1</strong>');
    return html;
  }

  function renderDetailMarkdown(text) {
    if (!text) return '';
    return text.split(/\n\n+/).map((block) => {
      const trimmed = block.trim();
      const lines = trimmed.split('\n');
      if (lines.every((line) => line.startsWith('- '))) {
        return `<ul class="list-disc pl-5 space-y-0.5 text-sm text-muted">${lines.map((line) =>
          `<li>${renderInlineMarkdown(line.slice(2))}</li>`
        ).join('')}</ul>`;
      }
      if (lines[0].startsWith('## ')) {
        const heading = escapeHtml(lines[0].slice(3));
        const body = lines.slice(1).join(' ').trim();
        const bodyHtml = body
          ? `<p class="text-muted text-sm leading-relaxed mt-1">${renderInlineMarkdown(body)}</p>`
          : '';
        return `<h3 class="font-medium text-strong text-sm mt-5 mb-1 first:mt-0">${heading}</h3>${bodyHtml}`;
      }
      return `<p class="text-muted text-sm leading-relaxed mb-3 last:mb-0">${renderInlineMarkdown(trimmed.replace(/\n/g, ' '))}</p>`;
    }).join('');
  }

  let newsPopupEl = null;
  const newsDetailStore = new Map();

  function ensureNewsPopup() {
    if (newsPopupEl) return newsPopupEl;

    newsPopupEl = document.createElement('div');
    newsPopupEl.id = 'news-popup';
    newsPopupEl.className = 'fixed inset-0 z-[100] hidden items-center justify-center p-4 sm:p-6';
    newsPopupEl.innerHTML = `
      <div class="absolute inset-0 bg-black/70" data-news-popup-close></div>
      <div class="relative w-full max-w-2xl max-h-[min(85vh,720px)] overflow-y-auto card p-6 sm:p-8 section-dark shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="news-popup-title">
        <button type="button" class="absolute top-4 right-4 text-faint hover:text-strong transition-colors" data-news-popup-close aria-label="Schliessen">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h2 id="news-popup-title" class="font-serif text-xl sm:text-2xl text-strong pr-8"></h2>
        <div id="news-popup-body" class="mt-4 space-y-1"></div>
      </div>
    `;
    document.body.appendChild(newsPopupEl);

    newsPopupEl.querySelectorAll('[data-news-popup-close]').forEach((el) => {
      el.addEventListener('click', closeNewsPopup);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !newsPopupEl.classList.contains('hidden')) closeNewsPopup();
    });

    return newsPopupEl;
  }

  function openNewsPopup(title, detail) {
    const popup = ensureNewsPopup();
    popup.querySelector('#news-popup-title').textContent = title || 'News';
    popup.querySelector('#news-popup-body').innerHTML = renderDetailMarkdown(detail);
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function closeNewsPopup() {
    if (!newsPopupEl) return;
    newsPopupEl.classList.add('hidden');
    newsPopupEl.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function bindNewsPopupLinks(container) {
    if (!container) return;
    container.querySelectorAll('a[href="#news-popup"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const article = link.closest('[data-news-id]');
        if (!article) return;
        const entry = newsDetailStore.get(article.dataset.newsId);
        if (!entry) return;
        openNewsPopup(entry.title, entry.detail);
      });
    });
  }

  function renderNewsItem(item, interactive, index) {
    const hover = interactive ? ' hover:border-white/20 transition-colors' : '';
    const textClass = item.highlight ? 'text-strong font-medium' : 'text-muted';
    const link = item.linkUrl && item.linkLabel
      ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noopener" class="ext-link text-sm">${escapeHtml(item.linkLabel)}</a>`
      : '';
    const popupAttrs = item.detail
      ? ` data-news-id="${index}"`
      : '';
    if (item.detail) {
      newsDetailStore.set(String(index), {
        title: item.detailTitle || item.date,
        detail: item.detail,
      });
    }
    return `<article class="card p-5${hover}"${popupAttrs}><time class="text-xs text-gold-400 font-medium">${escapeHtml(item.date)}</time><p class="mt-1 ${textClass}">${renderInlineMarkdown(item.text)}</p>${link}</article>`;
  }

  function renderNews(data) {
    const newsEl = document.getElementById('news-list');
    if (!newsEl) return;

    newsDetailStore.clear();
    const items = (data.items || []).slice(0, NEWS_LIMIT);

    newsEl.innerHTML = items.length
      ? items.map((item, index) => renderNewsItem(item, true, `n-${index}`)).join('')
      : '<p class="text-muted text-sm">Noch keine News.</p>';

    bindNewsPopupLinks(newsEl);
  }

  function renderAgenda(data) {
    const agendaEl = document.getElementById('agenda-list');
    if (!agendaEl) return;

    agendaEl.innerHTML = '';
    const now = new Date();
    (data.months || [])
      .filter(({ month }) => shouldKeepAgendaMonth(month, now))
      .forEach(({ month, events }, index) => {
      const details = document.createElement('details');
      details.className = 'card group';
      if (index === 0) details.open = true;
      details.innerHTML = `<summary class="px-5 py-3.5 flex justify-between font-medium text-sm text-strong cursor-pointer hover:bg-white/5 rounded-xl">${escapeHtml(month)}<svg class="w-4 h-4 text-faint group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></summary><div class="px-5 pb-4 space-y-2">${(events || []).map(({ date, text }) => `<div class="flex gap-4 text-sm py-1.5 border-b border-white/5 last:border-0"><span class="text-gold-400 font-medium w-28 shrink-0">${escapeHtml(date)}</span><span class="text-muted">${escapeHtml(text)}</span></div>`).join('')}</div>`;
      agendaEl.appendChild(details);
    });
  }

  function renderMatchRows(matches) {
    return (matches || []).map(({ date, home, score, away }) =>
      `<tr class="border-b border-stone-100"><td class="py-1.5">${escapeHtml(date)}</td><td>${escapeHtml(home)}</td><td>${escapeHtml(score)}</td><td>${escapeHtml(away)}</td></tr>`
    ).join('');
  }

  function renderResults(data) {
    const nmm = data.nmm || {};
    const smm = data.smm || {};
    const vm = data.vm || {};
    const blitz = data.blitz || {};

    const nmmBody = document.getElementById('tab-nmm-body');
    if (nmmBody) {
      const teamRows = (nmm.teams || []).map((team) => {
        const header = team.name
          ? `<tr class="border-b border-stone-200"><td class="py-2 font-medium text-strong" colspan="4">${escapeHtml(team.name)}</td></tr>`
          : '';
        return header + renderMatchRows(team.matches);
      }).join('');
      nmmBody.innerHTML = teamRows;
    }

    const nmmTitle = document.getElementById('tab-nmm-title');
    if (nmmTitle) nmmTitle.textContent = nmm.title || 'NMM';

    const nmmLink = document.getElementById('tab-nmm-link');
    if (nmmLink && nmm.linkUrl) {
      nmmLink.href = nmm.linkUrl;
      nmmLink.textContent = nmm.linkLabel || 'Alle Resultate →';
      nmmLink.hidden = false;
    } else if (nmmLink) {
      nmmLink.hidden = true;
    }

    const smmBody = document.getElementById('tab-smm-body');
    if (smmBody) {
      smmBody.innerHTML = (smm.teams || []).map((team) => {
        const header = team.name
          ? `<tr class="border-b border-stone-200"><td class="py-2 font-medium text-strong" colspan="4">${escapeHtml(team.name)}</td></tr>`
          : '';
        return header + renderMatchRows(team.matches);
      }).join('');
    }

    const smmTitle = document.getElementById('tab-smm-title');
    if (smmTitle) smmTitle.textContent = smm.title || 'SMM';

    const smmLink = document.getElementById('tab-smm-link');
    if (smmLink && smm.linkUrl) {
      smmLink.href = smm.linkUrl;
      smmLink.textContent = smm.linkLabel || 'Rangliste →';
      smmLink.hidden = false;
    } else if (smmLink) {
      smmLink.hidden = true;
    }

    const vmBody = document.getElementById('tab-vm-body');
    if (vmBody) {
      vmBody.innerHTML = `<p class="text-muted mb-3">${renderInlineMarkdown(vm.summary || '')}</p>`;
    }

    const vmLink = document.getElementById('tab-vm-link');
    if (vmLink && vm.linkUrl) {
      vmLink.href = vm.linkUrl;
      vmLink.textContent = vm.linkLabel || 'Paarungen / Rangliste';
      vmLink.hidden = false;
    } else if (vmLink) {
      vmLink.hidden = true;
    }

    const blitzBody = document.getElementById('tab-blitz-body');
    if (blitzBody) {
      blitzBody.innerHTML = (blitz.lines || [])
        .map((entry) => {
          const line = typeof entry === 'string' ? entry : entry.line;
          return `<p>${renderInlineMarkdown(line)}</p>`;
        })
        .join('');
    }
  }

  async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} (${response.status})`);
    return response.json();
  }

  async function initSiteContent() {
    try {
      const [news, agenda, results] = await Promise.all([
        loadJson('data/news.json'),
        loadJson('data/agenda.json'),
        loadJson('data/results.json'),
      ]);
      renderNews(news);
      renderAgenda(agenda);
      renderResults(results);
    } catch (error) {
      console.error('Inhalte konnten nicht geladen werden:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', initSiteContent);
})();
