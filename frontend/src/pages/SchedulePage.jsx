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
function timeMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isLessonCurrent(lesson, now) {
  const dayIndex = now.getDay();
  if (dayIndex < 1 || dayIndex > 5 || lesson.weekday !== weekdays[dayIndex - 1]) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeMinutes(lesson.startTime);
  const end = timeMinutes(lesson.endTime);
  return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
}

const lessonSlotByTime = {
  '08:15': 1, '08:55': 2, '09:45': 3, '10:30': 4, '11:15': 5, '12:00': 6,
  '12:45': 7, '13:30': 8, '14:15': 9, '15:00': 10, '15:45': 11, '16:30': 12,
};

function lessonSlot(lesson) {
  return Number(lesson.order) || lessonSlotByTime[formatTime(lesson.startTime)] || 0;
}

function overlaps(first, second) {
  const firstStart = timeMinutes(first.startTime);
  const firstEnd = timeMinutes(first.endTime);
  const secondStart = timeMinutes(second.startTime);
  const secondEnd = timeMinutes(second.endTime);
  return firstStart !== null && firstEnd !== null && secondStart !== null && secondEnd !== null
    && firstStart < secondEnd && secondStart < firstEnd;
}

function findConflicts(records) {
  const groups = [
    { type: 'Клас', key: (lesson) => lesson.className },
    { type: 'Вчитель', key: (lesson) => lesson.teacher },
    { type: 'Кабінет', key: (lesson) => lesson.room },
  ];
  const conflicts = [];
  groups.forEach((group) => {
    weekdays.forEach((day) => {
      const grouped = new Map();
      records.filter((lesson) => lesson.weekday === day && group.key(lesson)).forEach((lesson) => {
        const key = group.key(lesson);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(lesson);
      });
      grouped.forEach((dayLessons, key) => {
        const sorted = [...dayLessons].sort((a, b) => (timeMinutes(a.startTime) ?? 9999) - (timeMinutes(b.startTime) ?? 9999));
        for (let index = 0; index < sorted.length; index += 1) {
          for (let next = index + 1; next < sorted.length; next += 1) {
            if (overlaps(sorted[index], sorted[next])) conflicts.push({ type: group.type, key, day, first: sorted[index], second: sorted[next] });
          }
        }
      });
    });
  });
  return conflicts;
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
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [editAccess, setEditAccess] = useState('checking');
  const [editingEnabled, setEditingEnabled] = useState(false);

  useEffect(() => {
    const adminBase = (import.meta.env.VITE_STRAPI_API_URL || '/api').replace(/\/api\/?$/, '');
    const jwtToken = localStorage.getItem('jwtToken') || '';
    const hasSession = Boolean(jwtToken) || /(?:^|;\s*)(?:sessionId|strapi_admin_session|admin_auth)=/i.test(document.cookie);
    const headers = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
    fetch(adminBase + '/admin/schedule-lessons/auth-status', { credentials: 'include', headers })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          if (hasSession) window.alert('Сесія завершилася. Залогіньтесь знову.');
          setEditAccess('none');
          return null;
        }
        if (!response.ok) throw new Error('auth status failed');
        return response.json();
      })
      .then((result) => {
        if (result) setEditAccess(result.canEdit ? 'allowed' : 'none');
      })
      .catch(() => setEditAccess('none'));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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
  const conflicts = useMemo(() => findConflicts(lessons), [lessons]);
  const [showConflicts, setShowConflicts] = useState(false);
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

  const showGapOption = !selectedSubject
    && ((!selectedClass && !!selectedTeacher) || (!!selectedClass && !selectedTeacher));

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
      <article className={`lesson-card${isLessonCurrent(item.lesson, currentTime) ? ' is-current' : ''}`} key={item.key} aria-current={isLessonCurrent(item.lesson, currentTime) ? 'time' : undefined}>
        {editingEnabled && <span className="lesson-edit-icon" title="Редагувати урок"><MaterialIcon name="edit" /></span>}
        <span>{formatTime(item.lesson.startTime)} – {formatTime(item.lesson.endTime)}</span>
        {showClassOnCard && <p className="lesson-class">{item.lesson.className}</p>}
        <h4>{item.lesson.subject}</h4>
        {!showClassOnCard && item.lesson.teacher && <p>{item.lesson.teacher}</p>}
        {item.lesson.inShelter && <p className="lesson-shelter">{t('Укриття')}</p>}
        {item.lesson.room && <p><MaterialIcon name="meeting_room" /> {item.lesson.room}</p>}
      </article>
    ) : item);
  }

  return (
    <main className="page-main">
      <div className="container">
        <SectionTitle title={t('Розклад уроків')} subtitle={t('Розклад занять за класами та днями тижня.')} center />
        {editAccess === 'allowed' && <div className="schedule-edit-action">
          <button type="button" className="soft-button" onClick={() => setEditingEnabled((enabled) => !enabled)} aria-pressed={editingEnabled}>
            <MaterialIcon name={editingEnabled ? 'visibility_off' : 'edit'} />
            {editingEnabled ? t('Завершити редагування') : t('Редагувати')}
          </button>
        </div>}
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
        {status === 'ready' && <div className="schedule-conflicts-action">
          <button type="button" className="soft-button" onClick={() => setShowConflicts((shown) => !shown)} aria-expanded={showConflicts}>
            <MaterialIcon name={showConflicts ? 'expand_less' : 'warning'} />
            {showConflicts ? t('Приховати конфлікти') : t('Показати конфлікти')}
            {conflicts.length > 0 && <span className="schedule-conflict-count">{conflicts.length}</span>}
          </button>
        </div>}
        {showConflicts && <section className="schedule-conflicts" aria-live="polite">
          <h2>{t('Конфлікти розкладу')}</h2>
          {!conflicts.length && <p>{t('Конфліктів не знайдено.')}</p>}
          {!!conflicts.length && <div className="schedule-conflict-list">
            {conflicts.map((conflict, index) => <article className="schedule-conflict" key={`${conflict.type}-${conflict.key}-${conflict.day}-${index}`}>
              <strong>{t(`Конфлікт: ${conflict.type}`)} — {conflict.key}</strong>
              <span>{t(weekdayLabels[conflict.day])}, {formatTime(conflict.first.startTime)} – {formatTime(conflict.first.endTime)}</span>
              <p>{conflict.first.className} · {conflict.first.subject}{conflict.first.teacher ? ` · ${conflict.first.teacher}` : ''}</p>
              <p>{conflict.second.className} · {conflict.second.subject}{conflict.second.teacher ? ` · ${conflict.second.teacher}` : ''}</p>
            </article>)}
          </div>}
        </section>}
      </div>
    </main>
  );
}
