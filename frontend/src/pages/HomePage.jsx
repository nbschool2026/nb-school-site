import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, fetchSingleLocalized, mediaUrl } from '../lib/api.js';
import { fetchAllEvents } from '../lib/events.js';
import { scheduleLessons } from '../lib/fallbackData.js';
import { useLocale } from '../lib/locale.jsx';

const weekdays = [
  ['monday', 'Понеділок'],
  ['tuesday', 'Вівторок'],
  ['wednesday', 'Середа'],
  ['thursday', 'Четвер'],
  ['friday', "П'ятниця"],
];

export default function HomePage() {
  const { locale, t } = useLocale();
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('loading');
  const [principal, setPrincipal] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState('loading');
  const [lessons, setLessons] = useState(scheduleLessons);

  useEffect(() => {
    let active = true;
    setProfileStatus('loading');
    setEventsStatus('loading');
    fetchSingleLocalized('/school-profile', 'populate=heroImage', locale).then((data) => {
      if (active) { setProfile(data); setProfileStatus('ready'); }
    }).catch(() => { if (active) setProfileStatus('error'); });
    fetchCollectionLocalized('/staff-members', 'populate[0]=photo&populate[1]=homepagePhoto&sort=order:asc&pagination[pageSize]=100', locale).then((data) => {
      if (active) setPrincipal(data[0] || null);
    }).catch(() => { if (active) setPrincipal(null); });
    fetchAllEvents(locale).then((data) => {
      if (active) { setEvents(data.slice(0, 4)); setEventsStatus('ready'); }
    }).catch(() => { if (active) setEventsStatus('error'); });
    fetchCollectionLocalized('/schedule-lessons', 'sort=order:asc&pagination[pageSize]=100', locale).then((data) => {
      if (active) setLessons(data.length ? data : scheduleLessons);
    }).catch(() => { if (active) setLessons(scheduleLessons); });
    return () => { active = false; };
  }, [locale]);

  const groupedLessons = useMemo(() => {
    return weekdays.map(([key, label]) => ({
      key,
      label: t(label),
      lessons: lessons.filter((lesson) => lesson.weekday === key),
    }));
  }, [lessons, locale]);

  const heroImage = mediaUrl(profile?.heroImage);

  return (
    <main>
      <section className="hero" style={{ backgroundImage: heroImage
        ? `linear-gradient(rgba(16, 22, 34, 0.62), rgba(16, 22, 34, 0.35)), url("${heroImage}")`
        : 'linear-gradient(rgba(16, 22, 34, 0.86), rgba(16, 22, 34, 0.7))' }}>
        <div className="hero-content">
          <h1>{profile?.heroTitle || profile?.schoolName || t('Новобілоуський ліцей')}</h1>
          {locale === 'en' && profile?._fallbackLocale && <small>{t('Показано українською')}</small>}
          {profile?.heroSubtitle && <p>{profile.heroSubtitle}</p>}
          <div className="hero-actions">
            <a className="primary-button" href="#schedule">{t('Відкрити нашу програму')}</a>
            <a className="ghost-button" href="/about">{t('Віртуальний тур')}</a>
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
            <a className="soft-button" href="/events">{t('Всі події')} <MaterialIcon name="grid_view" /></a>
          </div>
        </div>
      </section>

      <section className="page-section bordered" id="schedule">
        <div className="container">
          <SectionTitle eyebrow={t('Навчання')} title={t('Розклад уроків')} />
          <div className="filters">
            <label>
              <span>{t('Клас')}</span>
              <select key={`class-${locale}`} defaultValue={t('11 Клас')}>
                <option>{t('Оберіть клас')}</option>
                <option>{t('1 Клас')}</option>
                <option>{t('5 Клас')}</option>
                <option>{t('9 Клас')}</option>
                <option>{t('11 Клас')}</option>
              </select>
            </label>
            <label>
              <span>{t('Предмет')}</span>
              <select key={`subject-${locale}`} defaultValue={t('Всі предмети')}>
                <option>{t('Всі предмети')}</option>
                <option>{t('Математика')}</option>
                <option>{t('Фізика')}</option>
                <option>{t('Українська мова')}</option>
              </select>
            </label>
            <label>
              <span>{t('Вчитель')}</span>
              <select key={`teacher-${locale}`} defaultValue={t('Всі вчителі')}>
                <option>{t('Всі вчителі')}</option>
                <option>Іван Іванов</option>
                <option>Олена Кравченко</option>
              </select>
            </label>
          </div>

          <div className="schedule-scroll">
            <div className="schedule-grid">
              {groupedLessons.map((day, index) => (
                <div className="schedule-day" key={day.key}>
                  <h3 className={index === 0 ? 'current' : ''}>{day.label}</h3>
                  <div className="lesson-list">
                    {day.lessons.length ? day.lessons.map((lesson) => (
                      <article className="lesson-card" key={lesson.documentId || lesson.id}>
                        <span>{trimTime(lesson.startTime)} - {trimTime(lesson.endTime)}</span>
                        <h4>{lesson._fallbackLocale ? t(lesson.subject) : lesson.subject}</h4>
                        <p>{lesson.teacher}</p>
                        {locale === 'en' && lesson._fallbackLocale && <small>{t('Показано українською')}</small>}
                      </article>
                    )) : <p className="empty-day">{t('Немає уроків')}</p>}
                  </div>
                </div>
              ))}
            </div>
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

function trimTime(value) {
  return String(value || '').slice(0, 5);
}
