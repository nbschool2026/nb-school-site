import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, mediaFormatUrl, mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function AboutPage() {
  const { locale, t } = useLocale();
  const { profile } = useOutletContext();
  const [historyItems, setHistoryItems] = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffVisibleCount, setStaffVisibleCount] = useState(4);
  const [status, setStatus] = useState('loading');
  const [loadedAboutImages, setLoadedAboutImages] = useState(() => new Set());
  const [aboutSlide, setAboutSlide] = useState(0);

  const aboutHeroImages = useMemo(() => {
    const gallery = Array.isArray(profile?.aboutHeroImages)
      ? profile.aboutHeroImages
      : profile?.aboutHeroImages?.data || [];
    const images = gallery.map((image) => ({
      src: mediaFormatUrl(image, 'large', mediaUrl(image)),
      small: mediaFormatUrl(image, 'small'),
      medium: mediaFormatUrl(image, 'medium'),
      large: mediaFormatUrl(image, 'large'),
    })).filter((image) => image.src);
    if (images.length) return images.slice(0, 20);
    const fallback = profile?.aboutImage;
    return fallback ? [{
      src: mediaUrl(fallback),
      small: mediaFormatUrl(fallback, 'small'),
      medium: mediaFormatUrl(fallback, 'medium'),
      large: mediaFormatUrl(fallback, 'large'),
    }] : [];
  }, [profile]);

  useEffect(() => {
    setAboutSlide(0);
    setLoadedAboutImages(new Set());
    if (aboutHeroImages.length < 2) return undefined;
    const timer = window.setInterval(() => setAboutSlide((current) => (current + 1) % aboutHeroImages.length), 3000);
    return () => window.clearInterval(timer);
  }, [aboutHeroImages]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([
      fetchCollectionLocalized('/history-items', 'sort=year:asc&pagination[pageSize]=100', locale),
      fetchCollectionLocalized('/staff-members', 'populate=photo&sort=order:asc&pagination[pageSize]=100', locale),
    ]).then(([history, staff]) => {
      if (!active) return;
      setHistoryItems(history);
      setHistoryExpanded(false);
      setStaffMembers(staff);
      setStaffVisibleCount(4);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  return (
    <main>
      {status === 'loading' && <p className="container">{t('Завантаження сторінки «Про нас»…')}</p>}
      {status === 'error' && <p className="container" role="alert">{t('Не вдалося завантажити сторінку «Про нас» із CMS.')}</p>}
      <section className={`subhero${aboutHeroImages.length ? ' subhero-with-image' : ''}`}>
        <div className="subhero-media" aria-hidden="true">
          {aboutHeroImages.map((image, index) => <img key={image.src} className={'subhero-slide' + (index === aboutSlide ? ' is-active' : '') + (loadedAboutImages.has(image.src) ? ' is-loaded' : '')} src={image.medium || image.src} srcSet={aboutImageSrcSet(image)} sizes="(max-width: 640px) 100vw, (max-width: 1200px) calc(100vw - 32px), 1180px" alt="" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" onLoad={() => setLoadedAboutImages((current) => { if (current.has(image.src)) return current; const next = new Set(current); next.add(image.src); return next; })} />)}
        </div>
        <div>
          <h1>{t('Про Наш Ліцей')}</h1>
          {locale === 'en' && profile?._fallbackLocale && <small>{t('Показано українською')}</small>}
          {profile?.mission && <p>{profile.mission}</p>}
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container narrow">
          <SectionTitle title={t('Наша історія')} center />
          {status === 'ready' && !historyItems.length && <p>{t('Історію закладу ще не додано.')}</p>}
          <div className="timeline">
            {historyItems.map((item, index) => {
              const isCollapsedMiddle = !historyExpanded && historyItems.length > 2 && index > 0 && index < historyItems.length - 1;
              if (isCollapsedMiddle) return index === 1 ? <li key="history-more" className="timeline-more"><button type="button" onClick={() => setHistoryExpanded(true)} aria-label={t('Показати всю історію')}>…</button></li> : null;
              return (
              <article key={item.documentId || item.id} className="timeline-item">
                <div className="timeline-year">{item.year}</div>
                <div className="timeline-content">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  {locale === 'en' && item._fallbackLocale && <small>{t('Показано українською')}</small>}
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container">
          <SectionTitle title={t('Вчителі та адміністрація')} center />
          {status === 'ready' && !staffMembers.length && <p>{t('Інформацію про працівників ще не додано.')}</p>}
          <div className="staff-grid">
            {staffMembers.slice(0, staffVisibleCount).map((person) => (
              <article className="staff-card" key={person.documentId || person.id}>
                {mediaUrl(person.photo)
                  ? <img src={mediaUrl(person.photo)} alt={person.name} loading="lazy" decoding="async" />
                  : <div className="staff-photo-placeholder" aria-hidden="true"><MaterialIcon name="person" /></div>}
                <h3>{person.name}</h3>
                <p>{person.position}</p>
                {person.bio && <p className="staff-bio">{person.bio}</p>}
                {locale === 'en' && person._fallbackLocale && <small>{t('Показано українською')}</small>}
              </article>
            ))}
          </div>
          {staffMembers.length > staffVisibleCount && <button type="button" className="staff-more" onClick={() => setStaffVisibleCount((count) => Math.min(count + 4, staffMembers.length))}><MaterialIcon name="expand_more" />{t('Показати більше')}</button>}
        </div>
      </section>
    </main>
  );
}

function aboutImageSrcSet(image) {
  return [['small', 500], ['medium', 750], ['large', 1000]]
    .map(([format, width]) => image[format] ? image[format] + ' ' + width + 'w' : '')
    .filter(Boolean)
    .join(', ');
}
