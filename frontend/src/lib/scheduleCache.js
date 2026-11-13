const prefix = 'nb-school-schedule-v1-';

function key(locale) {
  return `${prefix}${locale}`;
}

export function scheduleHash(records) {
  const text = JSON.stringify(records);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}-${(hash >>> 0).toString(16)}`;
}

export function readScheduleCache(locale) {
  try {
    const cached = JSON.parse(localStorage.getItem(key(locale)) || 'null');
    if (Array.isArray(cached?.records) && cached.records.length && cached.hash === scheduleHash(cached.records)) {
      return cached;
    }
  } catch {
    // Storage may be unavailable or contain an old format.
  }
  return null;
}

export function writeScheduleCache(locale, records) {
  if (!records.length) return;
  try {
    const hash = scheduleHash(records);
    if (readScheduleCache(locale)?.hash !== hash) {
      localStorage.setItem(key(locale), JSON.stringify({ hash, records }));
    }
  } catch {
    // A full or disabled storage must not prevent the schedule from rendering.
  }
}

export function clearScheduleCache(locale) {
  try {
    localStorage.removeItem(key(locale));
  } catch {
    // Ignore unavailable storage.
  }
}
