import React, { useCallback, useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { useLocale } from '../lib/locale.jsx';

const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';
function valueWithUnit(value, unit = 'кВт') { if (value == null || value === '') return '—'; const number = Number(value); return Number.isFinite(number) ? `${number.toFixed(2)} ${unit}` : `${value} ${unit}`; }

function ConsumptionChart({ rows, dateLocale, t }) {
  const points = rows.map((row) => ({ ...row, value: Number(row.consumptionPower) })).filter((row) => Number.isFinite(row.value));
  if (!points.length) return <p className="power-chart-empty">{t('Немає історичних даних.')}</p>;
  const width = 900; const height = 260; const padX = 72; const padY = 26; const max = Math.max(1, ...points.map((row) => row.value));
  const x = (index) => padX + (points.length === 1 ? 0 : index * (width - padX * 2) / (points.length - 1));
  const y = (value) => height - padY - (value / max) * (height - padY * 2);
  const path = points.map((row, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(row.value).toFixed(1)}`).join(' ');
  const gridSteps = [0, 1, 2, 3, 4].map((step) => ({ value: max * step / 4, y: y(max * step / 4) }));
  const labels = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];
  return <div className="power-chart-wrap"><svg className="power-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('Споживання за останні 6 годин')}>{gridSteps.map((step) => <g key={step.value}><line x1={padX} y1={step.y} x2={width - padX} y2={step.y} className="power-chart-grid" /><text x={padX - 8} y={step.y + 4} textAnchor="end" className="power-chart-y-label">{step.value.toFixed(1)} кВт</text></g>)}<line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="power-chart-axis" /><line x1={padX} y1={padY} x2={padX} y2={height - padY} className="power-chart-axis" /><path d={path} className="power-chart-line" /><path d={`${path} L ${x(points.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`} className="power-chart-area" />{points.map((row, index) => <circle key={`${row.timestamp}-${index}`} cx={x(index)} cy={y(row.value)} r="3" className="power-chart-dot" />)}{labels.map((row, index) => <text key={`${row.timestamp}-${index}`} x={x(points.indexOf(row))} y={height - 7} textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'} className="power-chart-label">{new Date(row.timestamp).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</text>)}</svg></div>;
}

export default function PowerPage() {
  const { t, dateLocale } = useLocale();
  const [state, setState] = useState({ status: 'loading', data: null, history: [] });
  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    try {
      const [statusResponse, historyResponse] = await Promise.all([fetch(`${API_BASE}/power/status`, { headers: { Accept: 'application/json' } }), fetch(`${API_BASE}/power/history?hours=6`, { headers: { Accept: 'application/json' } })]);
      const payload = await statusResponse.json().catch(() => ({}));
      const historyPayload = await historyResponse.json().catch(() => ({}));
      if (statusResponse.status === 503 && payload?.code === 'not_configured') { setState({ status: 'not-configured', data: null, history: [] }); return; }
      if (!statusResponse.ok || !payload?.data) throw new Error(payload?.error?.message || 'power');
      setState({ status: 'ready', data: payload.data, history: Array.isArray(historyPayload?.data) ? historyPayload.data : [] });
    } catch { setState({ status: 'error', data: null, history: [] }); }
  }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer); }, [load]);
  const data = state.data || {};
  const powerOn = data.gridStatus === 'online'; const powerUnknown = data.gridStatus === 'unknown';
  return <main><section className="info-hero power-hero"><div className="container"><div className="pill"><MaterialIcon name="bolt" /> {t('Світло')}</div><h1>{t('Електропостачання школи')}</h1><p>{t('Стан електромережі та сонячної станції в реальному часі.')}</p></div></section><section className="page-section"><div className="container power-page">
    {state.status === 'loading' && <div className="power-message" role="status"><MaterialIcon name="sync" /> Завантаження…</div>}
    {state.status === 'not-configured' && <div className="power-message" role="status"><MaterialIcon name="settings" /><p>{t('Інтеграцію Deye Cloud ще не налаштовано на сервері.')}</p></div>}
    {state.status === 'error' && <div className="power-message power-message-error" role="alert"><MaterialIcon name="cloud_off" /><p>{t('Не вдалося отримати дані Deye Cloud.')}</p><button type="button" className="soft-button" onClick={load}>{t('Оновити')}</button></div>}
    {state.status === 'ready' && <><div className={`power-status-card ${powerUnknown ? 'is-unknown' : powerOn ? 'is-online' : 'is-offline'}`}><MaterialIcon name={powerOn ? 'check_circle' : 'warning'} /><div><strong>{t(powerUnknown ? 'Стан невідомий' : powerOn ? 'Є світло' : 'Немає світла')}</strong><span>{data.stationName || 'Deye Cloud'}</span></div></div><div className="power-metrics"><article><MaterialIcon name="solar_power" /><span>{t('Генерація')}</span><strong>{valueWithUnit(data.solarPower)}</strong></article><article><MaterialIcon name="electric_bolt" /><span>{t('Мережа')}</span><strong>{valueWithUnit(data.gridPower)}</strong></article><article><MaterialIcon name="home" /><span>{t('UPS-навантаження')}</span><strong>{valueWithUnit(data.loadPower)}</strong></article><article><MaterialIcon name="battery_full" /><span>{t('Батарея')}</span><strong>{data.batterySoc == null ? '—' : `${data.batterySoc}%`}</strong></article></div><p className="power-updated">{t('Оновлено')}: {data.updatedAt ? new Date(data.updatedAt).toLocaleString(dateLocale) : '—'}</p><section className="power-chart-card"><h2>{t('Споживання за останні 6 годин')}</h2><ConsumptionChart rows={state.history} dateLocale={dateLocale} t={t} /></section></>}
  </div></section></main>;
}
