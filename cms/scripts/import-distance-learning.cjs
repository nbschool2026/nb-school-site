const fs = require('node:fs');
const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const uid = 'api::distance-learning-material.distance-learning-material';
const input = process.argv[2];

if (!input) {
  console.error('Usage: node scripts/import-distance-learning.cjs <distance-learning-materials.json>');
  process.exit(1);
}

function normalize(item, index) {
  const content = Array.isArray(item.content)
    ? item.content
    : String(item.content || '').split(/\n+/).map((text) => text.trim()).filter(Boolean).map((text) => ({ type: 'paragraph', children: [{ type: 'text', text }] }));
  const videos = Array.isArray(item.videos) ? item.videos : (item.videoUrl ? [{ url: item.videoUrl }] : []);
  return {
    grade: String(item.grade || '').trim(), subject: String(item.subject || '').trim(), date: item.date || null,
    topic: String(item.topic || item.subject || 'Матеріал').trim(), content, videos,
    videoUrl: String(item.videoUrl || '').trim(), sourceUrl: String(item.sourceUrl || '').trim(),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
  };
}

async function main() {
  const file = path.resolve(process.cwd(), input);
  const items = JSON.parse(fs.readFileSync(file, 'utf8')).map(normalize).filter((item) => item.grade && item.subject && item.date && item.topic);
  const app = createStrapi(await compileStrapi());
  let created = 0; let updated = 0;
  try {
    await app.load();
    for (const item of items) {
      const existing = await app.db.query(uid).findOne({ where: { sourceUrl: item.sourceUrl, date: item.date, topic: item.topic }, select: ['documentId'] });
      if (existing?.documentId) {
        await app.documents(uid).update({ documentId: existing.documentId, locale: 'uk', data: item });
        await app.documents(uid).publish({ documentId: existing.documentId, locale: 'uk' });
        updated += 1;
      } else {
        const draft = await app.documents(uid).create({ locale: 'uk', data: item });
        await app.documents(uid).publish({ documentId: draft.documentId, locale: 'uk' });
        created += 1;
      }
    }
  } finally { await app.destroy(); }
  console.log(`Imported ${items.length} material(s): ${created} created, ${updated} updated.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
