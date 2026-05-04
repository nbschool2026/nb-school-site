import React from 'react';
import MaterialIcon from './MaterialIcon.jsx';
import { mediaUrl } from '../lib/api.js';

export default function DocumentCard({ document }) {
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
      <a className="text-link" href={href}>
        <MaterialIcon name={isPdf ? 'picture_as_pdf' : 'visibility'} />
        {isPdf ? 'Завантажити PDF' : 'Переглянути'}
      </a>
    </article>
  );
}
