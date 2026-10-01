import React from 'react';
import { Link } from 'react-router-dom';
import MaterialIcon from './MaterialIcon.jsx';
import { mediaUrl } from '../lib/api.js';

const categoryLabels = {
  academic: 'Академічні',
  sport: 'Спорт',
  art: 'Мистецтво',
  admission: 'Вступ',
  community: 'Громада',
  other: 'Подія',
};

const categoryClasses = {
  academic: 'tag-primary',
  sport: 'tag-blue',
  art: 'tag-purple',
  admission: 'tag-green',
  community: 'tag-cyan',
  other: 'tag-slate',
};

export default function EventCard({ event, compact = false }) {
  const category = event.category || 'other';
  const image = mediaUrl(event.cover) || mediaUrl(event.photos?.[0] || event.photos?.data?.[0], '/image/background.png');

  return (
    <article className={`event-card ${compact ? 'compact' : ''}`}>
      <div className="event-image">
        <img src={image} alt={event.title} />
        {!compact && <span className={`event-tag ${categoryClasses[category] || categoryClasses.other}`}>{categoryLabels[category] || categoryLabels.other}</span>}
      </div>
      <div className="event-body">
        {compact && <span className="eyebrow">{categoryLabels[category] || categoryLabels.other}</span>}
        <h3>{event.title}</h3>
        <p className="event-date">
          {!compact && <MaterialIcon name="calendar_today" />}
          {formatDate(event.date)}
        </p>
        {!compact && <p className="muted">{event.summary}</p>}
        <Link className="text-link" to={`/events/${encodeURIComponent(event.slug)}`}>
          Читати далі <MaterialIcon name="arrow_forward" />
        </Link>
      </div>
    </article>
  );
}

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
