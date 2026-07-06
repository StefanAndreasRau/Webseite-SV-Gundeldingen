(function () {
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

  function renderNewsItem(item, interactive) {
    const hover = interactive ? ' hover:border-white/20 transition-colors' : '';
    const textClass = item.highlight ? 'text-strong font-medium' : 'text-muted';
    const link = item.linkUrl && item.linkLabel
      ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noopener" class="ext-link text-sm">${escapeHtml(item.linkLabel)}</a>`
      : '';
    return `<article class="card p-5${hover}"><time class="text-xs text-gold-400 font-medium">${escapeHtml(item.date)}</time><p class="mt-1 ${textClass}">${renderInlineMarkdown(item.text)}</p>${link}</article>`;
  }

  function renderNews(data) {
    const featuredEl = document.getElementById('news-list');
    const moreEl = document.getElementById('news-more');
    if (!featuredEl || !moreEl) return;

    const items = data.items || [];
    const featured = items.filter((item) => item.featured);
    const more = items.filter((item) => !item.featured);

    featuredEl.innerHTML = featured.length
      ? featured.map((item) => renderNewsItem(item, true)).join('')
      : '<p class="text-muted text-sm">Noch keine News.</p>';

    moreEl.innerHTML = more.length
      ? more.map((item) => renderNewsItem(item, false)).join('')
      : '<p class="text-muted text-sm">Keine weiteren Einträge.</p>';

    document.getElementById('news-more-wrap').hidden = more.length === 0;
  }

  function renderAgenda(data) {
    const agendaEl = document.getElementById('agenda-list');
    if (!agendaEl) return;

    agendaEl.innerHTML = '';
    (data.months || []).forEach(({ month, events }, index) => {
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
