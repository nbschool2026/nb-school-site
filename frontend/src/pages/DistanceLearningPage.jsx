import React, { useEffect, useMemo, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function DistanceLearningPage() {
  const { locale, t } = useLocale();
  const [materials, setMaterials] = useState([]);
  const [status, setStatus] = useState('loading');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchCollectionLocalized('/distance-learning-materials', 'sort=date:desc&pagination[pageSize]=500', locale)
      .then((data) => { if (active) { setMaterials(data); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  const grades = useMemo(() => [...new Set(materials.map((item) => item.grade).filter(Boolean))].sort(), [materials]);
  const subjects = useMemo(() => [...new Set(materials
    .filter((item) => !grade || item.grade === grade)
    .map((item) => item.subject).filter(Boolean))].sort(), [materials, grade]);
  const query = search.trim().toLocaleLowerCase('uk');
  const visible = materials.filter((item) => {
    const text = [item.grade, item.subject, item.topic, item.content].filter(Boolean).join(' ').toLocaleLowerCase('uk');
    return (!grade || item.grade === grade) && (!subject || item.subject === subject) && (!query || text.includes(query));
  });

  return <main>
    <section className="info-hero">
      <div className="container">
        <div className="pill"><MaterialIcon name="laptop_chromebook" /> {t('Навчання')}</div>
        <h1>{t('Дистанційне навчання')}</h1>
        <p>{t('Матеріали, теми та завдання для учнів за класами й предметами.')}</p>
      </div>
    </section>
    <section className="page-section">
      <div className="container">
        <SectionTitle title={t('Матеріали дистанційного навчання')} />
        <div className="public-info-filters" role="search">
          <label><span>{t('Пошук')}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Пошук за темою або завданням')} /></label>
          <label><span>{t('Клас')}</span><select value={grade} onChange={(event) => { setGrade(event.target.value); setSubject(''); }}><option value="">{t('Усі класи')}</option>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>{t('Предмет')}</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">{t('Усі предмети')}</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        {status === 'loading' && <p>{t('Завантаження матеріалів…')}</p>}
        {status === 'error' && <p role="alert">{t('Не вдалося завантажити матеріали з CMS.')}</p>}
        {status === 'ready' && !visible.length && <p>{t('Матеріалів за цими умовами не знайдено.')}</p>}
        <div className="distance-material-list">{visible.map((item) => <article className="distance-material-card" key={item.documentId || item.id}>
          <div className="distance-material-meta"><span>{item.grade}</span><span>{item.subject}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA')}</time></div>
          <h3>{item.topic}</h3>
          {item.content && <p>{item.content}</p>}
          {item.videoUrl && <a className="text-link" href={item.videoUrl} target="_blank" rel="noreferrer"><MaterialIcon name="play_circle" />{t('Відкрити відео')}</a>}
        </article>)}</div>
      </div>
    </section>
  </main>;
}
