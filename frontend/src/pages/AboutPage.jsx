import React from 'react';
import { useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { fetchCollection } from '../lib/api.js';
import { historyItems as fallbackHistory, staffMembers as fallbackStaff, valueCards as fallbackValues } from '../lib/fallbackData.js';

export default function AboutPage() {
  const [historyItems, setHistoryItems] = useState(fallbackHistory);
  const [valueCards, setValueCards] = useState(fallbackValues);
  const [staffMembers, setStaffMembers] = useState(fallbackStaff);

  useEffect(() => {
    fetchCollection('/history-items', 'sort=order:asc').then((data) => data.length && setHistoryItems(data));
    fetchCollection('/value-cards', 'sort=order:asc').then((data) => data.length && setValueCards(data));
    fetchCollection('/staff-members', 'populate=photo&sort=order:asc').then((data) => data.length && setStaffMembers(data));
  }, []);

  return (
    <main>
      <section className="subhero" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.62)), url('/image/background-2.jpg')" }}>
        <div>
          <h1>Про Наш Ліцей</h1>
          <p>Наша місія — створення сучасного освітнього простору для всебічного розвитку особистості, плекання патріотизму та прагнення до знань.</p>
        </div>
      </section>

      <section className="page-section white-band">
        <div className="container narrow">
          <SectionTitle title="Наша історія" center />
          <div className="timeline">
            {historyItems.map((item) => (
              <article key={item.documentId || item.id} className="timeline-item">
                <div className="timeline-icon"><MaterialIcon name={item.icon || 'history_edu'} /></div>
                <div>
                  <h3>{item.year}</h3>
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
          <div className="staff-grid">
            {staffMembers.map((person, index) => (
              <article className="staff-card" key={person.documentId || person.id}>
                <img src={index === 0 ? '/image/principal1.png' : '/image/principal.png'} alt={person.name} />
                <h3>{person.name}</h3>
                <p>{person.position}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
