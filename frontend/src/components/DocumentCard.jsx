import React from 'react';
import MaterialIcon from './MaterialIcon.jsx';
import { mediaUrl } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

export default function DocumentCard({ document }) {
  const { locale, t } = useLocale();
  const fileUrl = mediaUrl(document.file);
  const href = fileUrl || document.url || '#';
  const isPdf = document.type === 'pdf';

  return (
    <article className="document-card">
      <div className="document-icon">
        <MaterialIcon name={document.icon || 'description'} />
      </div>
      <h3>{document.title}</h3>
      <p>{document.description}</p>
      {locale === 'en' && document._fallbackLocale && <small>{t('Показано українською')}</small>}
      <a className="text-link" href={href}>
        <MaterialIcon name={isPdf ? 'picture_as_pdf' : 'visibility'} />
        {t(isPdf ? 'Завантажити PDF' : 'Переглянути')}
      </a>
    </article>
  );
}
