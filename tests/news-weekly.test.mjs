import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../news-worker/index.js';
import { CORE_CATEGORIES } from '../news-worker/edition.js';
import { byPriority, storyPriority } from '../news-worker/priority.js';
import { buildRobotDigest, sendRobotDigest } from '../news-worker/robot.js';
import { buildDigest, sendDailyDigest } from '../news-worker/subscriptions.js';
import { encryptWebhook, webhookHash } from '../news-worker/robot-config.js';
import { validateWeeklyReport, weeklyWindow, publishWeeklyReport, sendWeeklyReport } from '../news-worker/weekly.js';
import { editionHash } from '../news-worker/resend-campaign.js';

const friday = '2026-10-23';
function report() {
  const items = [
    ['ai', 'P2', true, 'second-headline'], ['pqc', 'P1', true, 'first-headline'],
    ['pqc', 'P3', false, 'other-pqc'], ['ai', 'P2', false, 'other-ai'],
  ].map(([category, priority, front_page, name]) => ({
    slug: `20261023-weekly-${name}`, title: name, summary: '本周实际新增的测试事件，包含公开版本、影响范围及可验证的变化，测试数据不会发往任何真实订阅者。',
    content: '来源日期：2026-10-22。\n\n' + '本测试材料用于验证周报发布、分版、优先级和投递行为，并非真实新闻。'.repeat(24),
    category, priority, priority_reason: '存在已核实的具体变化，按影响范围区分跟进优先级。', front_page,
    source_name: 'Mock primary source', source_url: `https://example.com/${name}`, event_at: '2026-10-22T10:00:00+08:00',
  }));
  return { schema_version: 1, kind: 'weekly', date: friday, ...weeklyWindow(friday), summary: '这是用于测试的一周趋势综述，说明本周新增事件的技术意义、事实证据、当前公开状态与待核查事项。'.repeat(3),
    coverage: Object.fromEntries(CORE_CATEGORIES.map(category => [category, { count: items.filter(item => item.category === category).length, note: '已检查两类测试来源；无新增的栏目记录实际覆盖及限制。' }])), items };
}

function fixture(t, mail = false) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, summary TEXT, content TEXT,
    category TEXT, tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT, published_at TEXT, status TEXT, updated_at TEXT)`);
  const migrations = new URL('../news-worker/migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, migrations), 'utf8'));
  const env = { ADMIN_TOKEN: 'test-only-admin', ...(mail ? { RESEND_API_KEY: 'test-only-provider', NEWSLETTER_FROM: 'test@example.com' } : {}), DB: {
    prepare(sql) {
      const statement = db.prepare(sql); let args = [];
      return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } };
    },
    async batch(statements) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (error) { db.exec('ROLLBACK'); throw error; } },
  } };
  const calls = []; let respond = () => Response.json({ ok: true, code: 200 });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(['imtwo.zdxlz.com', 'api.resend.com'].includes(new URL(url).hostname));
    calls.push({ url, payload: JSON.parse(options.body), key: options.headers['Idempotency-Key'] });
    return new URL(url).hostname === 'api.resend.com' ? Response.json({ id: `mail-${calls.length}` }) : respond();
  });
  async function robot(overrides = {}) {
    const row = { id: crypto.randomUUID(), categories: '["pqc","ai"]', status: 'approved', version: crypto.randomUUID(), send_mode: 'single', mention_mode: 'all', ...overrides };
    const url = `https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=test-${row.id}`;
    db.prepare(`INSERT INTO robot_subscribers (id,webhook_hash,webhook_ciphertext,webhook_display,categories,reason,status,consent_version,version,send_mode,mention_mode)
      VALUES (?,?,?,'test',?,'test',?,'test',?,?,?)`).run(row.id, await webhookHash(env, url), await encryptWebhook(env, row.id, url), row.categories, row.status, row.version, row.send_mode, row.mention_mode);
    return row;
  }
  function email(overrides = {}) {
    const row = { id: crypto.randomUUID(), email: `${crypto.randomUUID()}@example.com`, categories: '["ai"]', status: 'approved', token_version: crypto.randomUUID(), email_verified_at: '2026-10-21', ...overrides };
    db.prepare(`INSERT INTO newsletter_subscribers (id,email,categories,reason,status,consent_version,token_version,email_verified_at) VALUES (?,?,?,'test',?,'test',?,?)`).run(row.id, row.email, row.categories, row.status, row.token_version, row.email_verified_at);
    return row;
  }
  const api = (path, body, auth = true) => worker.fetch(new Request(`https://api.wangyibiao.com${path}`, { method: body ? 'POST' : 'GET', headers: { ...(auth ? { Authorization: 'Bearer test-only-admin' } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  t.after(() => db.close());
  return { env, db, calls, robot, email, api, respond(fn) { respond = fn; } };
}

test('weekly uses an exact Friday 08:10 seven-day half-open window and rejects invalid dates', () => {
  assert.deepEqual(weeklyWindow(friday), { period_start: '2026-10-16T00:10:00.000Z', period_end: '2026-10-23T00:10:00.000Z' });
  for (const date of ['2026-10-22', '2026-02-30', 'bad']) assert.throws(() => weeklyWindow(date));
  const p = report(); assert.equal(validateWeeklyReport(p), p);
  p.items[0].event_at = p.period_start; assert.doesNotThrow(() => validateWeeklyReport(p));
  p.items[0].event_at = p.period_end; assert.throws(() => validateWeeklyReport(p), /window/);
  p.items[0].event_at = '2026-10-22T10:00:00'; assert.throws(() => validateWeeklyReport(p), /window/);
});

test('weekly enforces editorial priority, source, coverage and no duplicate event IDs', () => {
  for (const mutate of [
    p => { p.items[0].priority = 'P0'; }, p => { p.items[0].priority_reason = ''; },
    p => { p.items[0].priority = 'P3'; }, p => { p.items[0].front_page = 'true'; },
    p => { p.items[0].slug = p.items[1].slug; }, p => { p.items[0].source_url = p.items[1].source_url; },
    p => { p.coverage.ai.count = 1; }, p => { delete p.coverage.flash; }, p => { p.period_end = '2026-10-23T08:00:00+08:00'; },
    p => { p.items[0].content = 'too short'; }, p => { p.items[0].event_at = '2026-10-15T23:59:59Z'; },
  ]) { const p = report(); mutate(p); assert.throws(() => validateWeeklyReport(p)); }
});

test('weekly robot pages allow multiple headlines, sort priorities, filter desks, and mention only once', () => {
  const p = report();
  const messages = buildRobotDigest(friday, p.items, ['pqc', 'ai'], { mode: 'all', mobiles: [] }, { report: p, send_mode: 'single' });
  assert.equal(messages.length, 3, 'Weekly always keeps the front page separate even for daily single-message subscribers');
  assert.match(messages[0].textMsg.content, /【头版头条】/);
  assert.match(messages[0].textMsg.content, /1\. \[P1·重大\] first-headline/);
  assert.match(messages[0].textMsg.content, /2\. \[P2·重要\] second-headline/);
  assert.ok(messages.slice(1).every(message => message.textMsg.content.includes('其余新闻') && !message.textMsg.content.includes('-headline')));
  assert.equal(messages.filter(message => message.textMsg.isMentioned).length, 1);
  assert.equal(messages[0].textMsg.mentionType, 1);
  const ai = buildRobotDigest(friday, p.items, ['ai'], undefined, { report: p });
  assert.equal(ai.length, 2); assert.ok(ai.every(message => !/first-headline|other-pqc/.test(message.textMsg.content)));
  assert.ok(messages.every(message => !/coverage|核查|priority_reason/.test(message.textMsg.content)));
});

test('large front pages split on events while preserving complete original links and byte limits', () => {
  const p = report();
  p.items = Array.from({ length: 20 }, (_, index) => ({ ...p.items[0], title: '重大技术进展'.repeat(15) + index, front_page: true, source_url: `https://example.com/${index}?q=${'x'.repeat(800)}` }));
  const messages = buildRobotDigest(friday, p.items, ['ai'], { mode: 'all' }, { report: p });
  assert.ok(messages.length > 1);
  assert.ok(messages.every(message => message.textMsg.content.includes('【头版头条】') && Buffer.byteLength(message.textMsg.content) < 3600));
  for (const item of p.items) assert.equal(messages.filter(message => message.textMsg.content.includes(item.source_url)).length, 1);
  assert.equal(messages.filter(message => message.textMsg.isMentioned).length, 1);
});

test('weekly publication is authenticated, idempotent, readable, and does not replace Friday daily news', async t => {
  const f = fixture(t); const p = report();
  f.db.prepare("INSERT INTO news (slug,title,status,published_at) VALUES ('daily-kept','daily','published',?)").run(`${friday}T08:10:00+08:00`);
  assert.equal((await f.api('/api/admin/news/weekly', p, false)).status, 401);
  for (let i = 0; i < 2; i++) assert.equal((await f.api('/api/admin/news/weekly', p)).status, 200);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM news_weekly_reports').get().n, 1);
  assert.equal(f.db.prepare('SELECT slug FROM news').get().slug, 'daily-kept');
  const response = await f.api(`/api/news/weekly?date=${friday}`, null, false);
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, p);
  assert.deepEqual((await (await f.api('/api/news/weekly', null, false)).json()).data, p);
  assert.equal((await f.api('/api/news/weekly?date=invalid')).status, 400);
  const invalid = structuredClone(p); invalid.items[0].priority = 'P0';
  assert.equal((await f.api('/api/admin/news/weekly', invalid)).status, 400);
  assert.equal(f.calls.length, 0, 'Publishing never sends an immediate message');
});

test('daily priority persists through tags, ranks stories and rejects missing new priorities', async t => {
  const f = fixture(t);
  const article = JSON.parse(readFileSync(new URL('../news/inbox/2026-10-21.json', import.meta.url))).items[0];
  const p = { schema_version: 3, date: '2026-10-22', coverage: Object.fromEntries(CORE_CATEGORIES.map(category => [category, { count: category === article.category ? 1 : 0, note: '测试来源已完成核查，按实际合格条数发布，不凑数量。' }])),
    items: [{ ...article, slug: '20261022-priority-test', published_at: '2026-10-22T08:10:00+08:00', priority: 'P1', priority_reason: '具有明确且广泛的实际影响，需要优先阅读。' }] };
  const response = await f.api('/api/admin/news/batch', p); assert.equal(response.status, 200, await response.text());
  const stored = f.db.prepare('SELECT * FROM news').get(); assert.equal(storyPriority(stored), 'P1');
  assert.equal(await editionHash(p.date, p.items), await editionHash(p.date, [stored]), 'Resend preview hashes the persisted priority exactly like the source edition');
  const digest = buildRobotDigest('2026-10-22', [stored], [article.category]);
  assert.match(digest[0].textMsg.content, /\[P1·重大\]/);
  assert.deepEqual([{ priority: 'P3' }, { priority: 'P1' }, { priority: 'P2' }].sort(byPriority).map(item => item.priority), ['P1', 'P2', 'P3']);
  delete p.items[0].priority; assert.equal((await f.api('/api/admin/news/batch', p)).status, 400);
});

test('weekly robot delivery is independent of daily, one per week and respects approval and selected desks', async t => {
  const f = fixture(t); const p = report(); const approved = await f.robot({ categories: '["ai"]' });
  await f.robot({ status: 'pending' }); await f.robot({ categories: '["flash"]' });
  f.db.prepare(`INSERT INTO robot_subscription_deliveries (id,subscriber_id,edition_date,version,payload,created_at,status) VALUES (?,?,?,?,'[]',?,'sent')`).run(crypto.randomUUID(), approved.id, friday, approved.version, Date.now());
  await sendRobotDigest(f.env, friday, { report: p, pause: async () => {} });
  assert.equal(f.calls.length, 2); assert.ok(f.calls.every(call => !/first-headline|other-pqc/.test(call.payload.textMsg.content)));
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM robot_subscription_deliveries WHERE edition_date = ? AND status='sent'").get(`weekly:${friday}`).n, 1);
  p.items[0].title = 'edited after first delivery';
  await sendRobotDigest(f.env, friday, { report: p, pause: async () => {} });
  assert.equal(f.calls.length, 2);
});

test('weekly preserves part progress on provider rejection and stops when approval is revoked', async t => {
  const f = fixture(t); const p = report(); const row = await f.robot(); let request = 0;
  f.respond(() => ++request === 2 ? Response.json({ code: 429 }, { status: 429 }) : Response.json({ ok: true, code: 200 }));
  await sendRobotDigest(f.env, friday, { report: p, pause: async () => {} });
  assert.equal(f.db.prepare('SELECT next_part FROM robot_subscription_deliveries').get().next_part, 1);
  f.db.exec('UPDATE robot_subscription_deliveries SET next_attempt_at=0');
  f.respond(() => Response.json({ ok: true, code: 200 }));
  await sendRobotDigest(f.env, friday, { report: p, pause: async () => { f.db.prepare("UPDATE robot_subscribers SET status='rejected' WHERE id=?").run(row.id); } });
  assert.equal(f.calls.length, 2);
  assert.equal(f.db.prepare('SELECT status FROM robot_subscription_deliveries').get().status, 'cancelled');
});

test('weekly email filters approved desks, keeps headlines separate and uses a distinct daily idempotency key', async t => {
  const f = fixture(t, true); const p = report(); const row = f.email(); f.email({ status: 'pending' }); f.email({ email_verified_at: null }); f.email({ categories: '["flash"]' });
  const payload = await buildDigest(f.env, row, friday, p.items, { report: p });
  assert.match(payload.subject, /量仔每周前沿/); assert.match(payload.text, /头版头条/); assert.match(payload.text, /其余新闻 · AI/);
  assert.doesNotMatch(payload.text, /first-headline|other-pqc/);
  await sendDailyDigest(f.env, friday, { report: p }); await sendDailyDigest(f.env, friday, { report: p });
  assert.equal(f.calls.length, 1); assert.match(f.calls[0].key, /weekly:2026-10-23/);
  assert.equal(f.db.prepare('SELECT edition_date FROM newsletter_deliveries').get().edition_date, `weekly:${friday}`);
});

test('weekly waits until Friday 08:10, supports Saturday completion, and does not replay historical reports', async t => {
  const f = fixture(t); await publishWeeklyReport(f.env, report()); await f.robot({ categories: '["ai"]' });
  for (const now of ['2026-10-22T08:10:00+08:00', '2026-10-23T08:09:59+08:00', '2026-10-25T09:10:00+08:00', '2026-10-30T09:10:00+08:00']) {
    const result = await sendWeeklyReport(f.env, new Date(now), { pause: async () => {} }); assert.equal(result.sent, 0);
  }
  await sendWeeklyReport(f.env, new Date('2026-10-24T09:10:00+08:00'), { pause: async () => {} });
  assert.equal(f.calls.length, 2);
});
