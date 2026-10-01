import React, { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchAllEvents } from '../lib/events.js';
import { useLocale } from '../lib/locale.jsx';

const categories = [
  ['all', 'apps', 'Усі події'],
  ['academic', 'auto_stories', 'Академічні'],
  ['sport', 'sports_basketball', 'Спорт'],
  ['art', 'palette', 'Мистецтво'],
  ['admission', 'person_add', 'Вступ'],
];
const weekdayLabels = { uk: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'], en: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] };

export default function EventsPage() {
  const { locale, t, dateLocale } = useLocale();
  const monthTitle = useMemo(() => new Intl.DateTimeFormat(dateLocale, { month: 'long', year: 'numeric' }), [dateLocale]);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [category, setCategory] = useState('all');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchAllEvents(locale).then((data) => {
      if (active) { setEvents(data); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const categoryMatches = category === 'all' || event.category === category;
    const monthMatches = !selectedMonth || event.date?.slice(0, 7) === selectedMonth;
    return categoryMatches && monthMatches;
  }), [category, events, selectedMonth]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  // The API returns events in list order; the first event decides a shared day's color.
  const eventDays = new Map();
  for (const event of events) {
    if (event.date?.startsWith(monthKey)) {
      const day = Number(event.date.slice(8, 10));
      if (!eventDays.has(day)) eventDays.set(day, event.category || 'other');
    }
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <main className="page-main">
      <section className="container events-layout">
        <aside className="events-sidebar">
          <div>
            <h2>{t('Категорії')}</h2>
            <div className="category-list">
              {categories.map(([key, icon, label]) => (
                <button type="button" className={category === key ? 'selected' : ''} key={key} onClick={() => setCategory(key)} aria-pressed={category === key}>
                  <MaterialIcon name={icon} />{t(label)}
                </button>
              ))}
            </div>
          </div>
          <div className="mini-calendar">
            <div className="calendar-head">
              <button type="button" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} aria-label={t('Попередній місяць')}><MaterialIcon name="chevron_left" /></button>
              <button type="button" className={selectedMonth === monthKey ? 'calendar-selected-month' : ''} onClick={() => setSelectedMonth(monthKey)} aria-pressed={selectedMonth === monthKey} aria-label={`${t('Показати цей місяць')}: ${monthTitle.format(visibleMonth)}`}><strong>{monthTitle.format(visibleMonth)}</strong></button>
              <button type="button" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} aria-label={t('Наступний місяць')}><MaterialIcon name="chevron_right" /></button>
            </div>
            <div className="calendar-grid" aria-hidden="true">
              {weekdayLabels[locale].map((day) => <span className="weekday" key={day}>{day}</span>)}
              {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} />)}
              {Array.from({ length: dayCount }, (_, index) => {
                const day = index + 1;
                const eventCategory = eventDays.get(day);
                const isToday = monthKey === todayKey && day === today.getDate();
                const className = isToday ? 'calendar-today' : eventCategory ? `calendar-event calendar-event-${eventCategory}` : '';
                return <span className={className} key={day}>{day}</span>;
              })}
            </div>
            <button type="button" className="month-action" onClick={() => setSelectedMonth(selectedMonth === monthKey ? null : monthKey)}>{t(selectedMonth === monthKey ? 'Скинути місяць' : 'Показати цей місяць')}</button>
            {selectedMonth && selectedMonth !== monthKey && <button type="button" className="month-action" onClick={() => setSelectedMonth(null)}>{t('Скинути вибраний місяць')}</button>}
          </div>
        </aside>

        <section className="events-content">
          <div className="page-heading">
            <h1>{t('Наші події')}</h1>
            <p>{t('Дізнайтеся про майбутні заходи, академічні конкурси, спортивні змагання та культурне життя нашого ліцею.')}</p>
          </div>
          {status === 'loading' && <p>{t('Завантаження подій…')}</p>}
          {status === 'error' && <p role="alert">{t('Не вдалося завантажити події з CMS. Перевірте, чи запущена адмінка, і оновіть сторінку.')}</p>}
          {status === 'ready' && (filteredEvents.length
            ? <div className="event-grid">{filteredEvents.map((event) => <EventCard key={event.documentId || event.id || event.slug} event={event} />)}</div>
            : <p className="events-empty">{t('Подій не знайдено')}</p>)}
        </section>
      </section>
    </main>
  );
}
