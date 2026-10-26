import React, { useCallback, useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { useLocale } from '../lib/locale.jsx';

const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';

function valueWithUnit(value, unit = 'кВт') {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} ${unit}` : `${value} ${unit}`;
}

export default function PowerPage() {
  const { t, dateLocale } = useLocale();
  const [state, setState] = useState({ status: 'loading', data: null });
  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    try {
      const response = await fetch(`${API_BASE}/power/status`, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 503 && payload?.code === 'not_configured') { setState({ status: 'not-configured', data: null }); return; }
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message || 'power');
      setState({ status: 'ready', data: payload.data });
    } catch { setState({ status: 'error', data: null }); }
  }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer); }, [load]);
  const data = state.data || {};
  const powerOn = data.gridStatus === 'online';
  const powerUnknown = data.gridStatus === 'unknown';
  return <main>
    <section className="info-hero power-hero"><div className="container"><div className="pill"><MaterialIcon name="bolt" /> {t('Світло')}</div><h1>{t('Електропостачання школи')}</h1><p>{t('Стан електромережі та сонячної станції в реальному часі.')}</p></div></section>
    <section className="page-section"><div className="container power-page">
      {state.status === 'loading' && <div className="power-message" role="status"><MaterialIcon name="sync" /> Завантаження…</div>}
      {state.status === 'not-configured' && <div className="power-message" role="status"><MaterialIcon name="settings" /><p>{t('Інтеграцію Deye Cloud ще не налаштовано на сервері.')}</p></div>}
      {state.status === 'error' && <div className="power-message power-message-error" role="alert"><MaterialIcon name="cloud_off" /><p>{t('Не вдалося отримати дані Deye Cloud.')}</p><button type="button" className="soft-button" onClick={load}>{t('Оновити')}</button></div>}
      {state.status === 'ready' && <><div className={`power-status-card ${powerUnknown ? 'is-unknown' : powerOn ? 'is-online' : 'is-offline'}`}><MaterialIcon name={powerOn ? 'check_circle' : 'warning'} /><div><strong>{t(powerUnknown ? 'Стан невідомий' : powerOn ? 'Є світло' : 'Немає світла')}</strong><span>{data.stationName || 'Deye Cloud'}</span></div></div><div className="power-metrics"><article><MaterialIcon name="solar_power" /><span>{t('Генерація')}</span><strong>{valueWithUnit(data.solarPower)}</strong></article><article><MaterialIcon name="electric_bolt" /><span>{t('Мережа')}</span><strong>{valueWithUnit(data.gridPower)}</strong></article><article><MaterialIcon name="home" /><span>{t('UPS-навантаження')}</span><strong>{valueWithUnit(data.loadPower)}</strong></article><article><MaterialIcon name="battery_full" /><span>{t('Батарея')}</span><strong>{data.batterySoc == null ? '—' : `${data.batterySoc}%`}</strong></article></div><p className="power-updated">{t('Оновлено')}: {data.updatedAt ? new Date(data.updatedAt).toLocaleString(dateLocale) : '—'}</p></>}
    </div></section>
  </main>;
}
