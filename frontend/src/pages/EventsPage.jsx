import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCollection } from '../lib/api.js';
import { events as fallbackEvents } from '../lib/fallbackData.js';

const categories = [
  ['all', 'apps', 'Усі події'],
  ['academic', 'auto_stories', 'Академічні'],
  ['sport', 'sports_basketball', 'Спорт'],
  ['art', 'palette', 'Мистецтво'],
  ['admission', 'person_add', 'Вступ'],
];

export default function EventsPage() {
  const [events, setEvents] = useState(fallbackEvents);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchCollection('/events', 'populate=cover&sort=date:desc&pagination[limit]=50').then((data) => {
      if (data.length) setEvents(data);
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (category === 'all') return events;
    return events.filter((event) => event.category === category);
  }, [category, events]);

  return (
    <main className="page-main">
      <section className="container events-layout">
        <aside className="events-sidebar">
          <div>
            <h2>Категорії</h2>
            <div className="category-list">
              {categories.map(([key, icon, label]) => (
                <button type="button" className={category === key ? 'selected' : ''} key={key} onClick={() => setCategory(key)}>
                  <MaterialIcon name={icon} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mini-calendar">
            <div className="calendar-head">
              <MaterialIcon name="chevron_left" />
              <strong>Травень 2026</strong>
              <MaterialIcon name="chevron_right" />
            </div>
            <div className="calendar-grid">
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'].map((day) => <span className="weekday" key={day}>{day}</span>)}
              {Array.from({ length: 31 }, (_, index) => <span className={index === 4 ? 'marked' : ''} key={index}>{index + 1}</span>)}
            </div>
          </div>
        </aside>

        <section className="events-content">
          <div className="page-heading">
            <h1>Наші події</h1>
            <p>Дізнайтеся про майбутні заходи, академічні конкурси, спортивні змагання та культурне життя нашого ліцею.</p>
          </div>
          <div className="event-grid">
            {filteredEvents.map((event) => <EventCard key={event.documentId || event.id || event.slug} event={event} />)}
          </div>
        </section>
      </section>
    </main>
  );
}
