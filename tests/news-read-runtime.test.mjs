import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const bundle = await build({ entryPoints: ['news-worker/index.js'], bundle: true, write: false, format: 'esm', platform: 'browser' });

test('real Worker cache, indexed calendar and scalar fuzzy search preserve the archive', async t => {
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-05-22', d1Databases: { DB: 'news-read-runtime' } });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  await db.prepare(`CREATE TABLE news(id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, summary TEXT, content TEXT,
    category TEXT, tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT, published_at TEXT, status TEXT)`).run();
  await db.prepare('CREATE TABLE news_editions(date TEXT PRIMARY KEY, schema_version INTEGER, coverage TEXT, slugs TEXT)').run();
  const migration = readFileSync(new URL('../news-worker/migrations/0011_news_read_indexes.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '');
  for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
  await db.prepare("INSERT INTO news VALUES (1, 'runtime-old', '铜锁协议', 'summary', 'Kubernetes AWS TLS old body', 'protocol', NULL, NULL, NULL, NULL, '2026-09-30T16:00:00Z', 'published')").run();
  await db.prepare("INSERT INTO news VALUES (2, 'runtime-new', 'AWS 新进展', 'summary', '正文', 'ai', NULL, NULL, NULL, NULL, '2026-10-20T08:00:00+08:00', 'published')").run();
  const request = async path => {
    const response = await mf.dispatchFetch('https://api.wangyibiao.com' + path, { headers: { Origin: 'https://wangyibiao.com' } });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return { data, headers: response.headers };
  };
  const first = await request('/api/news/editions');
  assert.equal(first.headers.get('X-News-Cache'), 'MISS');
  assert.deepEqual(first.data.meta.dates, ['2026-10-20', '2026-10-01']);
  let second = await request('/api/news/editions');
  // waitUntil cache writes are asynchronous; a real clock may also roll over.
  for (let attempt = 0; second.headers.get('X-News-Cache') === 'MISS' && attempt < 5; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    second = await request('/api/news/editions');
  }
  assert.equal(second.headers.get('X-News-Cache'), 'HIT');
  assert.equal(second.headers.get('X-News-Rows-Read'), '0');
  assert.equal(second.headers.get('Access-Control-Allow-Origin'), 'https://wangyibiao.com');
  for (const query of ['tongsou', 'kubernets', 'AWS TLS']) {
    const result = await request('/api/news/search?q=' + encodeURIComponent(query));
    assert.deepEqual(result.data.data.map(row => row.slug), ['runtime-old'], query);
    assert.equal(result.data.meta.total, 1);
  }
  const page = await request('/api/news/editions?page=2');
  assert.equal(page.data.data[0].date, '2026-10-01');
});
