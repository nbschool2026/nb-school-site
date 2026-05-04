import React from 'react';

export default function SectionTitle({ eyebrow, title, center = false }) {
  return (
    <div className={`section-title ${center ? 'center' : ''}`}>
      {eyebrow && <span>{eyebrow}</span>}
      <h2>{title}</h2>
    </div>
  );
}
