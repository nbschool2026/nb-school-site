import assert from 'node:assert/strict';
import test from 'node:test';
import { weeklyOutages, intervalLabel } from '../frontend/src/lib/power-outages.js';

const sample = (time, gridPower) => ({ timestamp: time, gridPower });
const now = Date.parse('2026-11-06T15:00:00Z');
function range(start, minutes, power = 0) {
  return Array.from({ length: minutes / 5 + 1 }, (_, index) => sample(new Date(Date.parse(start) + index * 300_000).toISOString(), power));
}
test('seven calendar days use Kyiv dates and sum multiple outages', () => {
  const rows = [...range('2026-11-05T08:00:00Z', 300), ...range('2026-11-05T19:00:00Z', 120)];
  const days = weeklyOutages(rows, now);
  assert.deepEqual(days.map((day) => day.key), ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  const day = days[5];
  assert.equal(day.intervals.length, 2);
  assert.equal(day.totalMs, 7 * 3600_000);
  assert.equal(intervalLabel(day.intervals[0], 'uk-UA'), '10:00–15:00');
  assert.equal(intervalLabel(day.intervals[1], 'uk-UA'), '21:00–23:00');
  assert.equal(days[0].coveredMs, 0);
});
test('outages crossing midnight are split between calendar days', () => {
  const days = weeklyOutages(range('2026-11-04T21:30:00Z', 60), now);
  assert.equal(days[4].totalMs, 30 * 60_000);
  assert.equal(days[5].totalMs, 30 * 60_000);
  assert.equal(intervalLabel(days[4].intervals[0], 'uk-UA'), '23:30–24:00');
  assert.equal(intervalLabel(days[5].intervals[0], 'uk-UA'), '00:00–00:30');
});
test('missing values and gaps do not become outage time; duplicate unsorted rows are safe', () => {
  const rows = [sample('2026-11-06T10:00:00Z', 0), sample('2026-11-06T10:05:00Z', 0), sample('2026-11-06T10:10:00Z', null), sample('2026-11-06T11:00:00Z', 0), sample('2026-11-06T11:05:00Z', 1)];
  const day = weeklyOutages([...rows.reverse(), rows[0]], now).at(-1);
  assert.equal(day.totalMs, 10 * 60_000);
  assert.equal(day.intervals.length, 2);
});
test('ongoing outages stop at the last confirmed sample, without extrapolation', () => {
  const day = weeklyOutages(range('2026-11-06T10:00:00Z', 15), now).at(-1);
  assert.equal(day.totalMs, 15 * 60_000);
  assert.equal(day.intervals[0].end, Date.parse('2026-11-06T10:15:00Z'));
  assert.ok(weeklyOutages([], now).every((item) => item.coveredMs === 0));
});
