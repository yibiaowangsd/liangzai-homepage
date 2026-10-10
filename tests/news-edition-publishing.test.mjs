import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import worker from '../news-worker/index.js';
import { CORE_CATEGORIES, publishedCoverage } from '../news-worker/edition.js';
import { buildRobotDigest } from '../news-worker/robot.js';
import { buildDigest, normalizeCategories } from '../news-worker/subscriptions.js';

const date = '2026-10-11';
function payload(count = 3) {
  const article = JSON.parse(readFileSync(new URL('../news/inbox/2026-10-10.json', import.meta.url))).items[0];
  article.content = '原始来源：2026-10-09。\n\n' + article.content;
  const items = CORE_CATEGORIES.flatMap(category => Array.from({ length: count }, (_, i) => ({ ...article,
    slug: `20261011-${category}-${i}`, category, source_url: `https://csrc.nist.gov/test/${category}/${i}`,
    published_at: '2026-10-11T07:55:00+08:00',
  })));
  return { schema_version: 2, date, items, coverage: Object.fromEntries(CORE_CATEGORIES.map(key => [key, { count, note: '' }])) };
}
function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, summary TEXT, content TEXT,
    category TEXT, tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT, published_at TEXT, status TEXT, updated_at TEXT)`);
  db.exec(readFileSync(new URL('../news-worker/migrations/0005_news_editions.sql', import.meta.url), 'utf8'));
  const env = { ADMIN_TOKEN: 'test', DB: { prepare(sql) {
    const statement = db.prepare(sql); let args = [];
    return { bind(...values) { args = values; return this; },
      async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; },
      async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } };
  }, async batch(statements) {
    db.exec('BEGIN'); try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } } };
  t.after(() => db.close());
  const publish = body => worker.fetch(new Request('https://api.wangyibiao.com/api/admin/news/batch', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  const rows = () => db.prepare('SELECT * FROM news').all();
  return { db, env, publish, rows };
}

test('v2 publishes up to 35, retries without duplicates and atomically replaces a shorter edition', async t => {
  const f = fixture(t), full = payload(5);
  const first = await f.publish(full); assert.equal(first.status, 200);
  assert.equal((await first.json()).inserted, 35);
  assert.equal((await (await f.publish(full)).json()).skipped, 35);
  const shorter = payload(3);
  shorter.items = shorter.items.filter(item => item.category !== 'ngcc');
  shorter.coverage.ngcc = { count: 0, note: '本期未发现可核实的新进展，已核对官方公告与候选报告。' };
  const result = await (await f.publish(shorter)).json();
  assert.equal(result.removed, 17); assert.equal(result.skipped, 18);
  assert.deepEqual(await publishedCoverage(f.env, date, f.rows()), shorter.coverage);
  const edition = await (await worker.fetch(new Request('https://api.wangyibiao.com/api/news/editions'), f.env)).json();
  assert.equal(edition.data[0].date, date, 'Before 08:00 Beijing is still the current edition');
  assert.equal(edition.data[0].total, 18); assert.deepEqual(edition.data[0].coverage, shorter.coverage);
  const emptyDesk = await (await worker.fetch(new Request('https://api.wangyibiao.com/api/news/editions?category=ngcc'), f.env)).json();
  assert.equal(emptyDesk.data[0].total, 0); assert.equal(emptyDesk.data[0].coverage.ngcc.count, 0);
  f.db.prepare('DELETE FROM news WHERE slug = ?').run(shorter.items[0].slug);
  assert.equal(await publishedCoverage(f.env, date, f.rows()), null, 'Partial data never authorizes delivery');
});

test('invalid manifests, duplicate stories, wrong dates and post-cutover legacy data do not mutate published rows', async t => {
  const f = fixture(t); await f.publish(payload()); const before = JSON.stringify(f.rows());
  const cases = [
    p => { delete p.coverage; },
    p => { p.coverage.ngcc.count = 4; },
    p => { p.items = p.items.filter(x => x.category !== 'ngcc'); p.coverage.ngcc = { count: 0, note: '' }; },
    p => { p.items[1].slug = p.items[0].slug; },
    p => { p.items[0].published_at = '2026-10-12T00:00:00+08:00'; },
    p => { p.items[0].category = 'bad'; },
    p => { delete p.schema_version; },
    p => { p.items = []; },
  ];
  for (const alter of cases) { const bad = payload(); alter(bad); assert.equal((await f.publish(bad)).status, 400); assert.equal(JSON.stringify(f.rows()), before); }
  assert.equal(await publishedCoverage(f.env, '2026-10-12', []), null);
});

test('a failure writing the manifest rolls back upserts and removals', async t => {
  const f = fixture(t); await f.publish(payload(5)); const before = JSON.stringify(f.rows());
  f.db.exec("CREATE TRIGGER fail_manifest BEFORE UPDATE ON news_editions BEGIN SELECT RAISE(ABORT, 'test transaction failure'); END");
  const changed = payload(); changed.items[0].title = 'This update must be rolled back';
  assert.equal((await f.publish(changed)).status, 500);
  assert.equal(JSON.stringify(f.rows()), before);
});

test('new categories can be selected together without exposing internal coverage notes in digests', async () => {
  assert.deepEqual(normalizeCategories(CORE_CATEGORIES), CORE_CATEGORIES);
  const p = payload(); p.coverage.ngcc = { count: 0, note: '本期未发现可核实的新进展，已核对候选安全报告。' };
  p.coverage.migration.note = '本期保留可实际阅读并核实的迁移部署案例，其他旧版选题已剔除。';
  const items = p.items.filter(item => item.category !== 'ngcc');
  const messages = buildRobotDigest(date, items, CORE_CATEGORIES, undefined, p.coverage);
  assert.equal(messages.length, 7); assert.match(messages.at(-1).textMsg.content, /7\/7 · NGCC 公钥征集/);
  const mail = await buildDigest({ ADMIN_TOKEN: 'test', NEWSLETTER_FROM: 'test@example.com' }, { id: 'test', email: 'reader@example.com', categories: '["migration","ngcc"]', token_version: 'v1' }, date, items, p.coverage);
  for (const note of [p.coverage.ngcc.note, p.coverage.migration.note]) {
    assert.ok(messages.every(message => !message.textMsg.content.includes(note)));
    assert.ok(!mail.text.includes(note)); assert.ok(!mail.html.includes(note));
  }
  assert.ok(mail.text.includes(items.find(item => item.category === 'migration').title));
  assert.match(mail.subject, /抗量子迁移.*NGCC/);
});

test('Python validator accepts complete v2 and documented shortfalls, rejecting unexplained or padded content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-validator-')), file = join(dir, date + '.json');
  const validate = p => { writeFileSync(file, JSON.stringify(p)); return spawnSync('python3', ['news/validate-edition.py', file], { encoding: 'utf8' }); };
  try {
    const p = payload(); let run = validate(p); assert.equal(run.status, 0, run.stderr);
    p.items = p.items.filter(item => item.category !== 'ngcc'); p.coverage.ngcc = { count: 0, note: '本期未发现可核实的新进展，已核对候选安全报告。' };
    run = validate(p); assert.equal(run.status, 0, run.stderr);
    p.coverage.ngcc.note = ''; assert.notEqual(validate(p).status, 0);
    const duplicate = payload(); duplicate.items[0].content += '\n\n' + duplicate.items[0].content.split('\n\n')[1]; assert.notEqual(validate(duplicate).status, 0);
    const stale = payload(); stale.schema_version = 1; assert.notEqual(validate(stale).status, 0);
  } finally { rmSync(dir, { recursive: true }); }
});

test('historical five-by-five editions still publish and qualify for legacy digest delivery', async t => {
  const f = fixture(t);
  const legacy = JSON.parse(readFileSync(new URL('../news/inbox/2026-10-08.json', import.meta.url), 'utf8'));
  const response = await f.publish(legacy); assert.equal(response.status, 200);
  assert.equal((await response.json()).inserted, 25);
  assert.deepEqual(await publishedCoverage(f.env, legacy.date, f.rows()), {});
});
