import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SEO_PAGES, canonicalUrl } from '../src/lib/seo-data.js';

const dist = new URL('../dist/', import.meta.url);
const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
const titles = new Set();

for (const [path, page] of Object.entries(SEO_PAGES)) {
  const file = path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
  const html = await readFile(new URL(file, dist), 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert.equal(title, page.title, `${path}: title`);
  assert(!titles.has(title), `${path}: duplicate title`);
  titles.add(title);
  assert(html.includes(`<link rel="canonical" href="${canonicalUrl(path)}" />`), `${path}: canonical`);
  assert(html.includes(`<meta property="og:url" content="${canonicalUrl(path)}" />`), `${path}: og:url`);
  assert(html.includes('<meta property="og:image" content="https://nbosvita.cn.ua/novobilouskyi-lyceum.webp" />'), `${path}: social image`);
  assert.equal((html.match(/<h1>/g) || []).length, 1, `${path}: fallback H1`);
  assert(html.includes(page.intro), `${path}: fallback content`);
  assert(sitemap.includes(`<loc>${canonicalUrl(path)}</loc>`), `${path}: sitemap`);
}

for (const file of ['favicon.svg', 'novobilouskyi-lyceum.webp', 'robots.txt']) {
  assert((await readFile(new URL(file, dist))).length > 0, `${file}: missing asset`);
}
console.log(`SEO: verified ${titles.size} static pages, sitemap and social assets`);
