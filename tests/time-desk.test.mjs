import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchedule, cities, localAt, timeLabel, utcStart } from '../app/time-desk/time.ts';

const city = id => cities.find(item => item.id === id);

test('time desk accepts actual UTC calendar dates, never normalizes invalid days', () => {
  assert.equal(utcStart('2028-02-29'), Date.UTC(2028, 1, 29));
  for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-2-01', '']) {
    assert.ok(Number.isNaN(utcStart(value)), value);
  }
});

test('time desk preserves local calendar day and observes weekday at cross-day edges', () => {
  const start = utcStart('2026-11-20'); // Friday UTC
  const york = localAt(start, 0, 'America/New_York');
  assert.deepEqual([york.date, york.weekday, york.minute, york.dayDelta, york.offset],
    ['2026-11-19', '四', 19 * 60, -1, 'UTC-05:00']);
  const tokyo = localAt(start, 16 * 60, 'Asia/Tokyo');
  assert.deepEqual([tokyo.date, tokyo.weekday, tokyo.minute, tokyo.dayDelta, tokyo.working],
    ['2026-11-21', '六', 60, 1, false]);
  const india = localAt(start, 5 * 60 + 15, 'Asia/Kolkata');
  assert.equal(timeLabel(india.minute), '10:45');
  assert.equal(india.offset, 'UTC+05:30');
});

test('time desk reflects spring forward and distinguishes repeated fall-back local hour', () => {
  const spring = utcStart('2026-03-08');
  const fall = utcStart('2026-11-01');
  assert.deepEqual([localAt(spring, 405, 'America/New_York').minute, localAt(spring, 420, 'America/New_York').minute],
    [105, 180]);
  const first = localAt(fall, 330, 'America/New_York');
  const second = localAt(fall, 390, 'America/New_York');
  assert.equal(first.minute, 90);
  assert.equal(second.minute, 90);
  assert.notEqual(first.offset, second.offset);
  const { allRows } = buildSchedule(fall, [city('America/New_York')]);
  assert.deepEqual(allRows[0].offsets, ['UTC-04:00', 'UTC-05:00']);
});

test('time desk uses half-open UTC overlap windows and local weekends', () => {
  const london = city('Europe/London');
  const ny = city('America/New_York');
  const beijing = city('Asia/Shanghai');
  const summer = buildSchedule(utcStart('2026-07-06'), [london, ny]);
  const winter = buildSchedule(utcStart('2026-01-05'), [london, ny]);
  assert.deepEqual(summer.windows, [{ start: 13 * 60, end: 17 * 60 }]);
  assert.deepEqual(winter.windows, [{ start: 14 * 60, end: 18 * 60 }]);
  assert.equal(summer.overlap[17 * 4 - 1], true);
  assert.equal(summer.overlap[17 * 4], false);
  assert.deepEqual(buildSchedule(utcStart('2026-07-05'), [london, ny]).windows, []);
  assert.deepEqual(buildSchedule(utcStart('2026-01-05'), [london, ny, beijing]).windows, []);
});

test('time desk displays end-of-day 24:00 without inventing a selectable next day instant', () => {
  const la = city('America/Los_Angeles');
  const { windows, allRows } = buildSchedule(utcStart('2026-01-05'), [la]);
  assert.deepEqual(windows, [{ start: 17 * 60, end: 1440 }]);
  assert.equal(timeLabel(windows[0].end), '24:00');
  assert.equal(allRows[0].slots.length, 96);
});
