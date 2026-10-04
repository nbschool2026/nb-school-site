import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, mediaFormatUrl, mediaUrl } from '../lib/api.js';
import { fetchAllEvents } from '../lib/events.js';
import { useLocale } from '../lib/locale.jsx';

export default function HomePage() {
  const { locale, t } = useLocale();
  const { profile, profileStatus } = useOutletContext();
  const [principal, setPrincipal] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    setEventsStatus('loading');
    fetchCollectionLocalized('/staff-members', 'populate[0]=photo&populate[1]=homepagePhoto&sort=order:asc&pagination[pageSize]=100', locale).then((data) => {
      if (active) setPrincipal(data[0] || null);
    }).catch(() => { if (active) setPrincipal(null); });
    fetchAllEvents(locale).then((data) => {
      if (active) { setEvents(data.slice(0, 4)); setEventsStatus('ready'); }
    }).catch(() => { if (active) setEventsStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  const heroImage = mediaUrl(profile?.heroImage);
  const heroSmall = mediaFormatUrl(profile?.heroImage, 'small');
  const heroMedium = mediaFormatUrl(profile?.heroImage, 'medium');

  return (
    <main>
      <section className={`hero${heroImage ? ' hero-with-image' : ''}`}>
        {heroImage && <picture className="hero-media" aria-hidden="true">
          {heroSmall && <source media="(max-width: 640px)" srcSet={heroSmall} />}
          {heroMedium && <source media="(max-width: 1100px)" srcSet={heroMedium} />}
          <img src={heroImage} alt="" fetchPriority="high" decoding="async" />
        </picture>}
        <div className="hero-content">
          <h1>{profile?.heroTitle || profile?.schoolName || t('Новобілоуський ліцей')}</h1>
          {locale === 'en' && profile?._fallbackLocale && <small>{t('Показано українською')}</small>}
          {profile?.heroSubtitle && <p>{profile.heroSubtitle}</p>}
          <div className="hero-actions">
            <Link className="ghost-button" to="/about">{t('Віртуальний тур')}</Link>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionTitle eyebrow={t('Останні новини')} title={t('Події')} />
          {eventsStatus === 'loading' && <p>{t('Завантаження подій…')}</p>}
          {eventsStatus === 'error' && <p role="alert">{t('Не вдалося завантажити події з CMS.')}</p>}
          {eventsStatus === 'ready' && (events.length
            ? <div className="event-grid compact-grid">{events.map((event) => <EventCard key={event.documentId || event.id || event.slug} event={event} compact />)}</div>
            : <p>{t('Подій поки немає.')}</p>)}
          <div className="center-action">
            <Link className="soft-button" to="/events">{t('Всі події')} <MaterialIcon name="grid_view" /></Link>
          </div>
        </div>
      </section>

      <section className="contact-band">
        <div className={`container contact-grid${principal ? '' : ' contact-grid-single'}`}>
          <div>
            <h2>{t('Контакти')}</h2>
            {profileStatus === 'loading' && <p>{t('Завантаження контактів…')}</p>}
            {profileStatus === 'error' && <p role="alert">{t('Не вдалося завантажити контакти з CMS.')}</p>}
            {profileStatus === 'ready' && !profile && <p>{t('Контакти ще не додано.')}</p>}
            {profile && <>
              <div className="contact-list">
                {profile.address && <ContactItem icon="location_on" title={t('Адреса')} text={profile.address} href={profile.mapUrl} />}
                {profile.phone && <ContactItem icon="call" title={t('Номер телефону')} text={profile.phone} href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} />}
                {profile.email && <ContactItem icon="mail" title={t('Електронна пошта')} text={profile.email} href={`mailto:${profile.email}`} />}
              </div>
              {profile.workingHours && <div className="hours">
                <span>{t('Графік роботи')}</span>
                <strong>{profile.workingHours}</strong>
              </div>}
            </>}
          </div>
          {principal && <article className="principal-card">
            {(mediaUrl(principal.homepagePhoto) || mediaUrl(principal.photo)) &&
              <img src={mediaUrl(principal.homepagePhoto) || mediaUrl(principal.photo)} alt={principal.name} />}
            <h3>{principal.name}</h3>
            <p className="accent">{principal.position}</p>
            {principal.bio && <p className="quote">{principal.bio}</p>}
            {locale === 'en' && principal._fallbackLocale && <small>{t('Показано українською')}</small>}
          </article>}
        </div>
      </section>
    </main>
  );
}
function ContactItem({ icon, title, text, href }) {
  const content = <MaterialIcon name={icon} />;

  return (
    <div className="contact-item">
      {href ? <a className="contact-icon" href={href}>{content}</a> : <span className="contact-icon">{content}</span>}
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

