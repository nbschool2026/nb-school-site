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

function normalizeTime(value: unknown) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function parseCsv(text: string) {
  // Excel on Ukrainian/European regional settings often saves CSV with `;`.
  // Accept both delimiters so an exported file can be edited and imported again.
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = []; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const headers = (rows.shift() || []).map((header) => header.replace(/^\ufeff/, '').trim().replace(/^"|"$/g, ''));
  return rows.map((values) => headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = values[index] || ''; return record;
  }, {}));
}

function normalize(item: Record<string, string>, index: number) {
  const lessonNumber = Number(item.lessonNumber || item.lesson || item.period);
  const times = lessonTimes[lessonNumber];
  // Keep explicit times from CSV. This is required because primary-school
  // lessons (grades 1–4) use a different timetable than grades 5–11.
  const startTime = normalizeTime(item.startTime) || times?.[0];
  const endTime = normalizeTime(item.endTime) || times?.[1];
  const weekday = weekdays[String(item.weekday || item.day || '').trim().toLowerCase()];
  const rawClass = String(item.className || item.class || '').trim();
  const className = /^\d+$/.test(rawClass) ? `${rawClass} Клас` : rawClass;
  const shelterValue = String(item["в укритті"] || item.inShelter || item.shelter || "").trim().toLowerCase();
  return {
    className, weekday, lessonNumber, startTime, endTime,
    subject: String(item.subject || '').trim(), teacher: String(item.teacher || '').trim(),
    room: String(item.room || '').trim(),
    inShelter: ["так", "yes", "true", "1"].includes(shelterValue),
    order: lessonNumber || index,
  };
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const exportHeaders = ['className', 'weekday', 'lessonNumber', 'subject', 'teacher', 'room', 'в укритті', 'startTime', 'endTime'];

export default factories.createCoreController(uid, ({ strapi }) => ({
  async import(ctx) {
    const uploaded = Array.isArray(ctx.request.files?.file) ? ctx.request.files.file[0] : ctx.request.files?.file;
    const filePath = uploaded?.filepath || (uploaded as { path?: string } | undefined)?.path;
    if (!filePath) return ctx.badRequest('Завантажте CSV-файл у полі file.');

    const items = parseCsv(fs.readFileSync(filePath, 'utf8')).map(normalize);
    const invalid = items.find((item) => !item.className || !item.weekday || !item.startTime || !item.subject);
    if (invalid || !items.length) return ctx.badRequest('CSV має містити className, weekday, lessonNumber і subject.');

    const existingCount = await strapi.db.query(uid).count();
    // Remove every locale/status row in one operation so repeated imports cannot leave stale duplicates.
    await strapi.db.query(uid).deleteMany({});
    for (const item of items) {
      const { lessonNumber: _lessonNumber, ...data } = item;
      const draft = await strapi.documents(uid).create({ locale: 'uk', data: data as any });
      await strapi.documents(uid).publish({ documentId: draft.documentId, locale: 'uk' });
    }
    ctx.body = { imported: items.length, deleted: existingCount };
  },

  async export(ctx) {
    const lessons = await strapi.documents(uid).findMany({
      status: 'published',
      locale: 'uk',
      sort: ['weekday:asc', 'order:asc', 'className:asc'],
      limit: 10000,
    });
    const rows = lessons.map((lesson: any) => exportHeaders.map((header) => {
      if (header === 'lessonNumber') return lesson.order || '';
      if (header === 'в укритті') return lesson.inShelter ? 'так' : '';
      return lesson[header] || '';
    }).map(csvCell).join(','));

    ctx.type = 'text/csv';
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', 'attachment; filename="schedule-lessons.csv"');
    ctx.body = `\ufeff${exportHeaders.join(',')}\n${rows.join('\n')}\n`;
  },
}));
