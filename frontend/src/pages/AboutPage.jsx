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
  const [aboutImageLoaded, setAboutImageLoaded] = useState(false);
  const [aboutSlide, setAboutSlide] = useState(0);

  const aboutHeroImages = useMemo(() => {
    const gallery = Array.isArray(profile?.aboutHeroImages)
      ? profile.aboutHeroImages
      : profile?.aboutHeroImages?.data || [];
    const urls = gallery.map((image) => mediaFormatUrl(image, 'large', mediaUrl(image))).filter(Boolean);
    return urls.length ? urls.slice(0, 20) : [mediaUrl(profile?.aboutImage)].filter(Boolean);
  }, [profile]);

  useEffect(() => {
    setAboutSlide(0);
    setAboutImageLoaded(false);
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
          {aboutHeroImages.map((image, index) => <img key={image} className={`subhero-slide${index === aboutSlide ? ' is-active' : ''}${aboutImageLoaded && index === aboutSlide ? ' is-loaded' : ''}`} style={{ opacity: index === aboutSlide ? 1 : 0 }} src={image} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" onLoad={() => index === aboutSlide && setAboutImageLoaded(true)} />)}
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
                <div className="timeline-icon"><MaterialIcon name={item.icon || 'history_edu'} /></div>
                <div>
                  <h3>{item.year}</h3>
                  <h4>{item.title}</h4>
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
