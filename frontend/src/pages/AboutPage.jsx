import React from 'react';
import { useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, fetchSingleLocalized, mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function AboutPage() {
  const { locale, t } = useLocale();
  const [historyItems, setHistoryItems] = useState([]);
  const [valueCards, setValueCards] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([
      fetchCollectionLocalized('/history-items', 'sort=year:asc&pagination[pageSize]=100', locale),
      fetchCollectionLocalized('/value-cards', 'sort=order:asc&pagination[pageSize]=100', locale),
      fetchCollectionLocalized('/staff-members', 'populate=photo&sort=order:asc&pagination[pageSize]=100', locale),
      fetchSingleLocalized('/school-profile', 'populate=aboutImage', locale),
    ]).then(([history, values, staff, schoolProfile]) => {
      if (!active) return;
      setHistoryItems(history);
      setValueCards(values);
      setStaffMembers(staff);
      setProfile(schoolProfile);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  return (
    <main>
      {status === 'loading' && <p className="container">{t('Завантаження сторінки «Про нас»…')}</p>}
      {status === 'error' && <p className="container" role="alert">{t('Не вдалося завантажити сторінку «Про нас» із CMS.')}</p>}
      <section className="subhero" style={{ backgroundImage: mediaUrl(profile?.aboutImage)
        ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.62)), url("${mediaUrl(profile.aboutImage)}")`
        : 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75))' }}>
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

      <section className="page-section">
        <div className="container">
          <SectionTitle title={t('Наші цінності')} center />
          {status === 'ready' && !valueCards.length && <p>{t('Цінності ще не додано.')}</p>}
          <div className="value-grid">
            {valueCards.map((card) => (
              <article className="value-card" key={card.documentId || card.id}>
                <MaterialIcon name={card.icon || 'workspace_premium'} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                {locale === 'en' && card._fallbackLocale && <small>{t('Показано українською')}</small>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container">
          <SectionTitle title={t('Адміністрація')} center />
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
