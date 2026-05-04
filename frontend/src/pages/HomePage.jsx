import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollection, fetchSingle } from '../lib/api.js';
import { events as fallbackEvents, scheduleLessons, schoolProfile as fallbackProfile } from '../lib/fallbackData.js';

const weekdays = [
  ['monday', 'Понеділок'],
  ['tuesday', 'Вівторок'],
  ['wednesday', 'Середа'],
  ['thursday', 'Четвер'],
  ['friday', "П'ятниця"],
];

export default function HomePage() {
  const [profile, setProfile] = useState(fallbackProfile);
  const [events, setEvents] = useState(fallbackEvents);
  const [lessons, setLessons] = useState(scheduleLessons);

  useEffect(() => {
    fetchSingle('/school-profile').then((data) => data && setProfile(data));
    fetchCollection('/events', 'populate=cover&sort=date:desc&filters[featured][$eq]=true&pagination[limit]=4').then((data) => {
      if (data.length) setEvents(data);
    });
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

  return (
    <main>
      <section className="hero" style={{ backgroundImage: "linear-gradient(rgba(16, 22, 34, 0.62), rgba(16, 22, 34, 0.35)), url('/image/background.png')" }}>
        <div className="hero-content">
          <h1>{profile.heroTitle}</h1>
          <p>{profile.heroSubtitle}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#schedule">Відкрити нашу програму</a>
            <a className="ghost-button" href="/about">Віртуальний тур</a>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionTitle eyebrow="Останні новини" title="Події" />
          <div className="event-grid compact-grid">
            {events.slice(0, 4).map((event) => <EventCard key={event.documentId || event.id || event.slug} event={event} compact />)}
          </div>
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
        <div className="container contact-grid">
          <div>
            <h2>Контакти</h2>
            <div className="contact-list">
              <ContactItem icon="location_on" title="Адреса" text={profile.address} href={profile.mapUrl} />
              <ContactItem icon="call" title="Номер телефону" text={profile.phone} />
              <ContactItem icon="mail" title="Електронна пошта" text={profile.email} />
            </div>
            <div className="hours">
              <span>Графік роботи</span>
              <strong>{profile.workingHours}</strong>
            </div>
          </div>
          <article className="principal-card">
            <img src="/image/principal1.png" alt="Ракута Вікторія Миколаївна" />
            <h3>Ракута Вікторія Миколаївна</h3>
            <p className="accent">Шкільний директор</p>
            <p className="quote">"Наша місія — створити середовище, де кожен учень зможе розкрити свій максимальний потенціал."</p>
          </article>
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
