import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventPhotos, eventVideoEmbedUrl, fetchEventBySlug } from '../lib/events.js';
import { useLocale } from '../lib/locale.jsx';

export default function EventDetailPage() {
  const { locale, t, dateLocale } = useLocale();
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setPhotoIndex(0);
    fetchEventBySlug(slug, locale).then((data) => {
      if (active) {
        setEvent(data);
        setStatus(data ? 'ready' : 'missing');
      }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [slug, locale]);

  const photos = eventPhotos(event);
  const video = eventVideoEmbedUrl(event?.youtubeUrl);

  return (
    <main className="page-main">
      <article className="container event-detail">
        <Link className="text-link" to="/events">← {t('Усі події')}</Link>
        {status === 'loading' && <p>{t('Завантаження події…')}</p>}
        {status === 'error' && <p role="alert">{t('Не вдалося завантажити подію. Спробуйте оновити сторінку.')}</p>}
        {status === 'missing' && <p>{t('Подію не знайдено.')}</p>}
        {status === 'ready' && <>
          <h1>{event.title}</h1>
          {locale === 'en' && event._fallbackLocale && <small>{t('Показано українською')}</small>}
          <p className="event-date">{event.date && new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${event.date}T00:00:00Z`))}</p>
          {photos.length > 0 && <div className="event-gallery">
            <img src={photos[photoIndex]} alt={`${event.title} — ${t('фото')} ${photoIndex + 1}`} />
            {photos.length > 1 && <div className="gallery-controls">
              <button type="button" onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)} aria-label={t('Попереднє фото')}>←</button>
              <span>{photoIndex + 1} / {photos.length}</span>
              <button type="button" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)} aria-label={t('Наступне фото')}>→</button>
            </div>}
          </div>}
          {event.summary && <p className="event-summary">{event.summary}</p>}
          {event.content && <div className="event-article">{event.content.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {video && <div className="event-video"><iframe src={video} title={`${t('Відео')}: ${event.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
        </>}
      </article>
    </main>
  );
}
