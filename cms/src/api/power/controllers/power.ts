import crypto from 'node:crypto';

let tokenCache: { token: string; expiresAt: number } | null = null;
function env(name: string) { return String(process.env[name] || '').trim(); }
function numberFrom(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : null; }
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
  if (!response.ok || !payload?.data?.accessToken) throw new Error(payload?.msg || 'Deye token request failed');
  const expiresIn = Number(payload.data.expiresIn || payload.data.expireIn || 3600);
  tokenCache = { token: payload.data.accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  return tokenCache.token;
}
export default {
  async status(ctx: any) {
    const baseUrl = (env('DEYE_BASE_URL') || 'https://eu1-developer.deyecloud.com/v1.0').replace(/\/$/, '');
    const stationId = env('DEYE_STATION_ID');
    if (!env('DEYE_APP_ID') || !env('DEYE_APP_SECRET') || !env('DEYE_EMAIL') || !env('DEYE_PASSWORD') || !stationId) { ctx.status = 503; ctx.body = { code: 'not_configured', error: { message: 'Deye Cloud is not configured.' } }; return; }
    try {
      const token = await deyeToken(baseUrl);
      const response = await fetch(`${baseUrl}/station/latest`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: Number(stationId) || stationId }) });
      const payload: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.msg || 'Deye status request failed');
      const raw = payload?.data || payload;
      const gridRaw = findValue(raw, ['gridStatus', 'gridState', 'onGrid', 'gridConnected', 'gridOnline']);
      const gridPower = numberFrom(findValue(raw, ['gridPower', 'grid_power', 'pgrid', 'gridW']));
      const gridStatus = typeof gridRaw === 'boolean' ? (gridRaw ? 'online' : 'offline') : gridRaw != null ? (String(gridRaw).toLowerCase().match(/off|out|disconnect|false/) ? 'offline' : 'online') : gridPower != null ? (gridPower > 0 ? 'online' : 'offline') : 'unknown';
      ctx.body = { data: { stationName: findValue(raw, ['stationName', 'name']) || '', gridStatus, gridPower, solarPower: numberFrom(findValue(raw, ['solarPower', 'generationPower', 'pvPower', 'ppv'])), loadPower: numberFrom(findValue(raw, ['loadPower', 'consumptionPower', 'pload'])), batteryPower: numberFrom(findValue(raw, ['batteryPower', 'batteryW', 'pbattery'])), batterySoc: numberFrom(findValue(raw, ['batterySoc', 'batterySOC', 'soc'])), updatedAt: new Date().toISOString() } };
    } catch { ctx.status = 502; ctx.body = { code: 'deye_error', error: { message: 'Deye Cloud request failed.' } }; }
  },
};
