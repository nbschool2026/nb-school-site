import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

function inlineNodes(children, prefix) {
  return (children || []).map((child, index) => {
    const key = `${prefix}-${index}`;
    if (child.type === 'link') return <a key={key} href={child.url} target="_blank" rel="noreferrer">{inlineNodes(child.children, key)}</a>;
    const classNames = [child.bold && 'rich-bold', child.italic && 'rich-italic', child.underline && 'rich-underline'].filter(Boolean).join(' ');
    return <span key={key} className={classNames || undefined}>{child.text}</span>;
  });
}

function renderBlocks(value, keyPrefix) {
  if (!Array.isArray(value)) return value ? <p>{value}</p> : null;
  return value.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    if (block.type === 'heading') { const Tag = `h${Math.min(6, Math.max(1, block.level || 2))}`; return <Tag key={key}>{inlineNodes(block.children, key)}</Tag>; }
    if (block.type === 'quote') return <blockquote key={key}>{inlineNodes(block.children, key)}</blockquote>;
    if (block.type === 'list') { const Tag = block.format === 'ordered' ? 'ol' : 'ul'; return <Tag key={key}>{(block.children || []).map((item, i) => <li key={`${key}-${i}`}>{inlineNodes(item.children, `${key}-${i}`)}</li>)}</Tag>; }
    if (block.type === 'image' && block.image?.url) return <img key={key} src={block.image.url.startsWith('http') ? block.image.url : `${window.location.origin}${block.image.url}`} alt={block.image.alternativeText || ''} />;
    return <p key={key} style={block.alignment ? { textAlign: block.alignment } : undefined}>{inlineNodes(block.children, key)}</p>;
  });
}

export default function DistanceLearningPage() {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [status, setStatus] = useState('loading');
  const [grade, setGrade] = useState(() => searchParams.get('grade') || '');
  const [subject, setSubject] = useState(() => searchParams.get('subject') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');

  const updateQuery = (updates) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
      return next;
    }, { replace: true });
  };

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
          <label><span>{t('Пошук')}</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); updateQuery({ q: event.target.value }); }} placeholder={t('Пошук за темою або завданням')} /></label>
          <label><span>{t('Клас')}</span><select value={grade} onChange={(event) => { setGrade(event.target.value); setSubject(''); updateQuery({ grade: event.target.value, subject: '' }); }}><option value="">{t('Усі класи')}</option>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>{t('Предмет')}</span><select value={subject} onChange={(event) => { setSubject(event.target.value); updateQuery({ subject: event.target.value }); }}><option value="">{t('Усі предмети')}</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        {status === 'loading' && <p>{t('Завантаження матеріалів…')}</p>}
        {status === 'error' && <p role="alert">{t('Не вдалося завантажити матеріали з CMS.')}</p>}
        {status === 'ready' && !visible.length && <p>{t('Матеріалів за цими умовами не знайдено.')}</p>}
        <div className="distance-material-list">{visible.map((item) => <article className="distance-material-card" key={item.documentId || item.id}>
          <div className="distance-material-meta"><span>{item.grade}</span><span>{item.subject}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA')}</time></div>
          <h3>{item.topic}</h3>
          {item.content && <div className="distance-material-content">{renderBlocks(item.content, item.documentId || item.id)}</div>}
          {item.videoUrl && <a className="text-link" href={item.videoUrl} target="_blank" rel="noreferrer"><MaterialIcon name="play_circle" />{t('Відкрити відео')}</a>}
        </article>)}</div>
      </div>
    </section>
  </main>;
}
