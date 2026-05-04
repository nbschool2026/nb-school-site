const API_BASE = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
const MEDIA_BASE = API_BASE.replace(/\/api\/?$/, '');

export async function fetchCollection(path, query = '') {
  try {
    const url = `${API_BASE}${path}${query ? `?${query}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const payload = await response.json();
    return Array.isArray(payload.data) ? payload.data.map(normalizeEntity) : [];
  } catch {
    return [];
  }
}

export async function fetchSingle(path, query = '') {
  try {
    const url = `${API_BASE}${path}${query ? `?${query}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const payload = await response.json();
    return payload.data ? normalizeEntity(payload.data) : null;
  } catch {
    return null;
  }
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
