import test from 'node:test';
import assert from 'node:assert/strict';
import { readArchive, dayHash, sha256, normalizeLocalPath, parseDay } from '../app/wo/archive.ts';

const baseDay = (date = '2026-10-27') => ({ schemaVersion: 1, date, timeZone: 'Asia/Shanghai', asOfMs: 1793059200000, status: 'READY', headline: '测试日记录 🧪', summary: ['仅为合成测试数据'], facts: [], metrics: [{ key: 'steps', value: null, unit: '步', label: '步数' }], episodes: [{ id: 'synthetic', startMs: 1793059200000, endMs: 1793062800000, kind: 'VISIT', title: '合成片段', assertion: 'INFERRED', favorite: false, sources: ['LOCATION'], qualityFlags: [] }], coverage: [{ source: 'HEALTH', available: false }], warnings: [] });
const source = (path, content) => ({ path, size: Buffer.byteLength(content), text: async () => content });
const json = (path, value) => source(path, JSON.stringify(value));
async function indexed(day, extra = {}) {
  return { schemaVersion: 2, source: 'wo-life-records', archiveZone: day.timeZone, updatedAtMs: day.asOfMs, days: [{ date: day.date, path: `wo/days/${day.date}.json`, hash: await dayHash(day) }], memory: null, pendingDates: [], ...extra };
}
test('single-day reads retain unknown metrics and inferred assertions', async () => {
  const day = baseDay();
  const archive = await readArchive([json(day.date + '.json', day)]);
  assert.equal(archive.days[0].metrics[0].value, null);
  assert.equal(archive.days[0].episodes[0].assertion, 'INFERRED');
  assert.equal(archive.days[0].verified, false);
  assert.equal(archive.indexed, false);
  assert.equal(archive.warnings.length, 1);
});
test('only indexed days are displayed, with pending snapshots and verified memory', async () => {
  const day = baseDay();
  const memory = { schemaVersion: 1, revision: 1, notes: '合成偏好', updatedAtMs: day.asOfMs, observations: [{ text: '合成观察', dates: [day.date], createdAtMs: day.asOfMs }], review: null };
  const memoryText = JSON.stringify(memory);
  const index = await indexed(day, { pendingDates: [day.date], memory: { path: 'wo/memory.json', hash: await sha256(memoryText) } });
  const archive = await readArchive([json('repo-main/wo/index.json', index), json(`repo-main/wo/days/${day.date}.json`, day), json('repo-main/wo/days/2026-10-26.json', baseDay('2026-10-26')), source('repo-main/wo/memory.json', memoryText)]);
  assert.equal(archive.days.length, 1);
  assert.equal(archive.days[0].verified, true);
  assert.equal(archive.days[0].pending, true);
  assert.equal(archive.memory.notes, '合成偏好');
});
test('both ordered JSON-field and Unicode text fragments reconstruct the exact day', async t => {
  for (const format of ['wo-day-parts', 'wo-day-text-parts']) await t.test(format, async () => {
    const day = baseDay(), hash = await dayHash(day);
    const content = JSON.stringify(day);
    const values = format === 'wo-day-parts' ? [Object.fromEntries(Object.entries(day).filter(([key]) => key !== 'episodes')), { episodes: day.episodes.slice(0, 0) }, { episodes: day.episodes }] : [{ text: content.slice(0, 60) }, { text: content.slice(60) }];
    const files = values.map((value, index) => ({ path: `wo/parts/${day.date}/${hash}/${String(index).padStart(5, '0')}.json`, content: JSON.stringify(value) }));
    const manifest = { schemaVersion: 2, format, date: day.date, timeZone: day.timeZone, asOfMs: day.asOfMs, hash, fields: Object.keys(day), arrays: Object.entries(day).filter(([, value]) => Array.isArray(value)).map(([key]) => key), parts: await Promise.all(files.map(async file => ({ path: file.path, hash: await sha256(file.content) }))) };
    const archive = await readArchive([json('wo/index.json', await indexed(day)), json(`wo/days/${day.date}.json`, manifest), ...files.map(file => source(file.path, file.content))]);
    assert.equal(archive.days[0].headline, day.headline);
    assert.equal(archive.days[0].episodes.length, 1);
    assert.equal(archive.days[0].verified, true);
  });
});
test('corrupt or missing days never become empty days, and one bad date does not hide good dates', async () => {
  const day = baseDay(), earlier = baseDay('2026-10-26');
  const index = await indexed(day);
  index.days.push({ date: earlier.date, path: `wo/days/${earlier.date}.json`, hash: await dayHash(earlier) });
  const changed = { ...earlier, headline: '被修改' };
  const archive = await readArchive([json('wo/index.json', index), json(`wo/days/${day.date}.json`, day), json(`wo/days/${earlier.date}.json`, changed)]);
  assert.deepEqual(archive.days.map(item => item.date), [day.date]);
  assert.match(archive.warnings[0], /2026-10-26 未载入/);
  await assert.rejects(readArchive([json('wo/index.json', index)]), /没有可读取的有效记录/);
});
test('invalid indices, timezone mismatch, traversal, duplicate paths and canceled reads are rejected', async () => {
  const day = baseDay();
  assert.throws(() => normalizeLocalPath('../wo/index.json'));
  assert.throws(() => parseDay({ ...day, date: '2026-02-30' }));
  await assert.rejects(readArchive([json('index.json', await indexed(day)), json('wo/index.json', await indexed(day))]), /重复路径/);
  await assert.rejects(readArchive([json('wo/index.json', await indexed(day, { archiveZone: 'UTC' })), json(`wo/days/${day.date}.json`, day)]), /没有可读取/);
  const signal = AbortSignal.abort();
  await assert.rejects(readArchive([json(day.date + '.json', day)], { signal }), { name: 'AbortError' });
});
test('corrupt memory is isolated and never exposed as verified observations', async () => {
  const day = baseDay(), index = await indexed(day, { memory: { path: 'wo/memory.json', hash: '0'.repeat(64) } });
  const archive = await readArchive([json('wo/index.json', index), json(`wo/days/${day.date}.json`, day), json('wo/memory.json', { notes: 'wrong' })]);
  assert.equal(archive.memory, null);
  assert.match(archive.warnings[0], /记忆未载入/);
});
