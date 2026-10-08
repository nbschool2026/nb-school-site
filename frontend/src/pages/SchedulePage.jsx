import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { scheduleLessons as fallbackScheduleLessons } from '../lib/fallbackData.js';
import { useLocale } from '../lib/locale.jsx';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const weekdayLabels = {
  monday: 'Понеділок',
  tuesday: 'Вівторок',
  wednesday: 'Середа',
  thursday: 'Четвер',
  friday: 'П’ятниця',
};

function classNumber(value) {
  return Number(String(value || '').match(/\d+/)?.[0] || 999);
}

function formatTime(value) {
  return String(value || '').slice(0, 5);
}

export default function SchedulePage() {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || '');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchCollectionLocalized('/schedule-lessons', 'sort=order:asc&pagination[pageSize]=500', locale)
      .then((records) => {
        if (!active) return;
        setLessons(records.length ? records : fallbackScheduleLessons);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setLessons(fallbackScheduleLessons);
        setStatus('ready');
      });
    return () => { active = false; };
  }, [locale]);

  const classes = useMemo(() => [...new Set(lessons.map((lesson) => lesson.className).filter(Boolean))]
    .sort((a, b) => classNumber(a) - classNumber(b)), [lessons]);

  useEffect(() => {
    if (selectedClass && classes.includes(selectedClass)) return;
    if (classes.length) {
      const next = classes[0];
      setSelectedClass(next);
      setSearchParams((current) => { current.set('class', next); return current; }, { replace: true });
    }
  }, [classes, selectedClass, setSearchParams]);

  const visibleLessons = useMemo(() => lessons
    .filter((lesson) => !selectedClass || lesson.className === selectedClass)
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')) || Number(a.order || 0) - Number(b.order || 0)), [lessons, selectedClass]);

  const byDay = useMemo(() => weekdays.reduce((result, day) => {
    result[day] = visibleLessons.filter((lesson) => lesson.weekday === day);
    return result;
  }, {}), [visibleLessons]);

  function selectClass(event) {
    const next = event.target.value;
    setSelectedClass(next);
    setSearchParams((current) => {
      if (next) current.set('class', next);
      else current.delete('class');
      return current;
    }, { replace: true });
  }

  return (
    <main className="page-main">
      <div className="container">
        <SectionTitle title={t('Розклад уроків')} subtitle={t('Розклад занять за класами та днями тижня.')} center />
        <div className="filters schedule-filters">
          <label>
            {t('Клас')}
            <select value={selectedClass} onChange={selectClass}>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
        </div>

        {status === 'loading' && <p>{t('Завантаження розкладу…')}</p>}
        {status === 'ready' && !visibleLessons.length && <p>{t('Для цього класу розклад ще не додано.')}</p>}
        {status === 'ready' && !!visibleLessons.length && <div className="schedule-scroll">
          <div className="schedule-grid">
            {weekdays.map((day) => <section className="schedule-day" key={day}>
              <h3>{t(weekdayLabels[day])}</h3>
              <div className="lesson-list">
                {byDay[day].map((lesson) => <article className="lesson-card" key={lesson.documentId || lesson.id || `${day}-${lesson.startTime}-${lesson.subject}`}>
                  <span>{formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}</span>
                  <h4>{lesson.subject}</h4>
                  {lesson.teacher && <p>{lesson.teacher}</p>}
                  {lesson.room && <p><MaterialIcon name="meeting_room" /> {lesson.room}</p>}
                </article>)}
              </div>
            </section>)}
          </div>
        </div>}
      </div>
    </main>
  );
}
