import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionLocalized, fetchSingleLocalized, mediaUrl } from '../lib/api.js';
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

const gradeColors = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#9333ea', '#0f766e', '#c2410c', '#4f46e5', '#be123c'];
const subjectColors = ['#2563eb', '#d97706', '#16a34a', '#7c3aed', '#0891b2', '#dc2626', '#9333ea', '#0f766e'];

function colorFor(value, palette) {
  const hash = String(value || '').split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function gradeColor(value) {
  const match = String(value || '').match(/\d+/);
  const index = match ? Number(match[0]) - 1 : 0;
  return gradeColors[Math.max(0, Math.min(gradeColors.length - 1, index))];
}
function youtubeEmbed(url) {
  const match = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

export default function DistanceLearningPage() {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [heroImage, setHeroImage] = useState('');
  const [heroTextColor, setHeroTextColor] = useState('#ffffff');
  const [status, setStatus] = useState('loading');
  const [grade, setGrade] = useState(() => searchParams.get('grade') || '');
  const [subject, setSubject] = useState(() => searchParams.get('subject') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const hasAutoScrolled = useRef(false);
  const [pinnedId, setPinnedId] = useState(() => {
    const fromUrl = (searchParams.get('pinned') || '').split(',').filter(Boolean)[0] || '';
    let stored = '';
    try {
      const value = JSON.parse(localStorage.getItem('distance-learning-pinned') || '""');
      stored = Array.isArray(value) ? (value[0] || '') : String(value || '');
    } catch { stored = ''; }
    return fromUrl || stored;
  });
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem('distance-learning-completed') || '[]');
      return new Set(Array.isArray(value) ? value : []);
    } catch { return new Set(); }
  });

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
    fetchCollectionLocalized('/distance-learning-materials', 'sort=date:desc&populate[videos]=*&pagination[pageSize]=500', locale)
      .then((data) => { if (active) { setMaterials(data); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  useEffect(() => {
    fetchSingleLocalized('/school-profile', 'populate[0]=distanceLearningImage', locale)
      .then((profile) => { setHeroImage(mediaUrl(profile?.distanceLearningImage)); setHeroTextColor(profile?.distanceLearningTextColor || '#ffffff'); })
      .catch(() => setHeroImage(''));
  }, [locale]);

  const togglePinned = (id) => {
    const next = pinnedId === id ? '' : id;
    setPinnedId(next);
    localStorage.setItem('distance-learning-pinned', JSON.stringify(next));
    setSearchParams((currentParams) => {
      const params = new URLSearchParams(currentParams);
      if (next) params.set('pinned', next); else params.delete('pinned');
      return params;
    }, { replace: true });
  };

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleCompleted = (id) => {
    setCompletedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('distance-learning-completed', JSON.stringify([...next]));
      return next;
    });
  };

  const grades = useMemo(() => [...new Set(materials.map((item) => item.grade).filter(Boolean))].sort((a, b) => (Number(a.match(/\d+/)?.[0]) || 99) - (Number(b.match(/\d+/)?.[0]) || 99)), [materials]);
  const subjects = useMemo(() => [...new Set(materials
    .filter((item) => !grade || item.grade === grade)
    .map((item) => item.subject).filter(Boolean))].sort(), [materials, grade]);
  const query = search.trim().toLocaleLowerCase('uk');
  const visible = materials.filter((item) => {
    const text = [item.grade, item.subject, item.topic, item.content].filter(Boolean).join(' ').toLocaleLowerCase('uk');
    return (!grade || item.grade === grade) && (!subject || item.subject === subject) && (!query || text.includes(query));
  });

  useEffect(() => {
    if (status !== 'ready' || hasAutoScrolled.current || !pinnedId) return;
    const firstPinned = visible.find((item) => pinnedId === (item.documentId || String(item.id)));
    if (!firstPinned) return;
    const elementId = `distance-material-${firstPinned.documentId || firstPinned.id}`;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
        const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
      hasAutoScrolled.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [status, visible, pinnedId]);

  return <main>
    <section className="info-hero distance-learning-hero" style={{ '--distance-learning-hero-image': heroImage ? `url("${heroImage}")` : 'none', '--distance-learning-text-color': heroTextColor }}>
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
        <div className="distance-learning-results-bar">
          <strong>{t('Знайдено матеріалів')}: {visible.length}</strong>
          {(query || grade || subject) && <div className="distance-learning-filter-chips" aria-label={t('Активні фільтри')}>
            {query && <button type="button" onClick={() => { setSearch(''); updateQuery({ q: '' }); }}>Пошук: {search} ×</button>}
            {grade && <button type="button" onClick={() => { setGrade(''); setSubject(''); updateQuery({ grade: '', subject: '' }); }}>{grade} ×</button>}
            {subject && <button type="button" onClick={() => { setSubject(''); updateQuery({ subject: '' }); }}>{subject} ×</button>}
          </div>}
        </div>        {status === 'loading' && <p>{t('Завантаження матеріалів…')}</p>}
        {status === 'error' && <p role="alert">{t('Не вдалося завантажити матеріали з CMS.')}</p>}
        {status === 'ready' && !visible.length && <p>{t('Матеріалів за цими умовами не знайдено.')}</p>}
        <div className="distance-material-list">{visible.map((item) => <article id={`distance-material-${item.documentId || item.id}`} className={`distance-material-card${pinnedId === (item.documentId || String(item.id)) ? ' is-pinned' : ''}${completedIds.has(item.documentId || String(item.id)) ? ' is-completed' : ''}`} key={item.documentId || item.id}>
          {completedIds.has(item.documentId || String(item.id)) && <span className="distance-material-completed-indicator" title="Виконано" aria-label="Виконано"><MaterialIcon name="check_circle" /></span>}
          <div className="distance-material-meta"><span className="distance-material-grade" style={{ "--badge-color": gradeColor(item.grade) }}>{item.grade}</span><span className="distance-material-subject" style={{ "--badge-color": colorFor(item.subject, subjectColors) }}>{item.subject}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(locale === 'en' ? 'en-GB' : 'uk-UA')}</time></div>
          <div className="distance-material-actions">
            <button type="button" className="distance-material-pin" onClick={() => togglePinned(item.documentId || String(item.id))} aria-pressed={pinnedId === (item.documentId || String(item.id))}><MaterialIcon name="push_pin" />{pinnedId === (item.documentId || String(item.id)) ? 'Закріплено' : 'Закріпити'}</button>
            <button type="button" className="distance-material-complete" onClick={() => toggleCompleted(item.documentId || String(item.id))} aria-pressed={completedIds.has(item.documentId || String(item.id))}><MaterialIcon name="check_circle" />{completedIds.has(item.documentId || String(item.id)) ? 'Виконано' : 'Позначити виконаним'}</button>
          </div>
          <h3>{item.topic}</h3>
          <div className={`distance-material-body${expandedIds.has(item.documentId || String(item.id)) ? ' is-expanded' : ''}`}>
            {item.content && <div className="distance-material-content">{renderBlocks(item.content, item.documentId || item.id)}</div>}
            {!!(item.videos?.length || item.videoUrl) && <div className="distance-material-videos">{(item.videos?.length ? item.videos : [{ url: item.videoUrl }]).map((video, index) => { const embed = youtubeEmbed(video.url); return <div className="distance-material-video" key={`${item.documentId || item.id}-video-${index}`}>{video.title && <h4>{video.title}</h4>}{embed ? <iframe src={embed} title={video.title || `${item.topic} — відео ${index + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <a className="text-link" href={video.url} target="_blank" rel="noreferrer"><MaterialIcon name="play_circle" />{t('Відкрити відео')}</a>}</div>; })}</div>}
          </div>
          <button type="button" className="distance-material-expand" onClick={() => toggleExpanded(item.documentId || String(item.id))} aria-expanded={expandedIds.has(item.documentId || String(item.id))}><MaterialIcon name={expandedIds.has(item.documentId || String(item.id)) ? 'expand_less' : 'expand_more'} />{expandedIds.has(item.documentId || String(item.id)) ? 'Приховати' : 'Показати більше'}</button>
        </article>)}</div>
      </div>
    </section>
  </main>;
}
