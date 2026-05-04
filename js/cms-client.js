(function () {
  const config = window.SCHOOL_CMS_CONFIG || {};
  const apiBase = (config.apiBase || 'http://localhost:1337/api').replace(/\/$/, '');
  const mediaBase = apiBase.replace(/\/api$/, '');

  const categoryLabels = {
    academic: 'Академічні',
    sport: 'Спорт',
    art: 'Мистецтво',
    admission: 'Вступ',
    community: 'Громада',
    other: 'Подія',
  };

  const categoryColors = {
    academic: 'bg-primary',
    sport: 'bg-blue-600',
    art: 'bg-purple-600',
    admission: 'bg-green-600',
    community: 'bg-cyan-700',
    other: 'bg-slate-600',
  };

  document.addEventListener('DOMContentLoaded', function () {
    hydrateLatestEvents();
    hydrateEventsPage();
    hydratePublicDocuments();
  });

  async function hydrateLatestEvents() {
    const container = document.querySelector('#latest-events-grid');
    if (!container) return;

    const events = await fetchCollection('/events', 'populate=cover&sort=date:desc&filters[featured][$eq]=true&pagination[limit]=4');
    if (!events.length) return;

    container.innerHTML = events.map(renderCompactEventCard).join('');
  }

  async function hydrateEventsPage() {
    const container = document.querySelector('#events-grid');
    if (!container) return;

    const events = await fetchCollection('/events', 'populate=cover&sort=date:desc&pagination[limit]=12');
    if (!events.length) return;

    container.innerHTML = events.map(renderEventCard).join('');
  }

  async function hydratePublicDocuments() {
    const container = document.querySelector('#public-documents-grid');
    if (!container) return;

    const documents = await fetchCollection('/public-documents', 'populate=file&sort=order:asc&pagination[limit]=50');
    if (!documents.length) return;

    container.innerHTML = documents.map(renderPublicDocumentCard).join('') + renderRequestCard();
  }

  async function fetchCollection(path, query) {
    try {
      const response = await fetch(`${apiBase}${path}?${query}`);
      if (!response.ok) return [];

      const payload = await response.json();
      return Array.isArray(payload.data) ? payload.data.map(normalizeEntity) : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeEntity(entity) {
    if (entity && entity.attributes) {
      return { id: entity.id, ...entity.attributes };
    }

    return entity || {};
  }

  function getMediaUrl(media) {
    const file = media && media.data && media.data.attributes ? media.data.attributes : media;
    if (!file || !file.url) return '';

    return file.url.startsWith('http') ? file.url : `${mediaBase}${file.url}`;
  }

  function renderCompactEventCard(event) {
    const image = getMediaUrl(event.cover) || 'image/background.png';
    const category = event.category || 'other';

    return `
      <div class="group bg-white dark:bg-primary/5 rounded-2xl overflow-hidden border border-primary/5 shadow-sm hover:shadow-xl transition-all">
        <div class="h-48 overflow-hidden">
          <img alt="${escapeHtml(event.title)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${escapeAttr(image)}"/>
        </div>
        <div class="p-6">
          <span class="text-primary text-xs font-bold uppercase tracking-tighter">${categoryLabels[category] || categoryLabels.other}</span>
          <h3 class="text-lg font-bold mt-2 mb-1">${escapeHtml(event.title)}</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-2">${formatDate(event.date)}</p>
          <a class="text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all" href="events.html">Читати далі <span class="material-symbols-outlined text-sm">arrow_forward</span></a>
        </div>
      </div>
    `;
  }

  function renderEventCard(event) {
    const image = getMediaUrl(event.cover) || 'image/background.png';
    const category = event.category || 'other';

    return `
      <article class="group overflow-hidden rounded-xl border border-primary/10 bg-white dark:bg-slate-800/50 transition-all hover:shadow-lg">
        <div class="relative h-48 w-full overflow-hidden">
          <img class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="${escapeHtml(event.title)}" src="${escapeAttr(image)}"/>
          <span class="absolute left-4 top-4 rounded-lg ${categoryColors[category] || categoryColors.other} px-3 py-1 text-xs font-bold text-white">${categoryLabels[category] || categoryLabels.other}</span>
        </div>
        <div class="flex flex-col p-6">
          <div class="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            <span>${formatDate(event.date)}</span>
          </div>
          <h3 class="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">${escapeHtml(event.title)}</h3>
          <p class="mb-6 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">${escapeHtml(event.summary || '')}</p>
          <a class="mt-auto inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all" href="#">
            Читати більше
            <span class="material-symbols-outlined text-lg">arrow_forward</span>
          </a>
        </div>
      </article>
    `;
  }

  function renderPublicDocumentCard(document) {
    const fileUrl = getMediaUrl(document.file);
    const href = fileUrl || document.url || '#';
    const action = document.type === 'pdf' ? 'Завантажити PDF' : 'Переглянути';
    const actionIcon = document.type === 'pdf' ? 'picture_as_pdf' : 'visibility';

    return `
      <div class="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
        <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <span class="material-symbols-outlined">${escapeHtml(document.icon || 'description')}</span>
        </div>
        <h3 class="mb-2 text-lg font-bold text-slate-900 dark:text-white leading-tight">${escapeHtml(document.title)}</h3>
        <p class="mb-6 flex-grow text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(document.description || '')}</p>
        <a class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" href="${escapeAttr(href)}">
          <span class="material-symbols-outlined text-lg">${actionIcon}</span>
          ${action}
        </a>
      </div>
    `;
  }

  function renderRequestCard() {
    return `
      <div class="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-6 transition-all hover:border-primary/40 hover:bg-primary/10">
        <div class="mb-4 text-center">
          <span class="material-symbols-outlined text-4xl text-primary/60">help_outline</span>
        </div>
        <h3 class="mb-3 text-center text-lg font-bold text-slate-900 dark:text-white">Залишилися питання?</h3>
        <p class="mb-5 text-center text-sm text-slate-600 dark:text-slate-400">Якщо ви не знайшли потрібну інформацію, ви можете надіслати офіційний запит до адміністрації.</p>
        <a class="w-full rounded-lg bg-primary py-2.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90" href="mailto:bilousnew@ukr.net">Надіслати запит</a>
      </div>
    `;
  }

  function formatDate(value) {
    if (!value) return '';

    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }
})();
