import fs from 'node:fs';
import path from 'node:path';
import { factories } from '@strapi/strapi';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';

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

function classNumber(value: unknown) {
  return Number(String(value || '').match(/\d+/)?.[0] || 999);
}

function lessonData(item: Record<string, any>) {
  return {
    className: String(item.className || '').trim(),
    weekday: item.weekday,
    startTime: item.startTime,
    endTime: item.endTime,
    subject: String(item.subject || '').trim(),
    teacher: String(item.teacher || '').trim(),
    room: String(item.room || '').trim(),
    inShelter: item.inShelter === true,
    lessonNumber: Number(item.order || 0),
    order: Number(item.order || 0),
  };
}

const exportHeaders = ['className', 'weekday', 'lessonNumber', 'subject', 'teacher', 'room', 'в укритті', 'startTime', 'endTime'];

async function resolveAdminUser(strapi: any, ctx: any) {
  let user = ctx.state.user;
  if (!user) {
    const token = ctx.cookies.get('jwtToken');
    const secret = strapi.config.get('admin.auth.secret');
    if (token && secret) {
      try {
        const payload = jwt.verify(token, String(secret)) as { id?: number; userId?: number };
        const userId = payload.id || payload.userId;
        if (userId) user = await strapi.db.query('admin::user').findOne({ where: { id: userId } });
      } catch {
        return null;
      }
    }
  }
  return user || null;
}

async function adminCanEdit(strapi: any, sessionUser: any) {
  if (!sessionUser) return false;
  let user = sessionUser;
  try {
    user = await strapi.db.query('admin::user').findOne({
      where: { id: sessionUser.id },
      populate: ['roles'],
    }) || sessionUser;
  } catch {
    // The authenticated user object still contains roles on some Strapi versions.
  }
  const roleValue = (role: any) => `${role?.code || ''} ${role?.name || ''}`
    .toLowerCase().replace(/[^a-zа-яіїєґ]+/g, '');
  const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
  const directRole = user.role ? [user.role] : [];
  return [...roles, ...directRole].some((role: any) => {
    const value = roleValue(role);
    return value.includes('superadmin') || value.includes('editor');
  });
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async authStatus(ctx) {
    const sessionUser = await resolveAdminUser(strapi, ctx);
    if (!sessionUser) return ctx.unauthorized('Увійдіть в адмінку.');
    ctx.body = { authenticated: true, canEdit: await adminCanEdit(strapi, sessionUser) };
  },

  async deleteLesson(ctx) {
    const sessionUser = await resolveAdminUser(strapi, ctx);
    if (!sessionUser || !(await adminCanEdit(strapi, sessionUser))) {
      return ctx.unauthorized('Недостатньо прав для видалення уроку.');
    }
    const documentId = String(ctx.params.documentId || '').trim();
    if (!documentId) return ctx.badRequest('Не вказано урок.');
    await strapi.documents(uid).delete({ documentId, locale: 'uk' });
    ctx.body = { deleted: true, documentId };
  },

  async import(ctx) {
    const uploaded = Array.isArray(ctx.request.files?.file) ? ctx.request.files.file[0] : ctx.request.files?.file;
    const filePath = uploaded?.filepath || (uploaded as { path?: string } | undefined)?.path;
    if (!filePath) return ctx.badRequest('Завантажте XLSX або CSV-файл у полі file.');

    const uploadedInfo = uploaded as { name?: string; originalFilename?: string; originalname?: string; mimetype?: string; type?: string } | undefined;
    const originalName = uploadedInfo?.name || uploadedInfo?.originalFilename || uploadedInfo?.originalname || filePath;
    const extension = path.extname(originalName).toLowerCase();
    const mimeType = uploadedInfo?.mimetype || uploadedInfo?.type || '';
    const isXlsx = extension === '.xlsx' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const sourceRows = isXlsx
      ? await parseXlsx(filePath)
      : parseCsv(fs.readFileSync(filePath, 'utf8'));
    const keepPrimary = ['true', '1', 'yes', 'так'].includes(String(ctx.request.body?.keepPrimary || '').trim().toLowerCase());
    const items = sourceRows.map(normalize).filter((item) => !keepPrimary || classNumber(item.className) > 4);
    const invalid = items.find((item) => !item.className || !item.weekday || !item.startTime || !item.subject);
    if (invalid || !items.length) return ctx.badRequest('XLSX або CSV має містити className, weekday, lessonNumber і subject.');

    const existingCount = await strapi.db.query(uid).count();
    const preservedPrimary = keepPrimary
      ? (await strapi.documents(uid).findMany({ status: 'published', locale: 'uk', limit: 10000 }))
        .filter((lesson: any) => classNumber(lesson.className) <= 4)
        .map(lessonData)
      : [];
    // Remove every locale/status row in one operation so repeated imports cannot leave stale duplicates.
    await strapi.db.query(uid).deleteMany({});
    for (const item of [...preservedPrimary, ...items]) {
      const { lessonNumber: _lessonNumber, ...data } = item;
      const draft = await strapi.documents(uid).create({ locale: 'uk', data: data as any });
      await strapi.documents(uid).publish({ documentId: draft.documentId, locale: 'uk' });
    }
    ctx.body = { imported: items.length + preservedPrimary.length, replaced: items.length, preservedPrimary: preservedPrimary.length, deleted: existingCount };
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

