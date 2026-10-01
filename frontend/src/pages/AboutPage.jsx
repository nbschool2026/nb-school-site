import React from 'react';
import { useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollectionStrict, mediaUrl } from '../lib/api.js';

export default function AboutPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [valueCards, setValueCards] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    Promise.all([
      fetchCollectionStrict('/history-items', 'sort=year:asc&pagination[pageSize]=100'),
      fetchCollectionStrict('/value-cards', 'sort=order:asc&pagination[pageSize]=100'),
      fetchCollectionStrict('/staff-members', 'populate=photo&sort=order:asc&pagination[pageSize]=100'),
    ]).then(([history, values, staff]) => {
      setHistoryItems(history);
      setValueCards(values);
      setStaffMembers(staff);
      setStatus('ready');
    }).catch(() => setStatus('error'));
  }, []);

  return (
    <main>
      {status === 'loading' && <p className="container">Завантаження сторінки «Про нас»…</p>}
      {status === 'error' && <p className="container" role="alert">Не вдалося завантажити сторінку «Про нас» із CMS.</p>}
      <section className="subhero" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.62)), url('/image/background-2.jpg')" }}>
        <div>
          <h1>Про Наш Ліцей</h1>
          <p>Наша місія — створення сучасного освітнього простору для всебічного розвитку особистості, плекання патріотизму та прагнення до знань.</p>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container narrow">
          <SectionTitle title="Наша історія" center />
          {status === 'ready' && !historyItems.length && <p>Історію закладу ще не додано.</p>}
          <div className="timeline">
            {historyItems.map((item) => (
              <article key={item.documentId || item.id} className="timeline-item">
                <div className="timeline-icon"><MaterialIcon name={item.icon || 'history_edu'} /></div>
                <div>
                  <h3>{item.year}</h3>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionTitle title="Наші цінності" center />
          {status === 'ready' && !valueCards.length && <p>Цінності ще не додано.</p>}
          <div className="value-grid">
            {valueCards.map((card) => (
              <article className="value-card" key={card.documentId || card.id}>
                <MaterialIcon name={card.icon || 'workspace_premium'} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container">
          <SectionTitle title="Адміністрація" center />
          {status === 'ready' && !staffMembers.length && <p>Інформацію про працівників ще не додано.</p>}
          <div className="staff-grid">
            {staffMembers.map((person) => (
              <article className="staff-card" key={person.documentId || person.id}>
                {mediaUrl(person.photo)
                  ? <img src={mediaUrl(person.photo)} alt={person.name} />
                  : <div className="staff-photo-placeholder" aria-hidden="true"><MaterialIcon name="person" /></div>}
                <h3>{person.name}</h3>
                <p>{person.position}</p>
                {person.bio && <p className="staff-bio">{person.bio}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
