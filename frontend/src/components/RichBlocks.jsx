import React from 'react';

function inlineNodes(children, prefix) {
  return (children || []).map((child, index) => {
    const key = `${prefix}-${index}`;
    if (child.type === 'link') return <a key={key} href={child.url} target="_blank" rel="noreferrer">{inlineNodes(child.children, key)}</a>;
    const classNames = [child.bold && 'rich-bold', child.italic && 'rich-italic', child.underline && 'rich-underline', child.strikethrough && 'rich-strikethrough', child.code && 'rich-code'].filter(Boolean).join(' ');
    return <span key={key} className={classNames || undefined}>{child.text}</span>;
  });
}

export function renderBlocks(value, keyPrefix) {
  if (!Array.isArray(value)) return value ? <p>{value}</p> : null;
  return value.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    if (block.type === 'heading') { const Tag = `h${Math.min(6, Math.max(1, block.level || 2))}`; return <Tag key={key}>{inlineNodes(block.children, key)}</Tag>; }
    if (block.type === 'quote') return <blockquote key={key}>{inlineNodes(block.children, key)}</blockquote>;
    if (block.type === 'list') { const Tag = block.format === 'ordered' ? 'ol' : 'ul'; return <Tag key={key}>{(block.children || []).map((item, i) => <li key={`${key}-${i}`}>{inlineNodes(item.children, `${key}-${i}`)}</li>)}</Tag>; }
    if (block.type === 'image' && block.image?.url) return <img key={key} src={block.image.url.startsWith('http') ? block.image.url : `${window.location.origin}${block.image.url}`} alt={block.image.alternativeText || ''} loading="lazy" decoding="async" />;
    return <p key={key} style={block.alignment ? { textAlign: block.alignment } : undefined}>{inlineNodes(block.children, key)}</p>;
  });
}
