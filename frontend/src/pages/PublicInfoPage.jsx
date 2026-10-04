import React from 'react';
import { useEffect, useRef, useState } from 'react';
import DocumentCard from '../components/DocumentCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

const publicInfoCategories = [
  'Ліцензії на провадження освітньої діяльності',
  'Статут закладу освіти',
  'Структура та органи управління',
  'Освітні програми',
  'Територія обслуговування',
  'Мова освітнього процесу',
  'Вакантні посади',
  'Матеріально-технічне забезпечення',
  'Річний звіт про діяльність',
  'Умови доступності закладу',
  'Положення про внутрішню систему забезпечення якості освіти',
  'Інша інформація',
  'Вибір підручників',
  'Про ліцей',
  'Спонсорська допомога',
  'Річний план роботи',
  'Положення',
  'Дошка оголошень',
  'Правила прийому до закладу освіти',
  'Батькам майбутніх першокласників',
  'Правила поведінки в ліцеї',
  'Протидія булінгу',
];

export default function PublicInfoPage() {
  const { locale, t } = useLocale();
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const previewDialog = useRef(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchCollectionLocalized('/public-documents', 'populate[0]=file&populate[1]=previewPdf&sort=order:asc&pagination[pageSize]=100', locale).then((data) => {
      if (active) { setDocuments(data); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  useEffect(() => {
    if (preview) previewDialog.current?.showModal();
  }, [preview]);

  const normalizedSearch = search.trim().toLocaleLowerCase('uk');
  const filteredDocuments = documents.filter((document) => {
    const documentCategory = document.category || '';
    const haystack = [document.title, document.description, documentCategory].filter(Boolean).join(' ').toLocaleLowerCase('uk');
    return (!category || documentCategory === category)
      && (!normalizedSearch || haystack.includes(normalizedSearch));
  });

  return (
    <main>
      <section className="info-hero">
        <div className="container">
          <div className="pill"><MaterialIcon name="info" /> {t('Прозорість та звітність')}</div>
          <h1>{t('Публічна інформація')}</h1>
          <p>{t('Відповідно до законодавства України, ми забезпечуємо відкритий доступ до офіційної документації та звітності нашого ліцею.')}</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="public-info-filters" role="search">
            <label>
              <span>{t('Пошук')}</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Пошук у публічній інформації')} />
            </label>
            <label>
              <span>{t('Категорія')}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">{t('Усі категорії')}</option>
                {publicInfoCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="document-grid">
          {status === 'loading' && <p>{t('Завантаження документів…')}</p>}
          {status === 'error' && <p role="alert">{t('Не вдалося завантажити документи з CMS.')}</p>}
          {status === 'ready' && !documents.length && <p>{t('Документів поки немає.')}</p>}
          {status === 'ready' && documents.length > 0 && !filteredDocuments.length && <p>{t('За цими умовами документів не знайдено.')}</p>}
          {status === 'ready' && filteredDocuments.map((document) => <DocumentCard key={document.documentId || document.id || document.slug} document={document} onPreview={setPreview} />)}
          </div>
        </div>
      </section>
      <dialog ref={previewDialog} className="document-preview" onClose={() => setPreview(null)} aria-label={preview?.title || t('Перегляд документа')}>
        <div className="document-preview-header">
          <h2>{preview?.title}</h2>
          <button type="button" onClick={() => previewDialog.current?.close()} aria-label={t('Закрити перегляд')}><MaterialIcon name="close" /></button>
        </div>
        {preview && <iframe title={preview.title} src={preview.url} />}
      </dialog>
    </main>
  );
}
