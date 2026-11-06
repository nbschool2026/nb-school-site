import { chartNumber } from './power-chart.js';

export const SCHOOL_TIME_ZONE = 'Europe/Kyiv';
const minute = 60_000;
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function weeklyOutages(rows, now = Date.now()) {
  const today = dayKey.format(now);
  const noon = Date.parse(`${today}T12:00:00Z`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = noon - (6 - index) * 86400_000;
    return { key: dayKey.format(date), date, intervals: [], coveredMs: 0, totalMs: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  const points = [...new Map(rows.map((row) => [Date.parse(row.timestamp), row])).entries()]
    .filter(([time]) => Number.isFinite(time) && time <= now)
    .map(([time, row]) => ({ time, power: chartNumber(row.gridPower) })).sort((a, b) => a.time - b.time);
  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index]; const next = points[index + 1];
    // Do not infer power status across unknown samples or long telemetry gaps.
    if (point.power == null || next.power == null || next.time - point.time > 10 * minute) continue;
    for (let start = point.time; start < next.time;) {
      const end = Math.min(next.time, (Math.floor(start / minute) + 1) * minute);
      const day = byDay.get(dayKey.format(start));
      if (day) {
        day.coveredMs += end - start;
        if (point.power === 0) {
          const last = day.intervals.at(-1);
          if (last?.end === start) last.end = end;
          else day.intervals.push({ start, end });
          day.totalMs += end - start;
        }
      }
      start = end;
    }
  }
  return days;
}

export function intervalLabel(interval, dateLocale) {
  const format = (time) => new Date(time).toLocaleTimeString(dateLocale, { timeZone: SCHOOL_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${format(interval.start)}–${dayKey.format(interval.end) !== dayKey.format(interval.start) ? '24:00' : format(interval.end)}`;
}
