const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';
const MEDIA_BASE = API_BASE.replace(/\/api\/?$/, '');

export async function fetchCollection(path, query = '') {
  try {
    return await fetchCollectionStrict(path, query);
  } catch {
    return [];
  }
}

export async function fetchSingle(path, query = '') {
  try {
    return await fetchSingleStrict(path, query);
  } catch {
    return null;
  }
}

export async function fetchCollectionStrict(path, query = '') {
  const payload = await requestJson(path, query);
  if (!Array.isArray(payload.data)) throw new Error('Неправильна відповідь CMS.');
  return payload.data.map(normalizeEntity);
}

export async function fetchSingleStrict(path, query = '') {
  const payload = await requestJson(path, query);
  return payload.data ? normalizeEntity(payload.data) : null;
}

export async function fetchCollectionLocalized(path, query, locale) {
  if (locale !== 'en') return fetchCollectionStrict(path, withLocale(query, 'uk'));
  const [ukrainian, translated] = await Promise.all([
    fetchCollectionStrict(path, withLocale(query, 'uk')),
    fetchCollectionStrict(path, withLocale(query, 'en')),
  ]);
  return mergeLocalizedRecords(ukrainian, translated);
}

export async function fetchSingleLocalized(path, query, locale) {
  if (locale === 'en') {
    const translated = await fetchSingleStrict(path, withLocale(query, 'en'));
    if (translated) return translated;
  }
  const ukrainian = await fetchSingleStrict(path, withLocale(query, 'uk'));
  return locale === 'en' && ukrainian ? { ...ukrainian, _fallbackLocale: 'uk' } : ukrainian;
}

export function withLocale(query, locale) {
  return `${query ? `${query}&` : ''}locale=${locale}`;
}

export function mergeLocalizedRecords(ukrainian, translated) {
  const translatedById = new Map(translated.map((item) => [item.documentId, item]));
  const used = new Set();
  const records = ukrainian.map((item) => {
    const match = translatedById.get(item.documentId);
    if (match) {
      used.add(item.documentId);
      return match;
    }
    return { ...item, _fallbackLocale: 'uk' };
  });
  return records.concat(translated.filter((item) => !used.has(item.documentId)));
}

async function requestJson(path, query) {
  const url = `${API_BASE}${path}${query ? `?${query}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CMS повернула ${response.status}.`);
  return response.json();
}

export function mediaUrl(media, fallback = '') {
  const file = media?.data?.attributes || media;
  if (!file?.url) return fallback;

  return file.url.startsWith('http') ? file.url : `${MEDIA_BASE}${file.url}`;
}

function normalizeEntity(entity) {
  if (entity?.attributes) {
    return { id: entity.id, documentId: entity.documentId, ...entity.attributes };
  }

  return entity || {};
}
