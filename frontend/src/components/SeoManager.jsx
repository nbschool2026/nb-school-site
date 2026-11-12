import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocale } from '../lib/locale.jsx';
import { canonicalUrl, schoolSchema, SCHOOL_NAME, SEO_PAGES, SITE_URL } from '../lib/seo-data.js';

const socialImage = `${SITE_URL}/novobilouskyi-lyceum.webp`;

function setMeta(key, value, kind = 'name') {
  let node = document.head.querySelector(`meta[${kind}="${key}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(kind, key);
    document.head.append(node);
  }
  node.content = value;
}

export function updateSeo(path, page, locale = 'uk') {
  const translated = locale === 'en' ? page.en : null;
  const title = translated?.title || page.title;
  const description = translated?.description || page.description;
  const url = canonicalUrl(path);
  document.title = title;
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = url;
  setMeta('description', description);
  setMeta('robots', 'index, follow, max-image-preview:large');
  setMeta('og:type', 'website', 'property');
  setMeta('og:site_name', SCHOOL_NAME, 'property');
  setMeta('og:locale', locale === 'en' ? 'en_GB' : 'uk_UA', 'property');
  setMeta('og:title', title, 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:url', url, 'property');
  setMeta('og:image', socialImage, 'property');
  setMeta('og:image:type', 'image/webp', 'property');
  setMeta('og:image:width', '1264', 'property');
  setMeta('og:image:height', '848', 'property');
  setMeta('og:image:alt', 'Будівля Новобілоуського ліцею', 'property');
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', socialImage);

  document.head.querySelectorAll('script[data-seo-schema], script[type="application/ld+json"]').forEach((node) => node.remove());
  const schemas = [
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SCHOOL_NAME, url: `${SITE_URL}/`, inLanguage: 'uk' },
    schoolSchema(),
    ...(path === '/' ? [] : [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: SCHOOL_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.heading, item: url },
    ] }]),
  ];
  for (const schema of schemas) {
    const node = document.createElement('script');
    node.type = 'application/ld+json';
    node.dataset.seoSchema = '';
    node.textContent = JSON.stringify(schema);
    document.head.append(node);
  }
}

export default function SeoManager() {
  const { pathname } = useLocation();
  const { locale } = useLocale();
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    const page = SEO_PAGES[path] || (path.startsWith('/events/') ? {
      title: `Подія | ${SCHOOL_NAME}`,
      description: `Новини та події Новобілоуського ліцею в селі Новий Білоус.`,
      heading: 'Подія',
    } : SEO_PAGES['/']);
    updateSeo(path, page, locale);
  }, [pathname, locale]);
  return null;
}
