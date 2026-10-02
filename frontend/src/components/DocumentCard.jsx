import React from 'react';
import MaterialIcon from './MaterialIcon.jsx';
import { mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function DocumentCard({ document, onPreview }) {
  const { locale, t } = useLocale();
  const fileUrl = mediaUrl(document.file);
  const previewFile = isPdf(document.file) ? document.file : isPdf(document.previewPdf) ? document.previewPdf : null;
  const previewUrl = mediaUrl(previewFile);

  return (
    <article className="document-card">
      <div className="document-icon">
        <MaterialIcon name={document.icon || 'description'} />
      </div>
      <h3>{document.title}</h3>
      <p>{document.description}</p>
      {locale === 'en' && document._fallbackLocale && <small>{t('Показано українською')}</small>}
      <div className="document-actions">
        {previewUrl && <button type="button" className="text-link" onClick={() => onPreview({ title: document.title, url: previewUrl })}>
          <MaterialIcon name="visibility" />{t('Переглянути')}
        </button>}
        {fileUrl && <a className="text-link" href={fileUrl} download={document.file?.name || undefined}>
          <MaterialIcon name="download" />{t('Завантажити оригінал')}
        </a>}
        {!fileUrl && <small>{t('Файл ще не додано.')}</small>}
        {fileUrl && !previewUrl && <small>{t('PDF-копія для перегляду ще не готова.')}</small>}
      </div>
    </article>
  );
}

function isPdf(file) {
  const media = file?.data?.attributes || file;
  return media?.mime === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(media?.url || '');
}
