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
const scheduleFilterStorageKey = 'nb-school-schedule-filters';

function storedFilters() {
  try {
    return JSON.parse(localStorage.getItem(scheduleFilterStorageKey) || '{}');
  } catch {
    return {};
  }
}

function classNumber(value) {
  return Number(String(value || '').match(/\d+/)?.[0] || 999);
}

function formatTime(value) {
  return String(value || '').slice(0, 5);
}

export default function SchedulePage() {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedFilters = storedFilters();
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || savedFilters.className || '5 Клас');
  const [selectedTeacher, setSelectedTeacher] = useState(() => searchParams.get('teacher') || savedFilters.teacher || '');
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || savedFilters.subject || '');

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

  const teachers = useMemo(() => [...new Set(lessons.map((lesson) => lesson.teacher).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'uk')), [lessons]);
  const subjects = useMemo(() => [...new Set(lessons.map((lesson) => lesson.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'uk')), [lessons]);

  useEffect(() => {
    if (selectedClass && !classes.includes(selectedClass)) setSelectedClass(classes.includes('5 Клас') ? '5 Клас' : '');
    if (selectedTeacher && !teachers.includes(selectedTeacher)) setSelectedTeacher('');
    if (selectedSubject && !subjects.includes(selectedSubject)) setSelectedSubject('');
  }, [classes, selectedClass, subjects, selectedSubject, teachers, selectedTeacher]);

  useEffect(() => {
    try {
      localStorage.setItem(scheduleFilterStorageKey, JSON.stringify({
        className: selectedClass,
        teacher: selectedTeacher,
        subject: selectedSubject,
      }));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [selectedClass, selectedSubject, selectedTeacher]);

  const visibleLessons = useMemo(() => lessons
    .filter((lesson) => (!selectedClass || lesson.className === selectedClass)
      && (!selectedTeacher || lesson.teacher === selectedTeacher)
      && (!selectedSubject || lesson.subject === selectedSubject))
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')) || Number(a.order || 0) - Number(b.order || 0)), [lessons, selectedClass, selectedSubject, selectedTeacher]);

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

  function selectFilter(key, setter) {
    return (event) => {
      const next = event.target.value;
      setter(next);
      setSearchParams((current) => {
        if (next) current.set(key, next);
        else current.delete(key);
        return current;
      }, { replace: true });
    };
  }

  return (
    <main className="page-main">
      <div className="container">
        <SectionTitle title={t('Розклад уроків')} subtitle={t('Розклад занять за класами та днями тижня.')} center />
        <div className="filters schedule-filters">
          <label>
            {t('Клас')}
            <select value={selectedClass} onChange={selectClass}>
              <option value="">{t('Усі класи')}</option>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
          <label>
            {t('Предмет')}
            <select value={selectedSubject} onChange={selectFilter('subject', setSelectedSubject)}>
              <option value="">{t('Усі предмети')}</option>
              {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </label>
          <label>
            {t('Вчитель')}
            <select value={selectedTeacher} onChange={selectFilter('teacher', setSelectedTeacher)}>
              <option value="">{t('Усі вчителі')}</option>
              {teachers.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
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
