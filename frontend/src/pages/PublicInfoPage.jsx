import React from 'react';
import { useEffect, useState } from 'react';
import DocumentCard from '../components/DocumentCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCollection } from '../lib/api.js';
import { publicDocuments as fallbackDocuments } from '../lib/fallbackData.js';

export default function PublicInfoPage() {
  const [documents, setDocuments] = useState(fallbackDocuments);

  useEffect(() => {
    fetchCollection('/public-documents', 'populate=file&sort=order:asc&pagination[limit]=50').then((data) => {
      if (data.length) setDocuments(data);
    });
  }, []);

  return (
    <main>
      <section className="info-hero">
        <div className="container">
          <div className="pill"><MaterialIcon name="info" /> Прозорість та звітність</div>
          <h1>Публічна інформація</h1>
          <p>Відповідно до законодавства України, ми забезпечуємо відкритий доступ до офіційної документації та звітності нашого ліцею.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container document-grid">
          {documents.map((document) => <DocumentCard key={document.documentId || document.id || document.slug} document={document} />)}
          <article className="question-card">
            <MaterialIcon name="help_outline" />
            <h3>Залишилися питання?</h3>
            <p>Якщо ви не знайшли потрібну інформацію, ви можете надіслати офіційний запит до адміністрації.</p>
            <a className="primary-button" href="mailto:bilousnew@ukr.net">Надіслати запит</a>
          </article>
        </div>
      </section>
    </main>
  );
}
