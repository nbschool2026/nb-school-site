import { mediaUrl, mergeLocalizedRecords } from './api.js';

const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';

export async function fetchAllEvents(locale = 'uk') {
  if (locale !== 'en') return fetchEventsForLocale('uk');
  const [ukrainian, translated] = await Promise.all([
    fetchEventsForLocale('uk'), fetchEventsForLocale('en'),
  ]);
  return mergeLocalizedRecords(ukrainian, translated).sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0));
}

async function fetchEventsForLocale(locale) {
  const events = [];
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      'populate[0]': 'cover',
      'populate[1]': 'photos',
      'sort[0]': 'date:desc',
      'sort[1]': 'id:desc',
      'pagination[page]': String(page),
      'pagination[pageSize]': '100',
      locale,
    });
    const response = await fetch(`${API_BASE}/events?${query}`);
    if (!response.ok) throw new Error(`Не вдалося завантажити події (${response.status}).`);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error('Неправильна відповідь CMS.');
    events.push(...payload.data.map(normalizeEvent));
    pageCount = payload.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return events;
}

export async function fetchEventBySlug(slug, locale = 'uk') {
  const [ukrainian, translated] = await Promise.all([
    fetchEventsForLocale('uk'), fetchEventsForLocale('en'),
  ]);
  const source = [...ukrainian, ...translated].find((event) => event.slug === slug);
  if (!source) return null;
  const match = (locale === 'en' ? translated : ukrainian).find((event) => event.documentId === source.documentId);
  return match || { ...source, _fallbackLocale: source.locale || 'uk' };
}

function normalizeEvent(entity) {
  return entity?.attributes ? { id: entity.id, ...entity.attributes } : entity;
}

export function eventPhotos(event) {
  const photos = Array.isArray(event?.photos) ? event.photos : event?.photos?.data || [];
  const gallery = photos.map((photo) => mediaUrl(photo)).filter(Boolean);
  const cover = mediaUrl(event?.cover);
  return gallery.length ? gallery : cover ? [cover] : [];
}

export function youtubeEmbedUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')
        ? url.pathname.split('/')[2]
        : url.pathname === '/watch' ? url.searchParams.get('v') : null;
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function eventVideoEmbedUrl(value) {
  const youtube = youtubeEmbedUrl(value);
  if (youtube) return youtube;
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'facebook.com' && host !== 'fb.watch') return null;
    if (!/(^|\/)(reel|videos|share\/v|watch)(\/|$)/i.test(url.pathname)) return null;
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false&width=500`;
  } catch {
    return null;
  }
}
