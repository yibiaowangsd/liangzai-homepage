import { seedManifest } from './fixtures/news-manifest.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../news-worker/index.js';
import { buildRobotDigest, robotStatus, sendRobotDigest, sendManualRobotDigest } from '../news-worker/robot.js';
import { digest } from '../news-worker/subscriptions.js';
import { decryptWebhook, normalizeWebhook } from '../news-worker/robot-config.js';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const testUrl = 'https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=test-only-key';
function fixture(t) {
  const originalTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => originalTimeout(callback, delay === 3100 ? 0 : delay, ...args));
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_subscriptions.sql', '0002_robot_digest.sql', '0003_robot_subscriptions.sql', '0004_robot_manual_deliveries.sql', '0005_news_editions.sql']) db.exec(readFileSync(new URL(`../news-worker/migrations/${file}`, import.meta.url), 'utf8'));
  db.exec('CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT, source_name TEXT, source_url TEXT, published_at TEXT, status TEXT)');
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'); let id = 0;
  for (const category of ['pqc', 'protocol', 'standards', 'security', 'ai']) for (let i = 0; i < 5; i++) insert.run(++id, `${date.replaceAll("-", "")}-${category}-${i}`, `${category} story ${i}`, '中文摘要', category, '一手来源', `https://example.com/${category}/${i}`, `${date}T08:00:00Z`, 'published');
  seedManifest(db, date);
  const DB = { prepare(sql) {
    const statement = db.prepare(sql); let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } };
  }, async batch(statements) {
    db.exec('BEGIN'); try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const env = { DB, ADMIN_TOKEN: 'test-admin', NEWS_BOT_WEBHOOK_URL: testUrl };
  const requests = []; let respond = () => Response.json({ ok: true, code: 200 });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).hostname, 'imtwo.zdxlz.com'); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'manual'); assert.ok(options.signal instanceof AbortSignal);
    const payload = JSON.parse(options.body); requests.push({ url, payload }); return respond(payload, requests.length);
  });
  const api = (path, body, admin = false, extra = {}) => {
    // A fresh id models another deliberate click. Continuations and retries
    // supply the existing id explicitly.
    if (body !== undefined && /robot(?:-subscriptions\/[^/]+)?\/send$/.test(path)) body = { send_id: crypto.randomUUID(), ...body };
    return worker.fetch(new Request('https://api.wangyibiao.com/api' + path, {
      method: body === undefined ? 'GET' : 'POST', headers: { Origin: 'https://wangyibiao.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...(admin ? { Authorization: `Bearer ${env.ADMIN_TOKEN}` } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
  };
  const row = () => db.prepare('SELECT * FROM robot_subscribers ORDER BY created_at, id LIMIT 1').get();
  const apply = async (overrides = {}, extra = {}) => { const response = await api('/robot-subscriptions', { webhook: testUrl, name: '研究群', categories: ['pqc', 'ai'], reason: '研究和学习', consent: true, ...overrides }, false, extra); assert.equal(response.status, 202, await response.text()); return row(); };
  const approve = async (subscriber = row(), config = {}) => { const response = await api(`/admin/robot-subscriptions/${subscriber.id}/approve`, config, true); assert.equal(response.status, 200, await response.text()); };
  const record = (subscriber = row()) => db.prepare('SELECT * FROM robot_subscription_deliveries WHERE subscriber_id = ? AND edition_date = ?').get(subscriber.id, date);
  const send = (options = {}) => sendRobotDigest(env, date, { pause: async () => {}, ...options });
  t.after(() => db.close());
  return { db, env, requests, api, apply, approve, row, record, send, respond(callback) { respond = callback; } };
}

test('pending applications cannot push or configure @; legacy deployment webhook does not grant approval', async t => {
  const f = fixture(t);
  assert.equal((await f.send()).sent, 0);
  await f.apply({ status: 'approved', mention_mode: 'members', mention_mobiles: ['13800000000'] });
  assert.equal(f.row().status, 'pending'); assert.equal(f.row().mention_mode, 'none');
  assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 0);
  assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/approve`, {})).status, 401);
  assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/mentions`, { mention_mode: 'members', mention_mobiles: ['13800000000'] })).status, 401);
});

test('approved robot sends selected sections with administrator mentions only on first message, once per day', async t => {
  const f = fixture(t); await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000','13900000000','13800000000'] });
  assert.equal((await f.send()).sent, 2); assert.equal(f.record().status, 'sent');
  const [first, second] = f.requests.map(r => r.payload.textMsg);
  assert.equal(first.isMentioned, true); assert.equal(first.mentionType, 2); assert.deepEqual(first.mentionedMobileList, ['13800000000','13900000000']);
  assert.equal(second.isMentioned, false); assert.equal(second.mentionedMobileList, undefined);
  assert.match(first.content, /1\/2 · 后量子算法/); assert.match(second.content, /2\/2 · AI 前沿/);
  assert.equal(first.content.split('\n').filter(line => /^\d\. pqc story \d https:\/\/example.com\/pqc\/\d$/.test(line)).length, 5);
  assert.doesNotMatch(first.content + second.content, /中文摘要|一手来源|来源：|阅读原文：|protocol story|wangyibiao.com\/news/);
  assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 2);
});

test('webhooks encrypted at rest and private fields absent from public/admin metadata', async t => {
  const f = fixture(t); await f.apply(); const subscriber = f.row();
  assert.doesNotMatch(JSON.stringify(subscriber), /test-only-key/);
  assert.equal(await decryptWebhook(f.env, subscriber), testUrl);
  await assert.rejects(() => decryptWebhook(f.env, { ...subscriber, id: crypto.randomUUID() }));
  for (const [path, admin] of [['/robot-subscriptions', false], ['/admin/robot-subscriptions', true], ['/admin/robot/status', true]]) {
    const response = await f.api(path, undefined, admin); assert.equal(response.status, 200);
    const result = await response.text(); assert.doesNotMatch(result, /test-only-key|webhook_ciphertext|webhook_hash/);
  }
  const list = await (await f.api('/admin/robot-subscriptions', undefined, true)).json();
  assert.equal(list.data[0].webhook_display, 'imtwo.zdxlz.com · key …-key');
  assert.equal((await robotStatus(f.env)).subscriptions.pending, 1);
});

test('public duplicate cannot overwrite approved topics or admin member configuration', async t => {
  const f = fixture(t); await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  const before = f.row(); await f.apply({ categories: ['security'], name: '陌生申请', mention_mode: 'none' });
  assert.deepEqual(f.row(), before);
});

test('administrator overrides application sections and both automatic and manual sends use the saved choice', async t => {
  const f = fixture(t); await f.apply();
  await f.approve(undefined, { categories: ['security', 'protocol'], expected_categories: ['pqc', 'ai'], mention_mode: 'members', mention_mobiles: ['13800000000'] });
  assert.equal(f.row().categories, '["protocol","security"]');
  assert.equal((await f.send()).sent, 2);
  assert.match(f.requests[0].payload.textMsg.content, /protocol story/);
  assert.match(f.requests[1].payload.textMsg.content, /security story/);
  const version = f.row().version;
  assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/settings`, { categories: ['ai'] }, true)).status, 200);
  assert.notEqual(f.row().version, version); assert.equal(f.row().mention_mobiles, '["13800000000"]');
  const manual = await f.api(`/admin/robot-subscriptions/${f.row().id}/send`, { part: 0 }, true);
  assert.equal(manual.status, 200); assert.equal((await manual.json()).more, false);
  assert.match(f.requests.at(-1).payload.textMsg.content, /ai story/);
  assert.doesNotMatch(f.requests.at(-1).payload.textMsg.content, /pqc story|protocol story|security story/);
  assert.deepEqual(f.requests.at(-1).payload.textMsg.mentionedMobileList, ['13800000000']);
});

test('section configuration stops remaining automatic messages and the next edition uses new sections', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); let parts = 0;
  await f.send({ pause: async () => {
    if (++parts === 2) assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/settings`, { categories: ['security'] }, true)).status, 200);
  } });
  assert.equal(f.requests.length, 1); assert.equal(f.record().status, 'cancelled');
  assert.equal((await f.send()).sent, 0);
  const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  f.db.prepare('UPDATE news SET published_at = ?').run(tomorrow + 'T08:00:00Z');
  f.db.prepare('UPDATE news SET slug = ? || substr(slug, 9)').run(tomorrow.replaceAll('-', '')); seedManifest(f.db, tomorrow);
  assert.equal((await sendRobotDigest(f.env, tomorrow, { pause: async () => {} })).sent, 1);
  assert.match(f.requests.at(-1).payload.textMsg.content, /security story/);
});

test('section configuration cancels a manual batch and only a new click can send the updated boards', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}`;
  const sendId = crypto.randomUUID();
  const first = await (await f.api(`${path}/send`, { part: 0, send_id: sendId }, true)).json();
  assert.equal(first.more, true);
  assert.equal((await f.api(`${path}/settings`, { categories: ['security', 'migration', 'ngcc'] }, true)).status, 200);
  assert.equal(f.row().categories, '["migration","security","ngcc"]');
  assert.equal(f.db.prepare('SELECT status FROM robot_manual_deliveries WHERE send_id = ?').get(sendId).status, 'cancelled');
  assert.equal((await f.api(`${path}/send`, { part: 1, send_id: sendId, version: first.version, date: first.date }, true)).status, 409);
  assert.equal(f.requests.length, 1);
  await f.api(`${path}/settings`, { categories: ['security'] }, true);
  const next = await (await f.api(`${path}/send`, { part: 0 }, true)).json();
  assert.equal(next.ok, true); assert.equal(next.more, false);
  assert.match(f.requests.at(-1).payload.textMsg.content, /security story/);
});

test('robot configuration rejects invalid, stale and unauthorized edits; unchanged choices keep the active batch', async t => {
  const f = fixture(t); await f.apply(); const path = `/admin/robot-subscriptions/${f.row().id}`;
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] }, true)).status, 409);
  for (const categories of [[], ['unknown'], ['constructor'], ['__proto__'], null]) {
    assert.equal((await f.api(`${path}/approve`, { categories }, true)).status, 400);
  }
  await f.approve();
  await f.api(`${path}/send`, { part: 0 }, true);
  const before = f.row(); const batch = f.db.prepare('SELECT * FROM robot_manual_deliveries').get();
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] })).status, 401);
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] }, true, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'], expected_categories: ['security'] }, true)).status, 409);
  for (const categories of [undefined, [], ['unknown'], ['constructor'], ['__proto__'], null]) {
    assert.equal((await f.api(`${path}/settings`, { categories }, true)).status, 400);
  }
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai', 'pqc'] }, true)).status, 200);
  assert.deepEqual(f.row(), before); assert.deepEqual(f.db.prepare('SELECT * FROM robot_manual_deliveries').get(), batch);
});

test('multiple groups have separate approval, chosen boards and daily delivery records', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  await f.apply({ webhook: testUrl.replace('test-only-key', 'second-test-key'), name: '第二群', categories: ['security'] });
  assert.equal((await f.send()).sent, 2); assert.equal(f.requests.length, 2);
  const second = f.db.prepare("SELECT * FROM robot_subscribers WHERE applicant_name = '第二群'").get(); await f.approve(second);
  assert.equal((await f.send()).sent, 1); assert.equal(f.requests.at(-1).url.includes('second-test-key'), true);
  assert.match(f.requests.at(-1).payload.textMsg.content, /网络安全/);
});

test('concurrent cron claims never send the same part twice', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  await Promise.all([f.send(), f.send()]); assert.equal(f.requests.length, 2); assert.equal(f.record().status, 'sent');
});

test('revoke between parts stops remaining outbound messages; a new application returns to review', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); let count = 0;
  await f.send({ pause: async () => { if (++count === 2) assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/reject`, { note: '停止群推送' }, true)).status, 200); } });
  assert.equal(f.requests.length, 1); assert.equal(f.record().status, 'cancelled');
  await f.apply({ categories: ['ai'] }); assert.equal(f.row().status, 'pending'); assert.equal(f.row().mention_mode, 'none');
  assert.equal((await f.send()).sent, 0); await f.approve(); assert.equal((await f.send()).sent, 0, 'Reapproval cannot resend a partially delivered edition');
});

test('member configuration change stops queued old mentions and uses new settings next day', async t => {
  const f = fixture(t); await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  let count = 0; await f.send({ pause: async () => { if (++count === 1) assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/mentions`, { mention_mode: 'members', mention_mobiles: ['13900000000'] }, true)).status, 200); } });
  assert.equal(f.requests.length, 0); assert.equal(f.record().status, 'cancelled');
  assert.equal(f.row().mention_mobiles, '["13900000000"]'); assert.equal((await f.send()).sent, 0);
  const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0,10);
  f.db.prepare('UPDATE news SET published_at = ?').run(tomorrow + 'T08:00:00Z');
  f.db.prepare("UPDATE news SET slug = ? || substr(slug, 9)").run(tomorrow.replaceAll('-', '')); seedManifest(f.db, tomorrow);
  await sendRobotDigest(f.env, tomorrow, { pause: async () => {} }); assert.deepEqual(f.requests[0].payload.textMsg.mentionedMobileList, ['13900000000']);
});

test('provider rejection retries only unsent parts with frozen content; uncertain acceptance pauses', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  f.respond((_, count) => Response.json(count === 2 ? { ok: false, code: 7101, message: 'secret echoed test-only-key' } : { ok: true, code: 200 }));
  assert.equal((await f.send()).sent, 1); assert.equal(f.record().next_part, 1); assert.equal(f.record().status, 'pending');
  f.db.prepare('UPDATE robot_subscription_deliveries SET next_attempt_at = 0').run();
  f.db.prepare('UPDATE news SET title = ?').run('later edit'); f.respond(() => Response.json({ ok: true, code: 200 }));
  assert.equal((await f.send()).sent, 1); assert.equal(f.record().status, 'sent'); assert.doesNotMatch(f.requests.at(-1).payload.textMsg.content, /later edit/);
});

for (const [name, respond] of [
  ['timeout', () => { throw new Error('private webhook'); }],
  ['ambiguous HTTP 200', () => Response.json({ code: 200 })],
  ['server 500', () => new Response('error', { status: 500 })],
  ['oversized acknowledgement', () => new Response('x'.repeat(16385))],
]) test(`${name} becomes uncertain and never auto-retries`, async t => {
  const f = fixture(t); await f.apply(); await f.approve(); f.respond(respond);
  await f.send(); assert.equal(f.record().status, 'uncertain'); assert.doesNotMatch(f.record().error, /private|test-only/);
  await f.send(); assert.equal(f.requests.length, 1);
});

test('expired in-flight lease is not replayed; retryable failures stop after five attempts', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); f.respond(() => new Response('', { status: 429 }));
  for (let i = 0; i < 5; i++) { await f.send(); f.db.prepare('UPDATE robot_subscription_deliveries SET next_attempt_at = 0').run(); }
  assert.equal(f.record().status, 'failed'); await f.send(); assert.equal(f.requests.length, 5);
  f.db.prepare("UPDATE robot_subscription_deliveries SET status = 'sending', lease_until = 1").run();
  await f.send(); assert.equal(f.record().status, 'uncertain'); assert.equal(f.requests.length, 5);
});

test('incomplete editions wait and invalid calendar dates never send', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); f.db.prepare("DELETE FROM news WHERE category = 'protocol'").run();
  assert.equal((await f.send()).sent, 0); assert.equal(f.record(), undefined);
  for (const day of ['bad', '2026-02-30']) await assert.rejects(() => sendRobotDigest(f.env, day), /Invalid edition date/);
  assert.equal(f.requests.length, 0);
});

test('validation prevents SSRF, untrusted origins, oversized inputs and invalid administrator mentions', async t => {
  const f = fixture(t);
  for (const webhook of ['http://imtwo.zdxlz.com/im-external/v1/webhook/send?key=abcd', 'https://localhost/private?key=abcd', testUrl + '&key=another', testUrl + '&x=y', testUrl + '#fragment', testUrl.replace('imtwo.zdxlz.com', 'imtwo.zdxlz.com.evil.test')]) {
    assert.throws(() => normalizeWebhook(webhook)); assert.equal((await f.api('/robot-subscriptions', { webhook, name: '群', categories: ['ai'], reason: '学习', consent: true })).status, 400);
  }
  assert.equal((await f.api('/robot-subscriptions', {}, false, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await f.api('/robot-subscriptions', { reason: 'x'.repeat(9000) })).status, 413);
  await f.apply();
  for (const body of [{ mention_mode: 'all' }, { mention_mode: 'members', mention_mobiles: [] }, { mention_mode: 'members', mention_mobiles: ['@all'] }]) assert.equal((await f.api(`/admin/robot-subscriptions/${f.row().id}/approve`, body, true)).status, 400);
  assert.equal(f.row().status, 'pending'); assert.equal(f.requests.length, 0);
});

test('rate limits use opaque keys; admin channel honors separate review credential', async t => {
  const f = fixture(t); for (let i = 0; i < 5; i++) await f.apply();
  assert.equal((await f.api('/robot-subscriptions', { webhook: testUrl, name: '群', categories: ['ai'], reason: '学习', consent: true })).status, 429);
  assert.doesNotMatch(JSON.stringify(f.db.prepare('SELECT * FROM newsletter_request_limits').all()), /192\.0\.2\.1/);
  f.env.NEWSLETTER_ADMIN_TOKEN = 'review-only';
  assert.equal((await f.api('/admin/robot-subscriptions', undefined, true)).status, 401);
  assert.equal((await f.api('/admin/robot-subscriptions', undefined, false, { Authorization: 'Bearer review-only' })).status, 200);
});

test('compact digest keeps each short title beside its complete original link', () => {
  const [message] = buildRobotDigest(date, [
    { category: 'ai', title: '简短标题', summary: '不发送这段摘要', source_name: '不发送这个来源', source_url: 'https://example.com/original?a=1&b=2' },
    { category: 'ai', title: '量🚀'.repeat(40), source_url: 'https://example.com/long-title' },
  ], ['ai']);
  assert.deepEqual(message.textMsg.content.split('\n'), [
    `量仔每日前沿 · ${date}`, '1/1 · AI 前沿',
    '1. 简短标题 https://example.com/original?a=1&b=2',
    `2. ${'量🚀'.repeat(29)}量… https://example.com/long-title`,
  ]);
});

test('news text cannot inject mentions or unsafe original links', () => {
  const messages = buildRobotDigest(date, [{ category: 'ai', title: '@all\nnew section', summary: 'Hello\u0000 world', source_url: 'javascript:alert(1)' }], ['ai']);
  assert.equal(messages.length, 1); assert.equal(messages[0].textMsg.isMentioned, false);
  assert.match(messages[0].textMsg.content, /＠all new section/); assert.doesNotMatch(messages[0].textMsg.content, /javascript:|\u0000/);
  assert.equal(messages[0].textMsg.content.split('\n').at(-1), '1. ＠all new section');
});

test('same-group legacy delivery history prevents an approved application replaying today', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  f.db.prepare("INSERT INTO robot_deliveries (edition_date, destination_hash, payload, status, next_part, created_at, sent_at) VALUES (?, ?, '[]', 'sent', 5, ?, datetime('now'))").run(date, await digest(testUrl), Date.now());
  assert.equal((await f.send()).sent, 0); assert.equal(f.record().status, 'sent'); assert.equal(f.record().error, 'legacy_delivery');
  assert.equal(f.requests.length, 0);
});

async function uncertainLegacy(f, status = 'uncertain', leaseUntil = 0) {
  f.db.prepare("INSERT INTO robot_deliveries (edition_date, destination_hash, payload, status, error, next_part, created_at, lease_until) VALUES (?, ?, '[]', ?, 'delivery_unconfirmed', 0, ?, ?)")
    .run(date, await digest(testUrl), status, Date.now(), leaseUntil);
  await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  return `/admin/robot-subscriptions/${f.row().id}`;
}

test('manual API sends all selected boards in bounded steps, uses saved @ and permits another complete send', async t => {
  const f = fixture(t); await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  for (let click = 0; click < 2; click++) {
    const first = await (await f.api(path, { part: 0, mention_mode: 'none', mention_mobiles: ['13900000000'] }, true)).json();
    assert.equal(first.sent, 1); assert.equal(first.more, true); assert.equal(first.next_part, 1);
    const second = await (await f.api(path, { send_id: first.send_id, part: first.next_part, version: first.version, date: first.date }, true)).json();
    assert.equal(second.ok, true); assert.equal(second.more, false); assert.equal(second.total, 2);
    assert.match(second.message, /再次点击可重新发送/);
  }
  assert.equal(f.requests.length, 4); assert.equal(f.record(), undefined);
  for (const index of [0, 2]) assert.deepEqual(f.requests[index].payload.textMsg.mentionedMobileList, ['13800000000']);
  for (const index of [1, 3]) assert.equal(f.requests[index].payload.textMsg.isMentioned, false);
});

test('manual sends require review credentials and approval, target only one group', async t => {
  const f = fixture(t); await f.apply(); const first = f.row();
  const path = `/admin/robot-subscriptions/${first.id}/send`;
  assert.equal((await f.api(path, { part: 0 })).status, 401);
  assert.equal((await f.api(path, { part: 0 }, true)).status, 409);
  await f.approve(first);
  await f.apply({ webhook: testUrl.replace('test-only-key', 'another-group-key'), name: '另一群', categories: ['ai'] });
  const other = f.db.prepare("SELECT * FROM robot_subscribers WHERE applicant_name = '另一群'").get(); await f.approve(other);
  await f.api(path, { part: 0 }, true); assert.equal(f.requests.length, 1); assert.equal(f.requests[0].url, testUrl);
  assert.equal(f.record(other), undefined); assert.equal(f.record(first), undefined);
});

for (const status of ['sent', 'uncertain', 'failed', 'cancelled', 'sending']) test(`manual send bypasses ${status} daily history without changing cron history`, async t => {
  const f = fixture(t); await f.apply(); await f.approve(); await f.send();
  f.db.prepare('UPDATE robot_subscription_deliveries SET status = ?').run(status); const before = f.record();
  const result = await (await f.api(`/admin/robot-subscriptions/${f.row().id}/send`, { part: 0 }, true)).json();
  assert.equal(result.ok, true); assert.equal(result.sent, 1); assert.deepEqual(f.record(), before);
});

test('manual send bypasses old uncertain history, while cron keeps its daily deduplication', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f); await f.send(); const before = f.record();
  const result = await (await f.api(`${path}/send`, { part: 0 }, true)).json();
  assert.equal(result.ok, true); assert.deepEqual(f.record(), before);
  assert.equal(f.db.prepare('SELECT status FROM robot_deliveries').get().status, 'uncertain');
  await f.send(); assert.equal(f.requests.length, 1);
  const list = await (await f.api('/admin/robot-subscriptions?status=approved', undefined, true)).json();
  assert.equal(list.data[0].recovery_token, undefined); assert.match(list.data[0].delivery_message, /今日自动推送已暂停/);
});

test('manual sending requires complete selected boards; unrelated unpublished boards do not block it', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'protocol'").run();
  assert.equal((await (await f.api(path, { part: 0 }, true)).json()).ok, true);
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'ai'").run();
  assert.equal((await f.api(path, { part: 0 }, true)).status, 409); assert.equal(f.requests.length, 1);
});

test('manual steps reject invalid or stale coordinates and the retired retry API', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}`;
  for (const part of [undefined, -1, 5, 2, '0', 0.5]) assert.equal((await f.api(`${path}/send`, { part }, true)).status, 400);
  assert.equal((await f.api(`${path}/send`, { part: 1, version: 'stale' }, true)).status, 409);
  assert.equal((await f.api(`${path}/send`, { part: 0, date: '2020-01-01' }, true)).status, 409);
  assert.equal((await f.api(`${path}/retry`, {}, true)).status, 410); assert.equal(f.requests.length, 0);
});

test('manual steps stop after changes or revocation, and a new click uses current administrator configuration', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}`;
  const first = await (await f.api(`${path}/send`, { part: 0 }, true)).json();
  await f.api(`${path}/mentions`, { mention_mode: 'members', mention_mobiles: ['13900000000'] }, true);
  assert.equal((await f.api(`${path}/send`, { part: 1, version: first.version, date: first.date }, true)).status, 409);
  assert.equal((await (await f.api(`${path}/send`, { part: 0 }, true)).json()).ok, true);
  assert.deepEqual(f.requests.at(-1).payload.textMsg.mentionedMobileList, ['13900000000']);
  await f.api(`${path}/reject`, { note: '停止发送' }, true);
  assert.equal((await f.api(`${path}/send`, { part: 0 }, true)).status, 409); assert.equal(f.requests.length, 2);
});

test('manual sending rechecks approval after the rate-limit pause and before outbound delivery', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  await assert.rejects(() => sendManualRobotDigest(f.env, f.row().id, { send_id: crypto.randomUUID(), part: 0, pause: async () => {
    await f.api(`/admin/robot-subscriptions/${f.row().id}/reject`, { note: '停止发送' }, true);
  } }), /发送已停止/);
  assert.equal(f.requests.length, 0);
});

for (const [name, respond, code] of [
  ['timeout', () => { throw new Error('secret test-only-key'); }, 'delivery_unconfirmed'],
  ['provider rejection', () => Response.json({ ok: false, code: 7101, message: 'secret test-only-key' }), 'provider_rejected'],
  ['ambiguous acknowledgement', () => Response.json({ code: 200 }), 'delivery_unconfirmed'],
  ['redirect', () => new Response(null, { status: 302, headers: { Location: 'https://other.example/' } }), 'redirect_rejected'],
]) test(`manual ${name} stops the click without automatically retrying; a new click can send again`, async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  f.respond(respond); const failed = await (await f.api(path, { part: 0 }, true)).json();
  assert.equal(failed.ok, false); assert.equal(failed.more, false); assert.equal(failed.error_code, code);
  assert.equal(f.requests.length, 1); assert.doesNotMatch(JSON.stringify(failed), /secret|test-only/);
  f.respond(() => Response.json({ ok: true, code: 200 }));
  assert.equal((await (await f.api(path, { part: 0 }, true)).json()).ok, true); assert.equal(f.requests.length, 2);
});

test('connection test requires an approved target and operational administrator credentials', async t => {
  const f = fixture(t); await f.apply();
  const body = { subscriber_id: f.row().id, test_id: 'CONNECT-TEST-1' };
  assert.equal((await f.api('/admin/robot/test', body)).status, 401);
  assert.equal((await f.api('/admin/robot/test', body, true)).status, 409);
  assert.equal(f.requests.length, 0);
  await f.approve();
  assert.equal((await f.api('/admin/robot/test', { ...body, test_id: 'invalid\n@all' }, true)).status, 400);
  const result = await (await f.api('/admin/robot/test', body, true)).json();
  assert.equal(result.ok, true); assert.equal(result.attempted, 1); assert.equal(result.provider.http_status, 200);
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].payload.textMsg.isMentioned, false);
  assert.match(f.requests[0].payload.textMsg.content, /CONNECT-TEST-1/);
  assert.equal(f.requests[0].payload.textMsg.mentionedMobileList, undefined);
  assert.equal(f.record(), undefined, 'Connection test does not enqueue or record a daily edition');
});

test('connection test bypasses daily history and sends exactly one independent message without automatic retries', async t => {
  const f = fixture(t); await uncertainLegacy(f);
  await f.send(); const before = f.record();
  f.respond(() => { throw new Error('secret echoed test-only-key'); });
  const result = await (await f.api('/admin/robot/test', { subscriber_id: f.row().id, test_id: 'CONNECT-TEST-2' }, true)).json();
  assert.equal(result.ok, false); assert.equal(result.attempted, 1); assert.equal(result.uncertain, true);
  assert.equal(result.provider.failure_kind, 'network'); assert.equal(f.requests.length, 1);
  assert.deepEqual(f.record(), before); assert.doesNotMatch(JSON.stringify(result), /test-only-key|ciphertext|private/);
});

test('connection diagnostics reveal only safe acknowledgement fields and never provider messages or credentials', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  f.respond(() => Response.json({ code: 200, message: 'private webhook test-only-key', data: { secret: testUrl } }));
  const result = await (await f.api('/admin/robot/test', { subscriber_id: f.row().id, test_id: 'CONNECT-TEST-3' }, true)).json();
  assert.equal(result.ok, false); assert.equal(result.uncertain, true); assert.equal(result.provider.code, '200');
  assert.deepEqual(result.provider.acknowledgement_fields, ['code', 'message', 'data']);
  assert.doesNotMatch(JSON.stringify(result), /private|test-only|imtwo\.zdxlz/);
});

test('operational administrator can send one approved group without gaining review or @ configuration access', async t => {
  const f = fixture(t); await f.apply(); const body = { subscriber_id: f.row().id, part: 0 };
  assert.equal((await f.api('/admin/robot/send', body)).status, 401);
  assert.equal((await f.api('/admin/robot/send', body, true)).status, 409);
  await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  f.env.NEWSLETTER_ADMIN_TOKEN = 'review-only';
  assert.equal((await f.api('/admin/robot-subscriptions', undefined, true)).status, 401);
  assert.equal((await f.api('/admin/robot/send', body, false, { Authorization: 'Bearer review-only' })).status, 401);
  assert.equal((await f.api('/admin/robot/send', body, true, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await f.api('/admin/robot/send', {}, true)).status, 202); assert.equal(f.requests.length, 0);
  assert.equal((await f.api('/admin/robot/send', { ...body, subscriber_id: 'bad' }, true)).status, 400);
  const first = await (await f.api('/admin/robot/send', body, true)).json();
  assert.equal(first.ok, true); assert.equal(first.more, true);
  assert.deepEqual(f.requests[0].payload.textMsg.mentionedMobileList, ['13800000000']);
  const last = await (await f.api('/admin/robot/send', { ...body, send_id: first.send_id, part: 1, version: first.version, date: first.date }, true)).json();
  assert.equal(last.ok, true); assert.equal(last.more, false); assert.equal(f.requests.length, 2);
  assert.equal(f.record(), undefined);
});

test('the same manual batch part is acknowledged again without sending again, including concurrent requests', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  const body = { send_id: crypto.randomUUID(), part: 0 };
  const responses = await Promise.all([f.api(path, body, true), f.api(path, body, true)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]); assert.equal(f.requests.length, 1);
  const first = await responses.find(r => r.status === 200).json();
  const repeated = await (await f.api(path, body, true)).json();
  assert.equal(repeated.duplicate, true); assert.equal(repeated.sent, 0); assert.equal(repeated.next_part, 1);
  assert.equal(f.requests.length, 1);
  const second = { send_id: body.send_id, part: 1, version: first.version, date: first.date };
  assert.equal((await (await f.api(path, second, true)).json()).ok, true);
  assert.equal((await (await f.api(path, second, true)).json()).duplicate, true); assert.equal(f.requests.length, 2);
  assert.equal((await (await f.api(path, { part: 0 }, true)).json()).sent, 1, 'A new deliberate click starts a new batch');
  assert.equal(f.requests.length, 3);
});

test('different concurrent click ids cannot create two active manual batches for the same robot', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  const responses = await Promise.all([f.api(path, { part: 0 }, true), f.api(path, { part: 0 }, true)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]); assert.equal(f.requests.length, 1);
});

test('manual delivery excludes concurrent and later cron sends today, while tomorrow still sends automatically', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const sendId = crypto.randomUUID();
  const first = await sendManualRobotDigest(f.env, f.row().id, { send_id: sendId, part: 0, pause: async () => {
    assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 0);
  } });
  assert.equal(f.requests.length, 1);
  assert.equal((await f.send()).sent, 0, 'Cron also skips between manual parts');
  const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  await f.api(path, { send_id: sendId, part: 1, version: first.version, date: first.date }, true);
  assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 2);
  const list = await (await f.api('/admin/robot-subscriptions?status=approved', undefined, true)).json();
  assert.equal(list.data[0].manual_status, 'sent'); assert.match(list.data[0].delivery_message, /自动任务今天不再重复/);
  const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0,10);
  f.db.prepare('UPDATE news SET published_at = ?').run(tomorrow + 'T08:00:00Z');
  f.db.prepare("UPDATE news SET slug = ? || substr(slug, 9)").run(tomorrow.replaceAll('-', '')); seedManifest(f.db, tomorrow);
  assert.equal((await sendRobotDigest(f.env, tomorrow, { pause: async () => {} })).sent, 2);
});

test('manual delivery refuses to overlap an already claimed cron sender', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  let first = true;
  await f.send({ pause: async () => {
    if (first) { first = false; assert.equal((await f.api(path, { part: 0 }, true)).status, 409); }
  } });
  assert.equal(f.requests.length, 2); assert.equal(f.db.prepare('SELECT count(*) AS count FROM robot_manual_deliveries').get().count, 0);
});

test('unknown manual delivery is never resent under the same click id; a new click may explicitly resend', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  const body = { send_id: crypto.randomUUID(), part: 0 }; f.respond(() => { throw new Error('connection lost'); });
  const failed = await (await f.api(path, body, true)).json(); assert.equal(failed.ok, false);
  const duplicate = await (await f.api(path, body, true)).json(); assert.equal(duplicate.ok, false); assert.equal(duplicate.duplicate, true);
  assert.equal(f.requests.length, 1); assert.equal((await f.send()).sent, 0);
  f.respond(() => Response.json({ ok: true, code: 200 }));
  assert.equal((await (await f.api(path, { part: 0 }, true)).json()).ok, true); assert.equal(f.requests.length, 2);
});

test('manual batch freezes content and cannot skip unsent sections', async t => {
  const f = fixture(t); await f.apply({ categories: ['pqc','protocol','ai'] }); await f.approve();
  const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  const first = await (await f.api(path, { part: 0 }, true)).json();
  const step = { send_id: first.send_id, version: first.version, date: first.date };
  assert.equal((await f.api(path, { ...step, part: 2 }, true)).status, 409); assert.equal(f.requests.length, 1);
  f.db.prepare('UPDATE news SET title = ?').run('edited after the first part');
  for (const part of [1, 2]) assert.equal((await (await f.api(path, { ...step, part }, true)).json()).ok, true);
  assert.equal(f.requests.length, 3); assert.doesNotMatch(f.requests.at(-1).payload.textMsg.content, /edited after/);
});

test('manual delivery accepts all seven selected desks and reaches the seventh message', async t => {
  const f = fixture(t);
  const categories = ['pqc', 'migration', 'protocol', 'standards', 'security', 'ai', 'ngcc'];
  await f.apply({ categories }); await f.approve();
  const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  let step = { send_id: crypto.randomUUID(), part: 0 };
  for (let part = 0; part < 7; part++) {
    const response = await f.api(path, step, true); assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.total, 7); assert.equal(result.next_part, part + 1);
    assert.equal(result.more, part < 6);
    step = { send_id: step.send_id, part: result.next_part, version: result.version, date: result.date };
  }
  assert.equal(f.requests.length, 7);
  assert.match(f.requests.at(-1).payload.textMsg.content, /7\/7 · NGCC 公钥征集/);
  assert.doesNotMatch(f.requests.at(-1).payload.textMsg.content, /测试覆盖说明/);
});
