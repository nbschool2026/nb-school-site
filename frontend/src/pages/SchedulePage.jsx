import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalizedAll } from '../lib/api.js';
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

function matchClass(value, classes) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return classes.find((className) => className === raw || String(classNumber(className)) === raw.replace(/\D/g, '')) || raw;
}

function formatTime(value) {
  return String(value || '').slice(0, 5);
}

const lessonSlotByTime = {
  '08:15': 1, '08:55': 2, '09:45': 3, '10:30': 4, '11:15': 5, '12:00': 6,
  '12:45': 7, '13:30': 8, '14:15': 9, '15:00': 10, '15:45': 11, '16:30': 12,
};

function lessonSlot(lesson) {
  return Number(lesson.order) || lessonSlotByTime[formatTime(lesson.startTime)] || 0;
}

function uniqueLessons(records) {
  const seen = new Set();
  return records.filter((lesson) => {
    const key = [lesson.className, lesson.weekday, lesson.startTime, lesson.endTime, lesson.subject, lesson.teacher].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SchedulePage() {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedFilters = storedFilters();
  const hasSavedFilters = Object.keys(savedFilters).length > 0;
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || (hasSavedFilters ? savedFilters.className || '' : '5 Клас'));
  const [selectedTeacher, setSelectedTeacher] = useState(() => searchParams.get('teacher') || savedFilters.teacher || '');
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || savedFilters.subject || '');
  const [showGaps, setShowGaps] = useState(() => savedFilters.showGaps === true);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchCollectionLocalizedAll('/schedule-lessons', 'sort=order:asc', locale)
      .then((records) => {
        if (!active) return;
        setLessons(records.length ? uniqueLessons(records) : fallbackScheduleLessons);
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
    if (status === 'loading' || !classes.length) return;
    const normalizedClass = matchClass(selectedClass, classes);
    if (normalizedClass !== selectedClass) setSelectedClass(classes.includes(normalizedClass) ? normalizedClass : (classes.includes('5 Клас') ? '5 Клас' : ''));
    if (selectedTeacher && !teachers.includes(selectedTeacher)) setSelectedTeacher('');
    if (selectedSubject && !subjects.includes(selectedSubject)) setSelectedSubject('');
  }, [classes, selectedClass, status, subjects, selectedSubject, teachers, selectedTeacher]);

  useEffect(() => {
    try {
      localStorage.setItem(scheduleFilterStorageKey, JSON.stringify({
        className: selectedClass,
        teacher: selectedTeacher,
        subject: selectedSubject,
        showGaps,
      }));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [selectedClass, selectedSubject, selectedTeacher, showGaps]);

  const visibleLessons = useMemo(() => lessons
    .filter((lesson) => (!selectedClass || lesson.className === selectedClass)
      && (!selectedTeacher || lesson.teacher === selectedTeacher)
      && (!selectedSubject || lesson.subject === selectedSubject))
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')) || Number(a.order || 0) - Number(b.order || 0)), [lessons, selectedClass, selectedSubject, selectedTeacher]);

  const byDay = useMemo(() => weekdays.reduce((result, day) => {
    result[day] = visibleLessons.filter((lesson) => lesson.weekday === day);
    return result;
  }, {}), [visibleLessons]);
  const showClassOnCard = !selectedClass && !!selectedTeacher;

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

  const showGapOption = !selectedClass && !selectedSubject && !!selectedTeacher;

  function renderDayLessons(day) {
    const dayLessons = byDay[day];
    const content = [];
    let previousSlot = null;
    dayLessons.forEach((lesson) => {
      const slot = lessonSlot(lesson);
      if (showGapOption && showGaps && previousSlot !== null && slot > previousSlot + 1) {
        for (let gap = previousSlot + 1; gap < slot; gap += 1) {
          content.push(<div className="lesson-gap" key={`${day}-gap-${gap}`} aria-label={`${t('Вікно')} ${gap}`} />);
        }
      }
      content.push({ lesson, key: lesson.documentId || lesson.id || `${day}-${lesson.startTime}-${lesson.subject}-${lesson.className}` });
      previousSlot = Math.max(previousSlot ?? 0, slot);
    });
    return content.map((item) => item.lesson ? (
      <article className="lesson-card" key={item.key}>
        <span>{formatTime(item.lesson.startTime)} – {formatTime(item.lesson.endTime)}</span>
        {showClassOnCard && <p className="lesson-class">{item.lesson.className}</p>}
        <h4>{item.lesson.subject}</h4>
        {!showClassOnCard && item.lesson.teacher && <p>{item.lesson.teacher}</p>}
        {item.lesson.room && <p><MaterialIcon name="meeting_room" /> {item.lesson.room}</p>}
      </article>
    ) : item);
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
        {showGapOption && <label className="schedule-gap-toggle">
          <span>{t('Показати вікна')}</span>
          <input type="checkbox" checked={showGaps} onChange={(event) => setShowGaps(event.target.checked)} />
        </label>}

        {status === 'loading' && <p>{t('Завантаження розкладу…')}</p>}
        {status === 'ready' && !visibleLessons.length && <p>{t('Для цього класу розклад ще не додано.')}</p>}
        {status === 'ready' && !!visibleLessons.length && <div className="schedule-scroll">
          <div className="schedule-grid">
            {weekdays.map((day) => <section className="schedule-day" key={day}>
              <h3>{t(weekdayLabels[day])}</h3>
              <div className="lesson-list">{renderDayLessons(day)}</div>
            </section>)}
          </div>
        </div>}
      </div>
    </main>
  );
}
