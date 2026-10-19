import fs from 'node:fs';
import path from 'node:path';
import { factories } from '@strapi/strapi';
import ExcelJS from 'exceljs';

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

function excelCellText(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:${String(value.getSeconds()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (typeof value === 'object') {
    const richText = (value as { richText?: Array<{ text?: string }> }).richText;
    if (richText) return richText.map((part) => part.text || '').join('');
    const result = (value as { result?: unknown }).result;
    if (result !== undefined) return excelCellText(result);
    const text = (value as { text?: unknown }).text;
    if (text !== undefined) return excelCellText(text);
  }
  return String(value).trim();
}

async function parseXlsx(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1).map(excelCellText) : [];
    if (values.some(Boolean)) rows.push(values);
  });
  const headers = (rows.shift() || []).map((header) => header.replace(/^\ufeff/, '').trim());
  return rows.map((values) => headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = values[index] || '';
    return record;
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

const exportHeaders = ['className', 'weekday', 'lessonNumber', 'subject', 'teacher', 'room', 'в укритті', 'startTime', 'endTime'];

export default factories.createCoreController(uid, ({ strapi }) => ({
  async import(ctx) {
    const uploaded = Array.isArray(ctx.request.files?.file) ? ctx.request.files.file[0] : ctx.request.files?.file;
    const filePath = uploaded?.filepath || (uploaded as { path?: string } | undefined)?.path;
    if (!filePath) return ctx.badRequest('Завантажте XLSX або CSV-файл у полі file.');

    const extension = path.extname((uploaded as { name?: string } | undefined)?.name || filePath).toLowerCase();
    const sourceRows = extension === '.xlsx'
      ? await parseXlsx(filePath)
      : parseCsv(fs.readFileSync(filePath, 'utf8'));
    const items = sourceRows.map(normalize);
    const invalid = items.find((item) => !item.className || !item.weekday || !item.startTime || !item.subject);
    if (invalid || !items.length) return ctx.badRequest('XLSX або CSV має містити className, weekday, lessonNumber і subject.');

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
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Novobilouskyi Lyceum';
    const sheet = workbook.addWorksheet('Розклад');
    sheet.columns = exportHeaders.map((header) => ({ header, key: header, width: header === 'subject' || header === 'teacher' ? 34 : 18 }));
    lessons.forEach((lesson: any) => sheet.addRow({
      className: lesson.className || '',
      weekday: lesson.weekday || '',
      lessonNumber: lesson.order || '',
      subject: lesson.subject || '',
      teacher: lesson.teacher || '',
      room: lesson.room || '',
      'в укритті': lesson.inShelter ? 'так' : '',
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
    }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `I${Math.max(1, lessons.length + 1)}` };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD96B00' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    ctx.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ctx.set('Content-Disposition', 'attachment; filename="schedule-lessons.xlsx"');
    ctx.body = buffer;
  },
}));
