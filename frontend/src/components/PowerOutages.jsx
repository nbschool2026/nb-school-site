import React, { useEffect, useState } from 'react';
import { intervalLabel, SCHOOL_TIME_ZONE, weeklyOutages } from '../lib/power-outages.js';

const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';

export default function PowerOutages({ t, dateLocale }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${API_BASE}/power/history?hours=168`, { signal: controller.signal, headers: { Accept: 'application/json' } });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.data)) throw new Error('history');
        if (active) setState({ status: 'ready', rows: payload.data });
      } catch {
        if (active) setState({ status: 'error', rows: [] });
      }
    }
    setState({ status: 'loading', rows: [] });
    load();
    const timer = window.setInterval(load, 5 * 60_000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [retry]);
  const days = weeklyOutages(state.rows);
  const dateLabel = (time) => new Date(time).toLocaleDateString(dateLocale, { timeZone: SCHOOL_TIME_ZONE, weekday: 'long', day: '2-digit', month: '2-digit' });
  const duration = (ms) => {
    const minutes = Math.round(ms / 60_000);
    return `${Math.floor(minutes / 60)} ${t('год')} ${minutes % 60 ? `${minutes % 60} ${t('хв')}` : ''}`.trim();
  };
  return <section className="power-chart-card power-outages"><h2>{t('Відключення за останні 7 днів')}</h2>
    {state.status === 'loading' && <p role="status" className="power-chart-empty">{t('Завантаження…')}</p>}
    {state.status === 'error' && <div role="alert"><p>{t('Не вдалося завантажити історію відключень.')}</p><button className="soft-button" type="button" onClick={() => setRetry((value) => value + 1)}>{t('Оновити')}</button></div>}
    {state.status === 'ready' && <><div className="power-outages-scroll"><table><thead><tr><th scope="col">{t('День')}</th><th scope="col">{t('Проміжки відключень')}</th><th scope="col">{t('Кількість')}</th><th scope="col">{t('Загалом')}</th></tr></thead><tbody>{days.map((day) => <tr key={day.key}><th scope="row">{dateLabel(day.date)}</th><td>{!day.coveredMs ? t('Немає даних') : day.intervals.length ? day.intervals.map((interval) => intervalLabel(interval, dateLocale)).join(', ') : t('Не зафіксовано')}</td><td>{day.coveredMs ? day.intervals.length : '—'}</td><td>{day.coveredMs ? duration(day.totalMs) : '—'}</td></tr>)}</tbody></table></div><p className="power-outages-caption">{t('За нульовою потужністю мережі; час київський. Пропуски даних не враховано. Сьогодні — до останнього виміру.')}</p></>}
  </section>;
}
