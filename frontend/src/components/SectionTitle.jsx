import React from 'react';

export default function SectionTitle({ eyebrow, title, subtitle, center = false, level = 2 }) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={`section-title ${center ? 'center' : ''}`}>
      {eyebrow && <span>{eyebrow}</span>}
      <Heading>{title}</Heading>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
