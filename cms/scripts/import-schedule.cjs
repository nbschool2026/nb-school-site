const fs = require('node:fs');
const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const input = process.argv[2];
const uid = 'api::schedule-lesson.schedule-lesson';
const lessonTimes = {
  1: ['08:15:00', '08:50:00'], 2: ['08:55:00', '09:40:00'], 3: ['09:45:00', '10:25:00'],
  4: ['10:30:00', '11:10:00'], 5: ['11:15:00', '11:55:00'], 6: ['12:00:00', '12:40:00'],
  7: ['12:45:00', '13:25:00'], 8: ['13:30:00', '14:10:00'], 9: ['14:15:00', '14:55:00'],
  10: ['15:00:00', '15:40:00'], 11: ['15:45:00', '16:25:00'], 12: ['16:30:00', '17:10:00'],
};
const weekdays = new Map([
  ['понеділок', 'monday'], ['пн', 'monday'], ['monday', 'monday'],
  ['вівторок', 'tuesday'], ['вт', 'tuesday'], ['tuesday', 'tuesday'],
  ['середа', 'wednesday'], ['ср', 'wednesday'], ['wednesday', 'wednesday'],
  ['четвер', 'thursday'], ['чт', 'thursday'], ['thursday', 'thursday'],
  ['п’ятниця', 'friday'], ["п'ятниця", 'friday'], ['пт', 'friday'], ['friday', 'friday'],
]);

if (!input) {
  console.error('Usage: node scripts/import-schedule.cjs <schedule.csv|schedule.json>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => headers.reduce((record, header, index) => ({ ...record, [header]: values[index] || '' }), {}));
}

function readItems(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.toLowerCase().endsWith('.json')) return JSON.parse(text);
  return parseCsv(text);
}

function normalize(item, index) {
  const lessonNumber = Number(item.lessonNumber || item.lesson || item.period);
  const times = lessonTimes[lessonNumber];
  const weekday = weekdays.get(String(item.weekday || item.day || '').trim().toLowerCase());
  const className = String(item.className || item.class || '').trim().match(/^\d+$/)
    ? `${String(item.className || item.class).trim()} Клас`
    : String(item.className || item.class || '').trim();
  return {
    className, weekday, lessonNumber, startTime: times?.[0], endTime: times?.[1],
    subject: String(item.subject || '').trim(), teacher: String(item.teacher || '').trim(),
    room: String(item.room || '').trim(), order: lessonNumber || index,
  };
}

async function main() {
  const file = path.resolve(process.cwd(), input);
  const items = readItems(file).map(normalize).filter((item) => item.className && item.weekday && item.startTime && item.subject);
  const app = createStrapi(await compileStrapi());
  let created = 0; let updated = 0;
  try {
    await app.load();
    for (const item of items) {
      const existing = await app.db.query(uid).findOne({ where: { className: item.className, weekday: item.weekday, startTime: item.startTime, subject: item.subject }, select: ['documentId'] });
      const data = { className: item.className, weekday: item.weekday, startTime: item.startTime, endTime: item.endTime, subject: item.subject, teacher: item.teacher, room: item.room, order: item.order };
      if (existing?.documentId) {
        await app.documents(uid).update({ documentId: existing.documentId, locale: 'uk', data });
        await app.documents(uid).publish({ documentId: existing.documentId, locale: 'uk' });
        updated += 1;
      } else {
        const draft = await app.documents(uid).create({ locale: 'uk', data });
        await app.documents(uid).publish({ documentId: draft.documentId, locale: 'uk' });
        created += 1;
      }
    }
  } finally { await app.destroy(); }
  console.log(`Imported ${items.length} lesson(s): ${created} created, ${updated} updated.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
