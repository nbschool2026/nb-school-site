import React from 'react';
import { Link } from 'react-router-dom';
import MaterialIcon from './MaterialIcon.jsx';
import { mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

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
  const { locale, t, dateLocale } = useLocale();
  const category = event.category || 'other';
  const image = mediaUrl(event.cover) || mediaUrl(event.photos?.[0] || event.photos?.data?.[0]);

  return (
    <article className={`event-card ${compact ? 'compact' : ''}`}>
      <div className="event-image">
        {image ? <img src={image} alt={event.title} /> : <div className="event-placeholder" aria-hidden="true"><MaterialIcon name="event" /></div>}
        {!compact && <span className={`event-tag ${categoryClasses[category] || categoryClasses.other}`}>{t(categoryLabels[category] || categoryLabels.other)}</span>}
      </div>
      <div className="event-body">
        {compact && <span className="eyebrow">{t(categoryLabels[category] || categoryLabels.other)}</span>}
        <h3>{event.title}</h3>
        {locale === 'en' && event._fallbackLocale && <small>{t('Показано українською')}</small>}
        <p className="event-date">
          {!compact && <MaterialIcon name="calendar_today" />}
          {formatDate(event.date, dateLocale)}
        </p>
        {!compact && <p className="muted">{event.summary}</p>}
        <Link className="text-link" to={`/events/${encodeURIComponent(event.slug)}`}>
          {t('Читати далі')} <MaterialIcon name="arrow_forward" />
        </Link>
      </div>
    </article>
  );
}

function formatDate(value, dateLocale) {
  if (!value) return '';

  return new Intl.DateTimeFormat(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
