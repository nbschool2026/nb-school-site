import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventPhotos, fetchEventBySlug, youtubeEmbedUrl } from '../lib/events.js';

export default function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setPhotoIndex(0);
    fetchEventBySlug(slug).then((data) => {
      if (active) {
        setEvent(data);
        setStatus(data ? 'ready' : 'missing');
      }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [slug]);

  const photos = eventPhotos(event);
  const video = youtubeEmbedUrl(event?.youtubeUrl);

  return (
    <main className="page-main">
      <article className="container event-detail">
        <Link className="text-link" to="/events">← Усі події</Link>
        {status === 'loading' && <p>Завантаження події…</p>}
        {status === 'error' && <p role="alert">Не вдалося завантажити подію. Спробуйте оновити сторінку.</p>}
        {status === 'missing' && <p>Подію не знайдено.</p>}
        {status === 'ready' && <>
          <h1>{event.title}</h1>
          <p className="event-date">{event.date && new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${event.date}T00:00:00Z`))}</p>
          {photos.length > 0 && <div className="event-gallery">
            <img src={photos[photoIndex]} alt={`${event.title} — фото ${photoIndex + 1}`} />
            {photos.length > 1 && <div className="gallery-controls">
              <button type="button" onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)} aria-label="Попереднє фото">←</button>
              <span>{photoIndex + 1} / {photos.length}</span>
              <button type="button" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)} aria-label="Наступне фото">→</button>
            </div>}
          </div>}
          {event.summary && <p className="event-summary">{event.summary}</p>}
          {event.content && <div className="event-article">{event.content.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {video && <div className="event-video"><iframe src={video} title={`Відео: ${event.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
        </>}
      </article>
    </main>
  );
}
