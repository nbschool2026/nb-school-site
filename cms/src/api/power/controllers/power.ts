import crypto from 'node:crypto';

let tokenCache: { token: string; expiresAt: number } | null = null;
function env(name: string) { return String(process.env[name] || '').trim(); }
function numberFrom(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function powerKw(value: unknown) { const number = numberFrom(value); return number == null ? null : number / 1000; }
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
  async history(ctx: any) {
    const baseUrl = (env('DEYE_BASE_URL') || 'https://eu1-developer.deyecloud.com/v1.0').replace(/\/$/, '');
    const stationId = env('DEYE_STATION_ID');
    if (!env('DEYE_APP_ID') || !env('DEYE_APP_SECRET') || !env('DEYE_EMAIL') || !env('DEYE_PASSWORD') || !stationId) { ctx.status = 503; ctx.body = { code: 'not_configured', error: { message: 'Deye Cloud is not configured.' } }; return; }
    try {
      const hours = Math.min(24, Math.max(1, Number(ctx.query?.hours || 6) || 6));
      const endTimestamp = Math.floor(Date.now() / 1000);
      const startTimestamp = endTimestamp - hours * 3600;
      const token = await deyeToken(baseUrl);
      const response = await fetch(`${baseUrl}/station/history/power`, { method: 'POST', headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: Number(stationId) || stationId, startTimestamp, endTimestamp }) });
      const payload: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.msg || 'Deye history request failed');
      const rows = payload?.stationDataItems || payload?.data?.stationDataItems || payload?.data || [];
      ctx.body = { data: (Array.isArray(rows) ? rows : []).map((row: any) => ({
        timestamp: timestampIso(row.timeStamp || row.timestamp || row.dateTime || row.lastUpdateTime),
        consumptionPower: powerKw(row.consumptionPower ?? row.usePower),
      })).filter((row: any) => row.timestamp) };
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
      const gridWatts = gridValue && gridValue !== 0 ? gridValue : (wireValue && wireValue !== 0 ? wireValue : purchaseValue);
      const gridStatus = typeof gridRaw === 'boolean' ? (gridRaw ? 'online' : 'offline') : gridRaw != null ? (String(gridRaw).toLowerCase().match(/off|out|disconnect|false/) ? 'offline' : 'online') : gridWatts != null ? (Math.abs(gridWatts) > 1 ? 'online' : 'offline') : 'unknown';
      ctx.body = { data: { stationName: findValue(raw, ['stationName', 'name']) || '', gridStatus, gridPower: powerKw(gridWatts), solarPower: powerKw(findValue(raw, ['solarPower', 'generationPower', 'pvPower', 'ppv'])), loadPower: powerKw(findValue(raw, ['loadPower', 'consumptionPower', 'usePower', 'pload'])), batteryPower: powerKw(findValue(raw, ['batteryPower', 'batteryW', 'pbattery'])), batterySoc: numberFrom(findValue(raw, ['batterySoc', 'batterySOC', 'soc'])), updatedAt: timestampIso(findValue(raw, ['lastUpdateTime', 'updateTime'])) } };
    } catch { ctx.status = 502; ctx.body = { code: 'deye_error', error: { message: 'Deye Cloud request failed.' } }; }
  },
};
