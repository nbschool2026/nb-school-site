import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { canonicalUrl, NAV_PAGES, SCHOOL_NAME, schoolSchema, SEO_PAGES, SITE_URL } from '../src/lib/seo-data.js';

const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');
const socialImage = `${SITE_URL}/novobilouskyi-lyceum.webp`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function headFor(path, page, extraSchema = []) {
  const url = canonicalUrl(path);
  const schemas = [
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SCHOOL_NAME, url: `${SITE_URL}/`, inLanguage: 'uk' },
    schoolSchema(),
    ...(path === '/' ? [] : [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: SCHOOL_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.heading, item: url },
    ] }]),
    ...extraSchema,
  ];
  return [
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(SCHOOL_NAME)}" />`,
    '<meta property="og:locale" content="uk_UA" />',
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${socialImage}" />`,
    '<meta property="og:image:type" content="image/webp" />',
    '<meta property="og:image:width" content="1264" />',
    '<meta property="og:image:height" content="848" />',
    `<meta property="og:image:alt" content="Будівля Новобілоуського ліцею" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${socialImage}" />`,
    ...schemas.map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`),
  ].join('\n    ');
}

function fallbackFor(page, event = null) {
  const nav = NAV_PAGES.map((path) => `<a href="${canonicalUrl(path)}">${escapeHtml(SEO_PAGES[path].heading)}</a>`).join(' · ');
  const body = event
    ? [event.summary, event.content].filter(Boolean).map((value) => `<p>${escapeHtml(value)}</p>`).join('')
    : `<p>${escapeHtml(page.intro)}</p>`;
  return `<main class="seo-fallback"><h1>${escapeHtml(page.heading)}</h1>${body}<nav aria-label="Розділи сайту">${nav}</nav></main>`;
}

async function writePage(path, page, event = null) {
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace('<!-- SEO_HEAD -->', headFor(path, page))
    .replace('<!-- SEO_FALLBACK -->', fallbackFor(page, event));
  const directory = path === '/' ? dist : new URL(`${path.slice(1)}/`, dist);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), html);
}

const urls = [];
for (const [path, page] of Object.entries(SEO_PAGES)) {
  await writePage(path, page);
  urls.push(path);
}

// Event pages are generated when the CMS is reachable during the production build.
// A failed CMS request must not make an otherwise valid frontend build unusable.
const cmsBase = (process.env.SEO_CMS_URL || 'http://127.0.0.1:1337').replace(/\/$/, '');
try {
  let pageNumber = 1;
  let pageCount = 1;
  do {
    const query = new URLSearchParams({ locale: 'uk', 'pagination[page]': String(pageNumber), 'pagination[pageSize]': '100' });
    const response = await fetch(`${cmsBase}/api/events?${query}`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`CMS HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error('CMS event response has no data array');
    for (const item of payload.data) {
      const event = item.attributes ? { ...item.attributes, id: item.id } : item;
      if (!/^[a-z0-9-]+$/.test(event.slug || '')) continue;
      const path = `/events/${event.slug}`;
      const description = String(event.summary || event.content || `Подія Новобілоуського ліцею: ${event.title}`).replace(/\s+/g, ' ').slice(0, 165);
      const seo = { title: `${event.title} | ${SCHOOL_NAME}`, description, heading: event.title };
      await writePage(path, seo, event);
      urls.push(path);
    }
    pageCount = payload.meta?.pagination?.pageCount ?? 1;
    pageNumber += 1;
  } while (pageNumber <= pageCount);
} catch (error) {
  console.warn(`SEO: event prerender skipped (${error.message}). Run the build with CMS available to include event URLs.`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${escapeHtml(canonicalUrl(path))}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('sitemap.xml', dist), sitemap);
console.log(`SEO: generated ${urls.length} indexable HTML pages and sitemap.xml`);
