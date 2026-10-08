import fs from 'node:fs';
import { factories } from '@strapi/strapi';

const uid = 'api::schedule-lesson.schedule-lesson';
const lessonTimes: Record<number, [string, string]> = {
  1: ['08:15:00', '08:50:00'], 2: ['08:55:00', '09:40:00'], 3: ['09:45:00', '10:25:00'],
  4: ['10:30:00', '11:10:00'], 5: ['11:15:00', '11:55:00'], 6: ['12:00:00', '12:40:00'],
  7: ['12:45:00', '13:25:00'], 8: ['13:30:00', '14:10:00'], 9: ['14:15:00', '14:55:00'],
  10: ['15:00:00', '15:40:00'], 11: ['15:45:00', '16:25:00'], 12: ['16:30:00', '17:10:00'],
};
const weekdays: Record<string, string> = {
  понеділок: 'monday', пн: 'monday', monday: 'monday',
  вівторок: 'tuesday', вт: 'tuesday', tuesday: 'tuesday',
  середа: 'wednesday', ср: 'wednesday', wednesday: 'wednesday',
  четвер: 'thursday', чт: 'thursday', thursday: 'thursday',
  'п’ятниця': 'friday', "п'ятниця": 'friday', пт: 'friday', friday: 'friday',
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = []; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const headers = (rows.shift() || []).map((header) => header.replace(/^\ufeff/, '').trim());
  return rows.map((values) => headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = values[index] || ''; return record;
  }, {}));
}

function normalize(item: Record<string, string>, index: number) {
  const lessonNumber = Number(item.lessonNumber || item.lesson || item.period);
  const times = lessonTimes[lessonNumber];
  const weekday = weekdays[String(item.weekday || item.day || '').trim().toLowerCase()];
  const rawClass = String(item.className || item.class || '').trim();
  const className = /^\d+$/.test(rawClass) ? `${rawClass} Клас` : rawClass;
  return {
    className, weekday, lessonNumber, startTime: times?.[0], endTime: times?.[1],
    subject: String(item.subject || '').trim(), teacher: String(item.teacher || '').trim(),
    room: String(item.room || '').trim(), order: lessonNumber || index,
  };
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async import(ctx) {
    const uploaded = Array.isArray(ctx.request.files?.file) ? ctx.request.files.file[0] : ctx.request.files?.file;
    const filePath = uploaded?.filepath || (uploaded as { path?: string } | undefined)?.path;
    if (!filePath) return ctx.badRequest('Завантажте CSV-файл у полі file.');

    const items = parseCsv(fs.readFileSync(filePath, 'utf8')).map(normalize);
    const invalid = items.find((item) => !item.className || !item.weekday || !item.startTime || !item.subject);
    if (invalid || !items.length) return ctx.badRequest('CSV має містити className, weekday, lessonNumber і subject.');

    const existing = await strapi.db.query(uid).findMany({ select: ['documentId'] });
    for (const record of existing) {
      await strapi.documents(uid).delete({ documentId: record.documentId, locale: 'uk' });
    }
    for (const item of items) {
      const { lessonNumber: _lessonNumber, ...data } = item;
      const draft = await strapi.documents(uid).create({ locale: 'uk', data: data as any });
      await strapi.documents(uid).publish({ documentId: draft.documentId, locale: 'uk' });
    }
    ctx.body = { imported: items.length, deleted: existing.length };
  },
}));
