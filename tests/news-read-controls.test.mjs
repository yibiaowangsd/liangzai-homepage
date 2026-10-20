import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../news-worker/index.js';
import { editionDatesSql } from '../news-worker/news-queries.js';

function fixture(t, withCache = true) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE news(id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, summary TEXT,
    content TEXT, category TEXT, tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT, published_at TEXT, status TEXT);
    CREATE TABLE news_editions(date TEXT PRIMARY KEY, schema_version INTEGER, coverage TEXT, slugs TEXT);
    CREATE TABLE newsletter_subscribers(id TEXT PRIMARY KEY);`);
  const migration = readFileSync(new URL('../news-worker/migrations/0011_news_read_indexes.sql', import.meta.url), 'utf8');
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)');
  let id = 0;
  const add = (timestamp, category = 'pqc', status = 'published') => insert.run(++id, `story-${id}`, 'AWS 铜锁新闻', 'summary', 'AWS TLS 实践', category, timestamp, status);
  for (let day = 1; day <= 20; day++) for (let article = 0; article < 20; article++) add(`2026-10-${String(day).padStart(2, '0')}T08:00:00+08:00`, article % 2 ? 'pqc' : 'ai');
  db.exec(migration);
  const counters = { reads: 0, limits: 0, writes: 0 };
  let fail = false, allow = true, clock = Date.parse('2026-10-20T09:30:00Z');
  const env = { DB: { prepare(sql) {
    const stmt = db.prepare(sql); let args = [];
    return { bind(...values) { args = values; return this; }, async all() {
      counters.reads++; if (fail) throw new Error('D1_ERROR: daily row read limit exceeded');
      return { results: stmt.all(...args), meta: { rows_read: 9, rows_written: 0, duration: 2 } };
    }, async first() { return (await this.all()).results[0]; } };
  } }, NEWS_READ_LIMITER: { async limit() { counters.limits++; return { success: allow }; } } };
  env.NEWS_SEARCH_LIMITER = env.NEWS_READ_LIMITER;
  env.NEWS_SEARCH_MISS_LIMITER = env.NEWS_READ_LIMITER;
  const storage = new Map();
  const cache = { async match(key) { return storage.get(key.url)?.clone(); }, async put(key, response) { counters.writes++; storage.set(key.url, response.clone()); } };
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  if (withCache) Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: cache } });
  t.mock.method(Date, 'now', () => clock);
  t.after(() => { db.close(); if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches); else delete globalThis.caches; });
  const request = async (path, headers = {}) => {
    const pending = [];
    const result = await worker.fetch(new Request('https://api.wangyibiao.com' + path, { headers }), env, { waitUntil(promise) { pending.push(promise); } });
    await Promise.all(pending);
    return result;
  };
  return { db, env, add, cache, storage, counters, request, fail: value => { fail = value; }, allow: value => { allow = value; }, advance: milliseconds => { clock += milliseconds; } };
}

test('public cache canonicalizes ignored parameters and keeps CORS specific to each caller', async t => {
  const f = fixture(t);
  const first = await f.request('/api/news/editions?page=1&pageSize=80&cachebuster=one', { Origin: 'https://wangyibiao.com' });
  assert.equal(first.status, 200); assert.equal(first.headers.get('X-News-Cache'), 'MISS');
  assert.equal(first.headers.get('X-News-Rows-Read'), '27');
  const payload = await first.json(), reads = f.counters.reads, limits = f.counters.limits;
  for (const origin of ['https://www.wangyibiao.com', 'https://other.example']) {
    const cached = await f.request('/api/news/editions?page=1&pageSize=1&cachebuster=two', { Origin: origin });
    assert.equal(cached.headers.get('X-News-Cache'), 'HIT'); assert.equal(cached.headers.get('X-News-Rows-Read'), '0');
    assert.equal(cached.headers.get('Access-Control-Allow-Origin'), origin.includes('other') ? null : origin);
    assert.deepEqual(await cached.json(), payload);
  }
  assert.equal(f.counters.reads, reads); assert.equal(f.counters.limits, limits);
  const invalid = await f.request('/api/news/editions?date=2026-02-29');
  assert.equal(invalid.status, 400); assert.equal(f.counters.reads, reads);
});

test('cached data expires within 60 seconds after publishing and date links remain correct', async t => {
  const f = fixture(t);
  assert.equal((await (await f.request('/api/news/editions')).json()).data[0].date, '2026-10-20');
  f.add('2026-10-20T16:00:00Z');
  assert.equal((await (await f.request('/api/news/editions')).json()).data[0].date, '2026-10-20');
  f.advance(60000);
  const fresh = await f.request('/api/news/editions');
  assert.equal(fresh.headers.get('X-News-Cache'), 'MISS');
  assert.equal((await fresh.json()).data[0].date, '2026-10-21');
  const linked = await (await f.request('/api/news/editions?date=2026-10-19&page=1')).json();
  assert.equal(linked.data[0].date, '2026-10-19'); assert.equal(linked.meta.page, 3);
  for (const page of [1, 2, 999]) {
    const absent = await (await f.request(`/api/news/editions?date=2026-12-31&page=${page}`)).json();
    assert.deepEqual(absent.data, []);
    assert.equal(absent.meta.page, Math.min(page, absent.meta.totalPages), 'Missing dates must retain their requested page metadata');
  }
});

test('cold request limits and shared search protection reject before D1, while warm pages stay available', async t => {
  const f = fixture(t);
  await f.request('/api/news/featured?limit=8');
  const reads = f.counters.reads;
  f.allow(false);
  assert.equal((await f.request('/api/news/featured?limit=8')).status, 200);
  for (const path of ['/api/news/editions?page=2', '/api/news/search?q=AWS']) {
    const response = await f.request(path);
    assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
  }
  assert.equal(f.counters.reads, reads);
  f.allow(true);
  f.env.NEWS_SEARCH_MISS_LIMITER = { async limit() { return { success: false }; } };
  assert.equal((await f.request('/api/news/search?q=AWS')).status, 429);
  assert.equal(f.counters.reads, reads);
});

test('D1 quota errors, misses and cache failures never become cached empty successes', async t => {
  const f = fixture(t);
  f.fail(true);
  const failed = await f.request('/api/news/search?q=AWS');
  assert.equal(failed.status, 503); assert.equal(failed.headers.get('Retry-After'), '60');
  assert.equal(f.storage.size, 0);
  f.fail(false);
  const recovered = await f.request('/api/news/search?q=AWS');
  assert.equal(recovered.status, 200); assert.equal((await recovered.json()).meta.total, 400);
  const count = f.storage.size;
  assert.equal((await f.request('/api/news/missing-story')).status, 404);
  assert.equal((await f.request('/api/news/missing-story')).status, 404);
  assert.equal(f.storage.size, count);
  f.cache.match = () => { throw new Error('Cache read unavailable'); };
  f.cache.put = () => { throw new Error('Cache write unavailable'); };
  assert.equal((await f.request('/api/news/featured')).status, 200);
});

test('authorization, cookies and non-news routes never enter the public cache', async t => {
  const f = fixture(t);
  for (const headers of [{ Authorization: 'Bearer test' }, { Cookie: 'session=test' }]) {
    const response = await f.request('/api/news?limit=3', headers);
    assert.equal(response.status, 200); assert.equal(response.headers.get('X-News-Cache'), 'BYPASS');
  }
  assert.equal(f.storage.size, 0);
  for (const path of ['/api/subscriptions', '/api/robot-subscriptions', '/api/admin/news/resend/status']) {
    const response = await f.request(path);
    assert.equal(response.headers.get('X-News-Cache'), null);
  }
  assert.equal(f.storage.size, 0);
});

test('day indexes use seeks for calendar, article and digest queries across Beijing midnight', t => {
  const f = fixture(t, false);
  f.add('2026-10-20T15:59:59.999Z'); f.add('2026-10-20T16:00:00.000Z');
  f.add('2026-10-22T00:00:00+08:00', 'pqc', 'draft');
  f.db.prepare("INSERT INTO news_editions VALUES ('2026-10-23', 3, '{}', '[]')").run();
  for (const category of [null, 'pqc']) {
    const sql = editionDatesSql(category, true), args = category ? [category] : [];
    const dates = f.db.prepare(sql).all(...args).map(row => row.edition_date);
    assert.deepEqual(dates.slice(0, 3), ['2026-10-23', '2026-10-21', '2026-10-20']);
    assert.ok(!dates.includes('2026-10-22'));
    const plan = f.db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...args).map(row => row.detail).join('\n');
    assert.match(plan, /SEARCH news USING COVERING INDEX idx_news_published_(?:category_)?day/);
    assert.match(plan, /<expr><\?/);
  }
  const sql = "SELECT slug, title FROM news WHERE status = 'published' AND date(published_at, '+8 hours') = ? ORDER BY published_at DESC, id DESC";
  assert.match(f.db.prepare('EXPLAIN QUERY PLAN ' + sql).all('2026-10-21').map(row => row.detail).join('\n'), /USING INDEX idx_news_published_day \(<expr>=\?\)/);
  assert.equal(f.db.prepare(sql).all('2026-10-21').length, 1);
  assert.equal(f.db.prepare(sql).all('2026-10-20').length, 21);
});
