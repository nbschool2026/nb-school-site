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

const secondaryTimeSlots = [
  ['08:15:00', '08:50:00'], ['08:55:00', '09:40:00'], ['09:45:00', '10:25:00'],
  ['10:30:00', '11:10:00'], ['11:15:00', '11:55:00'], ['12:00:00', '12:40:00'],
  ['12:45:00', '13:25:00'], ['13:30:00', '14:10:00'], ['14:15:00', '14:55:00'],
  ['15:00:00', '15:40:00'], ['15:45:00', '16:25:00'], ['16:30:00', '17:10:00'],
];
const primaryTimeSlots = {
  1: [['08:00:00', '08:35:00'], ['08:40:00', '09:15:00'], ['09:25:00', '10:05:00'], ['10:10:00', '10:45:00']],
  2: [['08:00:00', '08:35:00'], ['08:40:00', '09:15:00'], ['09:25:00', '10:05:00'], ['10:10:00', '10:45:00']],
  3: [['10:45:00', '11:20:00'], ['11:25:00', '12:00:00'], ['12:05:00', '12:40:00'], ['12:45:00', '13:20:00']],
  4: [['10:45:00', '11:15:00'], ['11:20:00', '12:00:00'], ['12:05:00', '12:45:00'], ['12:50:00', '13:25:00']],
};
function timeSlotsForClass(className) {
  return primaryTimeSlots[classNumber(className)] || secondaryTimeSlots;
}

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
  const [openEditKey, setOpenEditKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [conflictPrompt, setConflictPrompt] = useState(null);

  useEffect(() => {
    const adminBase = (import.meta.env.VITE_STRAPI_API_URL || '/api').replace(/\/api\/?$/, '');
    const findStoredToken = () => {
      const knownKeys = ['jwtToken', 'strapi_jwt', 'strapi-admin-jwt', 'strapi-admin-token', 'adminToken'];
      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (const key of knownKeys) {
          const value = storage.getItem(key);
          if (value) return value;
        }
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index) || '';
          const value = storage.getItem(key) || '';
          if (/(jwt|token|session)/i.test(key) && value.split('.').length === 3) return value;
        }
      }
      // Strapi's admin panel stores jwtToken in a non-HttpOnly cookie in some
      // versions and then sends it as an Authorization header.
      const cookieToken = document.cookie.split(';').map((part) => part.trim())
        .find((part) => part.startsWith('jwtToken='));
      if (cookieToken) return decodeURIComponent(cookieToken.slice('jwtToken='.length));
      return '';
    };
    const jwtToken = findStoredToken();
    const hasSession = Boolean(jwtToken) || /(?:^|;\s*)(?:sessionId|strapi[_-]admin[_-]session|admin[_-]auth|strapi[_-]jwt)=/i.test(document.cookie);
    const headers = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
    const request = (url) => fetch(url, { credentials: 'include', headers });
    const roleCanEdit = (payload) => {
      const user = payload?.data || payload || {};
      const roles = [
        ...(Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : []),
        ...(user.role ? [user.role] : []),
      ];
      if (!roles.length) return true;
      return roles.some((role) => {
        const value = `${role?.code || ''} ${role?.name || ''}`.toLowerCase().replace(/[^a-zа-яіїєґ]+/g, '');
        return value.includes('superadmin') || value.includes('editor');
      });
    };

    // Strapi admin sessions are often HttpOnly cookies with an /admin path.
    // Calling the standard endpoint directly lets the browser send that cookie.
    request(adminBase + '/admin/users/me')
      .then(async (meResponse) => {
        if (meResponse.ok) {
          const me = await meResponse.json();
          setEditAccess(roleCanEdit(me) ? 'allowed' : 'none');
          return;
        }
        // /admin/users/me expects an Authorization header. Fall back to the
        // custom status route, which validates Strapi's /admin cookie itself.
        const statusResponse = await request(adminBase + '/admin/schedule-lessons/auth-status');
        if (statusResponse.ok) {
          const result = await statusResponse.json();
          setEditAccess(result.canEdit ? 'allowed' : 'none');
          return;
        }
        if (meResponse.status === 401 || meResponse.status === 403 || statusResponse.status === 401 || statusResponse.status === 403) {
          if (hasSession) window.alert('Сесія завершилася. Залогіньтесь знову.');
          setEditAccess('none');
          return;
        }
        throw new Error('auth status failed');
      })
      .catch(() => setEditAccess('none'));
  }, []);

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (event.target.closest('.lesson-edit-menu, .lesson-edit-icon')) return;
      setOpenEditKey(null);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
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

  function openEditForm(lesson) {
    setOpenEditKey(null);
    setConflictPrompt(null);
    setEditingLesson(lesson);
    setEditForm({
      className: lesson.className || '',
      weekday: lesson.weekday || 'monday',
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      subject: lesson.subject || '',
      teacher: lesson.teacher || '',
      order: lesson.order ?? '',
      inShelter: lesson.inShelter === true,
    });
  }

  function closeEditForm() {
    if (savingEdit) return;
    setEditingLesson(null);
    setEditForm(null);
    setConflictPrompt(null);
  }

  function editField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function formTimeOptions() {
    return timeSlotsForClass(editForm?.className || '5 Клас');
  }

  function editTeacherOptions() {
    if (!editForm?.subject) return teachers;
    const subjectTeachers = [...new Set(lessons
      .filter((lesson) => lesson.subject === editForm.subject && lesson.teacher)
      .map((lesson) => lesson.teacher))].sort((a, b) => a.localeCompare(b, 'uk'));
    return subjectTeachers;
  }

  async function saveLesson(force = false) {
    if (!editingLesson || !editForm || savingEdit) return;
    const duplicate = lessons.find((lesson) => lesson.documentId !== editingLesson.documentId
      && lesson.className === editForm.className
      && lesson.weekday === editForm.weekday
      && lesson.startTime === editForm.startTime
      && lesson.endTime === editForm.endTime
      && lesson.subject === editForm.subject
      && (lesson.teacher || '') === (editForm.teacher || ''));
    if (duplicate) {
      window.alert('Такий урок вже є.');
      return;
    }
    const overlapping = lessons.filter((lesson) => lesson.documentId !== editingLesson.documentId
      && lesson.weekday === editForm.weekday
      && overlaps({ startTime: editForm.startTime, endTime: editForm.endTime }, lesson)
      && (lesson.className === editForm.className || (editForm.teacher && lesson.teacher === editForm.teacher)));
    if (overlapping.length && !force) {
      setConflictPrompt(overlapping);
      return;
    }
    setSavingEdit(true);
    try {
      const adminBase = (import.meta.env.VITE_STRAPI_API_URL || '/api').replace(/\/api\/?$/, '');
      const response = await fetch(`${adminBase}/admin/schedule-lessons/${encodeURIComponent(editingLesson.documentId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (response.status === 401 || response.status === 403) {
        window.alert('Сесія завершилася. Залогіньтесь знову.');
        return;
      }
      if (!response.ok) throw new Error('update failed');
      setLessons((current) => current.map((lesson) => lesson.documentId === editingLesson.documentId
        ? { ...lesson, ...editForm, order: editForm.order === '' ? null : Number(editForm.order) }
        : lesson));
      closeEditForm();
    } catch {
      window.alert('Не вдалося зберегти урок. Спробуйте ще раз.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteLesson(lesson, key) {
    if (!lesson.documentId || deletingKey) return;
    if (!window.confirm('Ви впевнені, що хочете видалити цей урок?')) return;
    setDeletingKey(key);
    try {
      const adminBase = (import.meta.env.VITE_STRAPI_API_URL || '/api').replace(/\/api\/?$/, '');
      const response = await fetch(`${adminBase}/admin/schedule-lessons/${encodeURIComponent(lesson.documentId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        window.alert('Сесія завершилася. Залогіньтесь знову.');
        return;
      }
      if (!response.ok) throw new Error('delete failed');
      setLessons((current) => current.filter((item) => item.documentId !== lesson.documentId));
      setOpenEditKey(null);
    } catch {
      window.alert('Не вдалося видалити урок. Спробуйте ще раз.');
    } finally {
      setDeletingKey(null);
    }
  }

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
        {editingEnabled && <>
          <button type="button" className="lesson-edit-icon" title="Редагувати урок" aria-label="Редагувати урок" onClick={() => setOpenEditKey((current) => current === item.key ? null : item.key)}>
            <MaterialIcon name="edit" />
          </button>
          {openEditKey === item.key && <div className="lesson-edit-menu">
            <button type="button" className="lesson-edit-action" onClick={() => openEditForm(item.lesson)}>{t('Редагувати')}</button>
            <button type="button" className="lesson-delete-action" onClick={() => deleteLesson(item.lesson, item.key)} disabled={deletingKey === item.key}>{deletingKey === item.key ? t('Видалення…') : t('Видалити')}</button>
          </div>}
        </>}
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
        {editingLesson && editForm && <div className="schedule-modal-backdrop" role="presentation">
          <section className="schedule-edit-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-edit-title">
            <h2 id="schedule-edit-title">{t('Редагувати урок')}</h2>
            <label>{t('Клас')}
              <select value={editForm.className} onChange={(event) => {
                const className = event.target.value;
                const nextSlots = timeSlotsForClass(className);
                const stillAvailable = nextSlots.some(([start, end]) => start === editForm.startTime && end === editForm.endTime);
                setEditForm((current) => ({ ...current, className, ...(stillAvailable ? {} : { startTime: nextSlots[0][0], endTime: nextSlots[0][1] }) }));
              }}>
                {classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </label>
            <label>{t('День тижня')}
              <select value={editForm.weekday} onChange={(event) => editField('weekday', event.target.value)}>
                {weekdays.map((day) => <option key={day} value={day}>{t(weekdayLabels[day])}</option>)}
              </select>
            </label>
            <label>{t('Час')}
              <select value={`${editForm.startTime}|${editForm.endTime}`} onChange={(event) => {
                const [startTime, endTime] = event.target.value.split('|');
                setEditForm((current) => ({ ...current, startTime, endTime }));
              }}>
                {formTimeOptions().map(([startTime, endTime]) => <option key={`${startTime}|${endTime}`} value={`${startTime}|${endTime}`}>{formatTime(startTime)} – {formatTime(endTime)}</option>)}
              </select>
            </label>
            <label>{t('Номер уроку')} <span className="schedule-form-optional">({t('необов’язково')})</span>
              <select value={editForm.order} onChange={(event) => editField('order', event.target.value)}>
                <option value="">{t('Не змінювати')}</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
              </select>
            </label>
            <label>{t('Предмет')}
              <select value={editForm.subject} onChange={(event) => {
                const subject = event.target.value;
                const subjectTeachers = lessons.filter((lesson) => lesson.subject === subject).map((lesson) => lesson.teacher).filter(Boolean);
                setEditForm((current) => ({ ...current, subject, teacher: subjectTeachers.includes(current.teacher) ? current.teacher : '' }));
              }}>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label>{t('Вчитель')}
              <select value={editForm.teacher || '__all__'} onChange={(event) => editField('teacher', event.target.value === '__all__' ? '' : event.target.value)}>
                <option value="__all__">{t('Показати всіх вчителів')}</option>
                {editTeacherOptions().filter((teacher) => teacher !== editForm.teacher).map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
                {editForm.teacher && !editTeacherOptions().includes(editForm.teacher) && <option value={editForm.teacher}>{editForm.teacher}</option>}
              </select>
            </label>
            <label className="schedule-shelter-toggle"><input type="checkbox" checked={editForm.inShelter} onChange={(event) => editField('inShelter', event.target.checked)} /> {t('В укритті')}</label>
            <div className="schedule-modal-actions">
              <button type="button" className="soft-button" onClick={closeEditForm} disabled={savingEdit}>{t('Скасувати')}</button>
              <button type="button" className="primary-button" onClick={() => saveLesson(false)} disabled={savingEdit}>{savingEdit ? t('Збереження…') : t('Зберегти')}</button>
            </div>
          </section>
        </div>}
        {conflictPrompt && <div className="schedule-modal-backdrop" role="presentation">
          <section className="schedule-edit-modal schedule-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-conflict-title">
            <h2 id="schedule-conflict-title">{t('Конфлікт розкладу')}</h2>
            <p>{t('Вибраний час і день тижня співпадає або накладається з уроком:')}</p>
            <div className="schedule-conflict-list">
              {conflictPrompt.map((lesson, index) => <p key={`${lesson.documentId || index}-conflict`}><strong>{t(weekdayLabels[lesson.weekday])} {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}</strong> · {lesson.subject}{lesson.teacher ? ` · ${lesson.teacher}` : ''}</p>)}
            </div>
            <p>{t('Ви впевнені, що хочете зберегти урок?')}</p>
            <div className="schedule-modal-actions">
              <button type="button" className="soft-button" onClick={() => setConflictPrompt(null)} disabled={savingEdit}>{t('Ні')}</button>
              <button type="button" className="primary-button" onClick={() => { setConflictPrompt(null); saveLesson(true); }} disabled={savingEdit}>{t('Так')}</button>
            </div>
          </section>
        </div>}
      </div>
    </main>
  );
}
