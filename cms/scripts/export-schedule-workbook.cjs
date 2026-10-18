const fs = require('node:fs');
const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const uid = 'api::schedule-lesson.schedule-lesson';
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const weekdayLabels = { monday: 'Понеділок', tuesday: 'Вівторок', wednesday: 'Середа', thursday: 'Четвер', friday: 'П’ятниця' };
const inputOutput = process.argv[2] || `schedule-review-${new Date().toISOString().slice(0, 10)}.xlsx`;
const apiUrl = process.env.SCHEDULE_API_URL || 'http://127.0.0.1:1337/api/schedule-lessons';
const output = path.resolve(process.cwd(), inputOutput);

function minutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function time(value) {
  return String(value || '').slice(0, 5);
}

function normalize(item) {
  return {
    className: String(item.className || '').trim(),
    weekday: String(item.weekday || '').trim().toLowerCase(),
    lessonNumber: Number(item.order || 0),
    startTime: time(item.startTime),
    endTime: time(item.endTime),
    subject: String(item.subject || '').trim(),
    teacher: String(item.teacher || '').trim(),
    room: String(item.room || '').trim(),
    inShelter: item.inShelter === true || String(item.inShelter || '').toLowerCase() === 'true',
  };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.className, item.weekday, item.startTime, item.endTime, item.subject, item.teacher].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function overlaps(a, b) {
  const aStart = minutes(a.startTime); const aEnd = minutes(a.endTime);
  const bStart = minutes(b.startTime); const bEnd = minutes(b.endTime);
  return aStart !== null && aEnd !== null && bStart !== null && bEnd !== null
    && aStart < bEnd && bStart < aEnd;
}

function conflictRows(items) {
  const groups = [
    ['Клас', (item) => item.className],
    ['Вчитель', (item) => item.teacher],
    ['Кабінет', (item) => item.room],
  ];
  const conflicts = [];
  for (const [kind, keyOf] of groups) {
    for (const weekday of weekdays) {
      const grouped = new Map();
      items.filter((item) => item.weekday === weekday && keyOf(item)).forEach((item) => {
        const key = keyOf(item);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });
      for (const [key, rows] of grouped) {
        for (let i = 0; i < rows.length; i += 1) {
          for (let j = i + 1; j < rows.length; j += 1) {
            if (!overlaps(rows[i], rows[j])) continue;
            conflicts.push({
              type: kind,
              key,
              weekday,
              weekdayLabel: weekdayLabels[weekday],
              first: rows[i],
              second: rows[j],
            });
          }
        }
      }
    }
  }
  return conflicts;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeConflictCsv(conflicts, fileName) {
  const headers = ['Тип', 'Ключ', 'День', 'Урок 1', 'Час 1', 'Клас 1', 'Предмет 1', 'Вчитель 1', 'Урок 2', 'Час 2', 'Клас 2', 'Предмет 2', 'Вчитель 2'];
  const rows = conflicts.map((conflict) => [
    conflict.type, conflict.key, conflict.weekdayLabel,
    conflict.first.lessonNumber, `${conflict.first.startTime}–${conflict.first.endTime}`, conflict.first.className, conflict.first.subject, conflict.first.teacher,
    conflict.second.lessonNumber, `${conflict.second.startTime}–${conflict.second.endTime}`, conflict.second.className, conflict.second.subject, conflict.second.teacher,
  ]);
  fs.writeFileSync(fileName, [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n', 'utf8');
}

function safeSheetName(value, used) {
  const base = String(value).replace(/[\\/*?:\[\]]/g, ' ').trim().slice(0, 31) || 'Аркуш';
  let name = base; let index = 2;
  while (used.has(name)) { name = `${base.slice(0, 28)} (${index})`; index += 1; }
  used.add(name); return name;
}

function styleSheet(sheet, headerRow = 1) {
  sheet.views = [{ state: 'frozen', ySplit: headerRow }];
  sheet.getRow(headerRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(headerRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD96B00' } };
  sheet.getRow(headerRow).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.autoFilter = { from: `A${headerRow}`, to: `${String.fromCharCode(64 + Math.min(sheet.columnCount, 26))}${headerRow}` };
  sheet.columns.forEach((column) => { column.width = Math.min(Math.max(column.width || 12, 12), 34); });
}

async function createWorkbook(items, conflicts) {
  let ExcelJS;
  try { ExcelJS = require('exceljs'); } catch {
    throw new Error('Для Excel-вигрузки встановіть залежність: npm install exceljs --save');
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Novobilouskyi Lyceum';
  workbook.created = new Date();
  const dataHeaders = ['Клас', 'День', 'weekday', 'Номер уроку', 'Початок', 'Кінець', 'Предмет', 'Вчитель', 'Кабінет', 'В укритті'];
  const data = workbook.addWorksheet('Дані');
  data.addRow(dataHeaders);
  items.forEach((item) => data.addRow([item.className, weekdayLabels[item.weekday] || item.weekday, item.weekday, item.lessonNumber, item.startTime, item.endTime, item.subject, item.teacher, item.room, item.inShelter ? 'так' : '']));
  styleSheet(data);
  data.getColumn(3).hidden = true;
  data.getColumn(10).alignment = { horizontal: 'center' };

  const conflictSheet = workbook.addWorksheet('Накладки');
  conflictSheet.addRow(['Тип', 'Ключ', 'День', 'Час 1', 'Клас 1', 'Предмет 1', 'Вчитель 1', 'Час 2', 'Клас 2', 'Предмет 2', 'Вчитель 2']);
  conflicts.forEach((conflict) => conflictSheet.addRow([conflict.type, conflict.key, conflict.weekdayLabel, `${conflict.first.startTime}–${conflict.first.endTime}`, conflict.first.className, conflict.first.subject, conflict.first.teacher, `${conflict.second.startTime}–${conflict.second.endTime}`, conflict.second.className, conflict.second.subject, conflict.second.teacher]));
  styleSheet(conflictSheet);
  if (conflicts.length) conflictSheet.getRows(2, conflicts.length).forEach((row) => { row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE2E2' } }; });

  const used = new Set(['Дані', 'Накладки']);
  const classes = [...new Set(items.map((item) => item.className).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const teachers = [...new Set(items.map((item) => item.teacher).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'));
  const makeView = (name, criteriaColumn, criteria) => {
    const sheet = workbook.addWorksheet(safeSheetName(name, used));
    sheet.addRow(dataHeaders);
    const escaped = String(criteria).replace(/"/g, '""');
    const source = `'Дані'!$A$2:$J$2000`;
    const criteriaRange = `'Дані'!$${criteriaColumn}$2:$${criteriaColumn}$2000`;
    sheet.getCell('A2').value = { formula: `FILTER(${source},${criteriaRange}="${escaped}","")` };
    styleSheet(sheet);
    sheet.getRow(2).height = 20;
    sheet.getCell('A1').note = 'Редагуйте дані на аркуші «Дані». Цей аркуш оновлюється формулою FILTER.';
    return sheet;
  };
  classes.forEach((className) => makeView(className, 'A', className));
  teachers.forEach((teacher) => makeView(`Вчитель - ${teacher}`, 'H', teacher));
  await workbook.xlsx.writeFile(output);
}

async function fetchAllLessons() {
  const records = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = apiUrl + `?pagination[page]=${page}&pagination[pageSize]=100&sort=order:asc`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CMS API повернула ${response.status}: ${url}`);
    const payload = await response.json();
    const batch = Array.isArray(payload.data) ? payload.data : [];
    records.push(...batch.map((entry) => entry.attributes ? { id: entry.id, ...entry.attributes } : entry));
    if (batch.length < 100) break;
  }
  return records;
}
async function main() {
  const records = await fetchAllLessons();
  const items = dedupe(records.map(normalize).filter((item) => item.className && weekdays.includes(item.weekday) && item.startTime && item.endTime && item.subject));
  const conflicts = conflictRows(items);
  const conflictCsv = output.replace(/\.xlsx$/i, '') + '-overlaps.csv';
  writeConflictCsv(conflicts, conflictCsv);
  await createWorkbook(items, conflicts);
  console.log(`Уроків: ${items.length}`);
  console.log(`Накладок: ${conflicts.length}`);
  console.log(`Excel: ${output}`);
  console.log(`CSV накладок: ${conflictCsv}`);
  if (conflicts.length) conflicts.forEach((c) => console.log(`[${c.type}] ${c.weekdayLabel}: ${c.key} — ${c.first.startTime}-${c.first.endTime} ${c.first.subject} / ${c.second.startTime}-${c.second.endTime} ${c.second.subject}`));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });