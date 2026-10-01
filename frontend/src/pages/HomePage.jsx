import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollection, fetchSingleStrict, mediaUrl } from '../lib/api.js';
import { fetchAllEvents } from '../lib/events.js';
import { scheduleLessons } from '../lib/fallbackData.js';

const weekdays = [
  ['monday', 'Понеділок'],
  ['tuesday', 'Вівторок'],
  ['wednesday', 'Середа'],
  ['thursday', 'Четвер'],
  ['friday', "П'ятниця"],
];

export default function HomePage() {
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('loading');
  const [principal, setPrincipal] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState('loading');
  const [lessons, setLessons] = useState(scheduleLessons);

  useEffect(() => {
    fetchSingleStrict('/school-profile', 'populate=heroImage').then((data) => {
      setProfile(data);
      setProfileStatus('ready');
    }).catch(() => setProfileStatus('error'));
    fetchCollection('/staff-members', 'populate=photo&sort=order:asc&pagination[pageSize]=100').then((data) => {
      setPrincipal(data[0] || null);
    });
    fetchAllEvents().then((data) => {
      setEvents(data.slice(0, 4));
      setEventsStatus('ready');
    }).catch(() => setEventsStatus('error'));
    fetchCollection('/schedule-lessons', 'sort=order:asc&pagination[limit]=100').then((data) => {
      if (data.length) setLessons(data);
    });
  }, []);

  const groupedLessons = useMemo(() => {
    return weekdays.map(([key, label]) => ({
      key,
      label,
      lessons: lessons.filter((lesson) => lesson.weekday === key),
    }));
  }, [lessons]);

  const heroImage = mediaUrl(profile?.heroImage, '/image/background.png');

  return (
    <main>
      <section className="hero" style={{ backgroundImage: `linear-gradient(rgba(16, 22, 34, 0.62), rgba(16, 22, 34, 0.35)), url("${heroImage}")` }}>
        <div className="hero-content">
          <h1>{profile?.heroTitle || profile?.schoolName || 'Новобілоуський ліцей'}</h1>
          {profile?.heroSubtitle && <p>{profile.heroSubtitle}</p>}
          <div className="hero-actions">
            <a className="primary-button" href="#schedule">Відкрити нашу програму</a>
            <a className="ghost-button" href="/about">Віртуальний тур</a>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionTitle eyebrow="Останні новини" title="Події" />
          {eventsStatus === 'loading' && <p>Завантаження подій…</p>}
          {eventsStatus === 'error' && <p role="alert">Не вдалося завантажити події з CMS.</p>}
          {eventsStatus === 'ready' && (events.length
            ? <div className="event-grid compact-grid">{events.map((event) => <EventCard key={event.documentId || event.id || event.slug} event={event} compact />)}</div>
            : <p>Подій поки немає.</p>)}
          <div className="center-action">
            <a className="soft-button" href="/events">Всі події <MaterialIcon name="grid_view" /></a>
          </div>
        </div>
      </section>

      <section className="page-section bordered" id="schedule">
        <div className="container">
          <SectionTitle eyebrow="Навчання" title="Розклад уроків" />
          <div className="filters">
            <label>
              <span>Клас</span>
              <select defaultValue="11 Клас">
                <option>Оберіть клас</option>
                <option>1 Клас</option>
                <option>5 Клас</option>
                <option>9 Клас</option>
                <option>11 Клас</option>
              </select>
            </label>
            <label>
              <span>Предмет</span>
              <select defaultValue="Всі предмети">
                <option>Всі предмети</option>
                <option>Математика</option>
                <option>Фізика</option>
                <option>Українська мова</option>
              </select>
            </label>
            <label>
              <span>Вчитель</span>
              <select defaultValue="Всі вчителі">
                <option>Всі вчителі</option>
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
                        <h4>{lesson.subject}</h4>
                        <p>{lesson.teacher}</p>
                      </article>
                    )) : <p className="empty-day">Немає уроків</p>}
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
            <h2>Контакти</h2>
            {profileStatus === 'loading' && <p>Завантаження контактів…</p>}
            {profileStatus === 'error' && <p role="alert">Не вдалося завантажити контакти з CMS.</p>}
            {profileStatus === 'ready' && !profile && <p>Контакти ще не додано.</p>}
            {profile && <>
              <div className="contact-list">
                {profile.address && <ContactItem icon="location_on" title="Адреса" text={profile.address} href={profile.mapUrl} />}
                {profile.phone && <ContactItem icon="call" title="Номер телефону" text={profile.phone} href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} />}
                {profile.email && <ContactItem icon="mail" title="Електронна пошта" text={profile.email} href={`mailto:${profile.email}`} />}
              </div>
              {profile.workingHours && <div className="hours">
                <span>Графік роботи</span>
                <strong>{profile.workingHours}</strong>
              </div>}
            </>}
          </div>
          {principal && <article className="principal-card">
            {mediaUrl(principal.photo) && <img src={mediaUrl(principal.photo)} alt={principal.name} />}
            <h3>{principal.name}</h3>
            <p className="accent">{principal.position}</p>
            {principal.bio && <p className="quote">{principal.bio}</p>}
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
