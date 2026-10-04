import React from 'react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, mediaFormatUrl, mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function AboutPage() {
  const { locale, t } = useLocale();
  const { profile } = useOutletContext();
  const [historyItems, setHistoryItems] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [aboutImageLoaded, setAboutImageLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([
      fetchCollectionLocalized('/history-items', 'sort=year:asc&pagination[pageSize]=100', locale),
      fetchCollectionLocalized('/staff-members', 'populate=photo&sort=order:asc&pagination[pageSize]=100', locale),
    ]).then(([history, staff]) => {
      if (!active) return;
      setHistoryItems(history);
      setStaffMembers(staff);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  return (
    <main>
      {status === 'loading' && <p className="container">{t('Завантаження сторінки «Про нас»…')}</p>}
      {status === 'error' && <p className="container" role="alert">{t('Не вдалося завантажити сторінку «Про нас» із CMS.')}</p>}
      <section className={`subhero${mediaUrl(profile?.aboutImage) ? ' subhero-with-image' : ''}`}>
        {mediaUrl(profile?.aboutImage) && <picture className="subhero-media" aria-hidden="true">
          {mediaFormatUrl(profile?.aboutImage, 'small') && <source media="(max-width: 640px)" srcSet={mediaFormatUrl(profile.aboutImage, 'small')} />}
          {mediaFormatUrl(profile?.aboutImage, 'medium') && <source media="(max-width: 1100px)" srcSet={mediaFormatUrl(profile.aboutImage, 'medium')} />}
          <img className={aboutImageLoaded ? 'is-loaded' : ''} src={mediaUrl(profile.aboutImage)} alt="" decoding="async" onLoad={() => setAboutImageLoaded(true)} />
        </picture>}
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
            {historyItems.map((item) => (
              <article key={item.documentId || item.id} className="timeline-item">
                <div className="timeline-icon"><MaterialIcon name={item.icon || 'history_edu'} /></div>
                <div>
                  <h3>{item.year}</h3>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                  {locale === 'en' && item._fallbackLocale && <small>{t('Показано українською')}</small>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container">
          <SectionTitle title={t('Вчителі та адміністрація')} center />
          {status === 'ready' && !staffMembers.length && <p>{t('Інформацію про працівників ще не додано.')}</p>}
          <div className="staff-grid">
            {staffMembers.map((person) => (
              <article className="staff-card" key={person.documentId || person.id}>
                {mediaUrl(person.photo)
                  ? <img src={mediaUrl(person.photo)} alt={person.name} />
                  : <div className="staff-photo-placeholder" aria-hidden="true"><MaterialIcon name="person" /></div>}
                <h3>{person.name}</h3>
                <p>{person.position}</p>
                {person.bio && <p className="staff-bio">{person.bio}</p>}
                {locale === 'en' && person._fallbackLocale && <small>{t('Показано українською')}</small>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
