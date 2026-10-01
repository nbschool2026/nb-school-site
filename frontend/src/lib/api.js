const API_BASE = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
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
