import crypto from 'node:crypto';

let tokenCache: { token: string; expiresAt: number } | null = null;
let weeklyCache: { key: string; expiresAt: number; data: any[] } | null = null;
const attendanceAttempts = new Map<string, { count: number; expiresAt: number }>();
function env(name: string) { return String(process.env[name] || '').trim(); }
function numberFrom(value: unknown) { if (value == null || value === '' || typeof value === 'boolean') return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function powerKw(value: unknown) { const number = numberFrom(value); return number == null ? null : number / 1000; }
// wirePower is the signed exchange with the grid. Keep missing measurements
// distinct from a measured zero; import/export counters are fallbacks only.
function gridExchangeKw(row: any) {
  const wire = numberFrom(row.wirePower);
  if (wire != null) return Math.abs(wire) / 1000;
  const values = [numberFrom(row.purchasePower), numberFrom(row.gridPower)].filter((value): value is number => value != null);
  return values.length ? Math.max(...values.map(Math.abs)) / 1000 : null;
}
function timestampIso(value: unknown) {
  if (value == null || value === '') return new Date().toISOString();
  const number = Number(value);
  if (Number.isFinite(number)) return new Date(number < 1e12 ? number * 1000 : number).toISOString();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}
function findValue(source: unknown, names: string[]): unknown {
  if (!source || typeof source !== 'object') return undefined;
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) if (wanted.has(key.toLowerCase())) return value;
  for (const value of Object.values(source as Record<string, unknown>)) { const nested = findValue(value, names); if (nested !== undefined) return nested; }
  return undefined;
}
async function deyeToken(baseUrl: string) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const response = await fetch(`${baseUrl}/account/token?appId=${encodeURIComponent(env('DEYE_APP_ID'))}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appSecret: env('DEYE_APP_SECRET'), email: env('DEYE_EMAIL'), password: crypto.createHash('sha256').update(env('DEYE_PASSWORD')).digest('hex') }) });
  const payload: any = await response.json().catch(() => ({}));
  const token = payload?.data?.accessToken || payload?.accessToken;
  if (!response.ok || !token) throw new Error(payload?.msg || 'Deye token request failed');
  const expiresIn = Number(payload?.data?.expiresIn || payload?.expiresIn || payload?.data?.expireIn || 3600);
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return tokenCache.token;
}
export default {
  async attendanceAccess(ctx: any) {
    ctx.set('Cache-Control', 'no-store');
    const password = env('ATTENDANCE_PASSWORD');
    const driveUrl = env('ATTENDANCE_DRIVE_URL');
    if (!password || !/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+(?:\?.*)?$/.test(driveUrl)) {
      ctx.status = 503;
      ctx.body = { error: 'attendance_not_configured' };
      return;
    }

    // Caddy forwards the original client address to Strapi.
    const client = String(ctx.get('x-forwarded-for') || ctx.ip || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const attempt = attendanceAttempts.get(client);
    if (attempt && attempt.expiresAt > now && attempt.count >= 5) {
      ctx.status = 429;
      ctx.body = { error: 'too_many_attempts' };
      return;
    }
    const submitted = ctx.request.body?.password;
    const submittedHash = crypto.createHash('sha256').update(typeof submitted === 'string' ? submitted : '').digest();
    const expectedHash = crypto.createHash('sha256').update(password).digest();
    if (!crypto.timingSafeEqual(submittedHash, expectedHash)) {
      const count = attempt && attempt.expiresAt > now ? attempt.count + 1 : 1;
      attendanceAttempts.set(client, { count, expiresAt: now + 15 * 60_000 });
      ctx.status = 401;
      ctx.body = { error: 'invalid_password' };
      return;
    }
    attendanceAttempts.delete(client);
    ctx.body = { url: driveUrl };
  },

  async history(ctx: any) {
    const baseUrl = (env('DEYE_BASE_URL') || 'https://eu1-developer.deyecloud.com/v1.0').replace(/\/$/, '');
    const stationId = env('DEYE_STATION_ID');
    if (!env('DEYE_APP_ID') || !env('DEYE_APP_SECRET') || !env('DEYE_EMAIL') || !env('DEYE_PASSWORD') || !stationId) { ctx.status = 503; ctx.body = { code: 'not_configured', error: { message: 'Deye Cloud is not configured.' } }; return; }
    try {
      const hours = Math.min(168, Math.max(1, Number(ctx.query?.hours || 6) || 6));
      const cacheKey = `${baseUrl}:${stationId}:${env('DEYE_APP_ID')}`;
      if (hours === 168 && weeklyCache?.key === cacheKey && weeklyCache.expiresAt > Date.now()) {
        ctx.body = { data: weeklyCache.data }; return;
      }
      const endTimestamp = Math.floor(Date.now() / 1000);
      const startTimestamp = endTimestamp - hours * 3600;
      const token = await deyeToken(baseUrl);
      const rows: any[] = [];
      // Keep vendor requests bounded to one day, including for weekly history.
      for (let start = startTimestamp; start < endTimestamp; start += 86400) {
        const response = await fetch(`${baseUrl}/station/history/power`, { method: 'POST', headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: Number(stationId) || stationId, startTimestamp: start, endTimestamp: Math.min(start + 86400, endTimestamp) }) });
        const payload: any = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) throw new Error(payload?.msg || 'Deye history request failed');
        const items = payload?.stationDataItems || payload?.data?.stationDataItems || payload?.data || [];
        if (Array.isArray(items)) rows.push(...items);
      }
      const normalized = rows.map((row: any) => ({
        timestamp: timestampIso(row.timeStamp || row.timestamp || row.dateTime || row.lastUpdateTime),
        consumptionPower: powerKw(row.consumptionPower ?? row.usePower),
        gridPower: gridExchangeKw(row),
      }));
      ctx.body = { data: [...new Map(normalized.map((row) => [row.timestamp, row])).values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) };
      if (hours === 168) weeklyCache = { key: cacheKey, expiresAt: Date.now() + 5 * 60_000, data: ctx.body.data };
    } catch { ctx.status = 502; ctx.body = { code: 'deye_error', error: { message: 'Deye Cloud history request failed.' } }; }
  },

  async status(ctx: any) {
    const baseUrl = (env('DEYE_BASE_URL') || 'https://eu1-developer.deyecloud.com/v1.0').replace(/\/$/, '');
    const stationId = env('DEYE_STATION_ID');
    if (!env('DEYE_APP_ID') || !env('DEYE_APP_SECRET') || !env('DEYE_EMAIL') || !env('DEYE_PASSWORD') || !stationId) { ctx.status = 503; ctx.body = { code: 'not_configured', error: { message: 'Deye Cloud is not configured.' } }; return; }
    try {
      const token = await deyeToken(baseUrl);
      const response = await fetch(`${baseUrl}/station/latest`, { method: 'POST', headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: Number(stationId) || stationId }) });
      const payload: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.msg || 'Deye status request failed');
      const raw = payload?.data || payload;
      const gridRaw = findValue(raw, ['gridStatus', 'gridState', 'onGrid', 'gridConnected', 'gridOnline']);
      const gridValue = numberFrom(findValue(raw, ['gridPower', 'grid_power', 'pgrid', 'gridW']));
      const wireValue = numberFrom(findValue(raw, ['wirePower', 'wire_power']));
      const purchaseValue = numberFrom(findValue(raw, ['purchasePower', 'purchase_power']));
      // Prefer a nonzero measurement, but retain a measured zero when other
      // fields are absent. Zero is valid telemetry, not an unknown value.
      const gridWatts = [gridValue, wireValue, purchaseValue].find((value) => value != null && value !== 0)
        ?? gridValue ?? wireValue ?? purchaseValue;
      const gridStatus = typeof gridRaw === 'boolean' ? (gridRaw ? 'online' : 'offline') : gridRaw != null ? (String(gridRaw).toLowerCase().match(/off|out|disconnect|false/) ? 'offline' : 'online') : gridWatts != null ? (Math.abs(gridWatts) > 1 ? 'online' : 'offline') : 'unknown';
      ctx.body = { data: { stationName: findValue(raw, ['stationName', 'name']) || '', gridStatus, gridPower: powerKw(gridWatts), solarPower: powerKw(findValue(raw, ['solarPower', 'generationPower', 'pvPower', 'ppv'])), loadPower: powerKw(findValue(raw, ['loadPower', 'consumptionPower', 'usePower', 'pload'])), batteryPower: powerKw(findValue(raw, ['batteryPower', 'batteryW', 'pbattery'])), batterySoc: numberFrom(findValue(raw, ['batterySoc', 'batterySOC', 'soc'])), updatedAt: timestampIso(findValue(raw, ['lastUpdateTime', 'updateTime'])) } };
    } catch { ctx.status = 502; ctx.body = { code: 'deye_error', error: { message: 'Deye Cloud request failed.' } }; }
  },
};
