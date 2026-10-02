import React from 'react';
import { useEffect, useRef, useState } from 'react';
import DocumentCard from '../components/DocumentCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function PublicInfoPage() {
  const { locale, t } = useLocale();
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [preview, setPreview] = useState(null);
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
        <div className="container document-grid">
          {status === 'loading' && <p>{t('Завантаження документів…')}</p>}
          {status === 'error' && <p role="alert">{t('Не вдалося завантажити документи з CMS.')}</p>}
          {status === 'ready' && !documents.length && <p>{t('Документів поки немає.')}</p>}
          {status === 'ready' && documents.map((document) => <DocumentCard key={document.documentId || document.id || document.slug} document={document} onPreview={setPreview} />)}
          <article className="question-card">
            <MaterialIcon name="help_outline" />
            <h3>{t('Залишилися питання?')}</h3>
            <p>{t('Якщо ви не знайшли потрібну інформацію, ви можете надіслати офіційний запит до адміністрації.')}</p>
            <a className="primary-button" href="mailto:bilousnew@ukr.net">{t('Надіслати запит')}</a>
          </article>
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
