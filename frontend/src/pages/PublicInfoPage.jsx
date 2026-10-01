import React from 'react';
import { useEffect, useState } from 'react';
import DocumentCard from '../components/DocumentCard.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCollectionLocalized } from '../lib/api.js';
import { publicDocuments as fallbackDocuments } from '../lib/fallbackData.js';
import { useLocale } from '../lib/locale.jsx';

export default function PublicInfoPage() {
  const { locale, t } = useLocale();
  const [documents, setDocuments] = useState(fallbackDocuments);

  useEffect(() => {
    let active = true;
    setDocuments(fallbackDocuments.map((item) => locale === 'en' ? { ...item, _fallbackLocale: 'uk' } : item));
    fetchCollectionLocalized('/public-documents', 'populate=file&sort=order:asc&pagination[pageSize]=100', locale).then((data) => {
      if (active && data.length) setDocuments(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [locale]);

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
          {documents.map((document) => <DocumentCard key={document.documentId || document.id || document.slug} document={document} />)}
          <article className="question-card">
            <MaterialIcon name="help_outline" />
            <h3>{t('Залишилися питання?')}</h3>
            <p>{t('Якщо ви не знайшли потрібну інформацію, ви можете надіслати офіційний запит до адміністрації.')}</p>
            <a className="primary-button" href="mailto:bilousnew@ukr.net">{t('Надіслати запит')}</a>
          </article>
        </div>
      </section>
    </main>
  );
}
