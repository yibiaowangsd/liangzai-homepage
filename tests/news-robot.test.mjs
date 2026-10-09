import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../news-worker/index.js';
import { buildRobotDigest, robotStatus, sendRobotDigest } from '../news-worker/robot.js';
import { digest } from '../news-worker/subscriptions.js';
import { decryptWebhook, normalizeWebhook } from '../news-worker/robot-config.js';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const testUrl = 'https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=test-only-key';
function fixture(t) {
  const originalTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => originalTimeout(callback, delay === 3100 ? 0 : delay, ...args));
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_subscriptions.sql', '0002_robot_digest.sql', '0003_robot_subscriptions.sql']) db.exec(readFileSync(new URL(`../news-worker/migrations/${file}`, import.meta.url), 'utf8'));
  db.exec('CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT, source_name TEXT, source_url TEXT, published_at TEXT, status TEXT)');
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'); let id = 0;
  for (const category of ['pqc', 'protocol', 'standards', 'security', 'ai']) for (let i = 0; i < 5; i++) insert.run(++id, `${date}-${category}-${i}`, `${category} story ${i}`, '中文摘要', category, '一手来源', `https://example.com/${category}/${i}`, `${date}T08:00:00Z`, 'published');
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
    assert.equal(new URL(url).hostname, 'imtwo.zdxlz.com'); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
    const payload = JSON.parse(options.body); requests.push({ url, payload }); return respond(payload, requests.length);
  });
  const api = (path, body, admin = false, extra = {}) => worker.fetch(new Request('https://api.wangyibiao.com/api' + path, {
    method: body === undefined ? 'GET' : 'POST', headers: { Origin: 'https://wangyibiao.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...(admin ? { Authorization: `Bearer ${env.ADMIN_TOKEN}` } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), env);
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
  assert.match(first.content, /1\/2 · 后量子密码/); assert.match(second.content, /2\/2 · AI 前沿/);
  assert.equal([...first.content.matchAll(/阅读原文：https:\/\/example.com/g)].length, 5);
  assert.doesNotMatch(first.content + second.content, /protocol story|wangyibiao.com\/news/);
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

test('news text cannot inject mentions or unsafe original links', () => {
  const messages = buildRobotDigest(date, [{ category: 'ai', title: '@all\nnew section', summary: 'Hello\u0000 world', source_url: 'javascript:alert(1)' }], ['ai']);
  assert.equal(messages.length, 1); assert.equal(messages[0].textMsg.isMentioned, false);
  assert.match(messages[0].textMsg.content, /＠all new section/); assert.doesNotMatch(messages[0].textMsg.content, /javascript:|\u0000/);
});

test('same-group legacy delivery history prevents an approved application replaying today', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  f.db.prepare("INSERT INTO robot_deliveries (edition_date, destination_hash, payload, status, next_part, created_at, sent_at) VALUES (?, ?, '[]', 'sent', 5, ?, datetime('now'))").run(date, await digest(testUrl), Date.now());
  assert.equal((await f.send()).sent, 0); assert.equal(f.record().status, 'sent'); assert.equal(f.record().error, 'legacy_delivery');
  assert.equal(f.requests.length, 0);
});

test('manual API sends immediately in bounded steps using saved @ configuration and no repeat', async t => {
  const f = fixture(t); await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  const first = await (await f.api(path, { mention_mode: 'none', mention_mobiles: ['13900000000'] }, true)).json();
  assert.equal(first.sent, 1); assert.equal(first.more, true); assert.equal(first.next_part, 1);
  assert.equal(f.record().status, 'pending'); assert.equal(f.record().attempts, 0);
  assert.deepEqual(f.requests[0].payload.textMsg.mentionedMobileList, ['13800000000']);
  const second = await (await f.api(path, {}, true)).json(); assert.equal(second.more, false); assert.equal(second.status, 'sent');
  const repeat = await (await f.api(path, {}, true)).json(); assert.equal(repeat.sent, 0); assert.match(repeat.message, /未重复/);
  assert.equal(f.requests.length, 2);
});

test('manual sends require review credentials and approval, target only one group', async t => {
  const f = fixture(t); await f.apply(); const first = f.row();
  const path = `/admin/robot-subscriptions/${first.id}/send`;
  assert.equal((await f.api(path, {})).status, 401);
  assert.equal((await f.api(path, {}, true)).status, 409);
  await f.approve(first);
  await f.apply({ webhook: testUrl.replace('test-only-key', 'another-group-key'), name: '另一群', categories: ['ai'] });
  const other = f.db.prepare("SELECT * FROM robot_subscribers WHERE applicant_name = '另一群'").get(); await f.approve(other);
  await f.api(path, {}, true); assert.equal(f.requests.length, 1); assert.equal(f.requests[0].url, testUrl);
  assert.equal(f.record(other), undefined); assert.equal(f.record(first).next_part, 1);
});

test('manual send and cron share a lease, and cron continues a partially sent manual digest', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  await Promise.all([f.api(path, {}, true), f.send()]);
  await f.send(); assert.equal(f.requests.length, 2); assert.equal(f.record().status, 'sent');
});

test('manual sends report incomplete, uncertain and revoked states without bypassing them', async t => {
  const f = fixture(t); await f.apply(); await f.approve(); const path = `/admin/robot-subscriptions/${f.row().id}/send`;
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'protocol'").run();
  let result = await (await f.api(path, {}, true)).json(); assert.equal(result.status, 'waiting'); assert.equal(result.more, false); assert.equal(f.requests.length, 0);
  f.db.prepare("UPDATE news SET status = 'published'").run();
  f.respond(() => { throw new Error('network lost'); });
  result = await (await f.api(path, {}, true)).json(); assert.equal(result.status, 'uncertain'); assert.equal(result.more, false);
  await f.api(path, {}, true); assert.equal(f.requests.length, 1);
  await f.api(`/admin/robot-subscriptions/${f.row().id}/reject`, { note: '停止发送' }, true);
  assert.equal((await f.api(path, {}, true)).status, 409); assert.equal(f.requests.length, 1);
});

async function uncertainLegacy(f, status = 'uncertain', leaseUntil = 0) {
  f.db.prepare("INSERT INTO robot_deliveries (edition_date, destination_hash, payload, status, error, next_part, created_at, lease_until) VALUES (?, ?, '[]', ?, 'delivery_unconfirmed', 0, ?, ?)")
    .run(date, await digest(testUrl), status, Date.now(), leaseUntil);
  await f.apply(); await f.approve(undefined, { mention_mode: 'members', mention_mobiles: ['13800000000'] });
  return `/admin/robot-subscriptions/${f.row().id}`;
}

test('legacy uncertainty is actionable, never reported as successful and requires a current explicit confirmation', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f);
  const blocked = await (await f.api(`${path}/send`, {}, true)).json();
  assert.equal(blocked.ok, false); assert.equal(blocked.requires_confirmation, true); assert.equal(blocked.status, 'uncertain');
  assert.match(blocked.message, /旧版.*核对后重试/); assert.equal(f.requests.length, 0);
  const list = await (await f.api('/admin/robot-subscriptions?status=approved', undefined, true)).json();
  assert.equal(list.data[0].recovery_token, blocked.recovery_token); assert.match(list.data[0].delivery_message, /旧版/);
  for (const body of [{}, { confirm_not_received: false, recovery_token: blocked.recovery_token }, { confirm_not_received: true, recovery_token: 'stale-confirmation' }]) {
    assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  }
  const confirmation = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  assert.equal((await f.api(`${path}/retry`, confirmation)).status, 401);
  const first = await (await f.api(`${path}/retry`, confirmation, true)).json();
  assert.equal(first.more, true); assert.equal(first.next_part, 1); assert.equal(first.total, 2);
  assert.deepEqual(f.requests[0].payload.textMsg.mentionedMobileList, ['13800000000']);
  assert.equal(f.db.prepare('SELECT status FROM robot_deliveries').get().status, 'uncertain', 'Preserve legacy history');
  const final = await (await f.api(`${path}/send`, {}, true)).json(); assert.equal(final.status, 'sent');
  assert.equal(f.requests.length, 2);
  assert.equal((await f.api(`${path}/retry`, confirmation, true)).status, 409);
  await f.api(`${path}/send`, {}, true); assert.equal(f.requests.length, 2, 'Confirmed retry never enables a completed replay');
});

test('confirmed retry resumes only the unconfirmed part; concurrent confirmations and cron do not duplicate', async t => {
  const f = fixture(t); await f.apply(); await f.approve();
  f.respond((_, count) => count === 1 ? Response.json({ ok: true, code: 200 }) : Promise.reject(new Error('private webhook')));
  await f.send(); assert.equal(f.record().next_part, 1); assert.equal(f.record().status, 'uncertain');
  const path = `/admin/robot-subscriptions/${f.row().id}`;
  const blocked = await (await f.api(`${path}/send`, {}, true)).json(); assert.equal(f.requests.length, 2);
  const original = JSON.parse(f.record().payload)[1];
  f.db.prepare('UPDATE news SET title = ?').run('edited after attempt');
  f.respond(() => Response.json({ ok: true, code: 200 }));
  const body = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  const results = await Promise.all([f.api(`${path}/retry`, body, true), f.api(`${path}/retry`, body, true), f.send()]);
  assert.deepEqual(results.slice(0, 2).map(r => r.status).sort(), [200, 409]);
  assert.equal(f.requests.length, 3); assert.deepEqual(f.requests[2].payload, original);
  assert.equal(f.record().next_part, 2); assert.equal(f.record().status, 'sent');
});

test('a failed confirmed retry rotates confirmation and cannot be replayed using an old confirmation', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f);
  const blocked = await (await f.api(`${path}/send`, {}, true)).json();
  f.respond(() => { throw new Error('unconfirmed'); });
  const firstBody = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  const failed = await (await f.api(`${path}/retry`, firstBody, true)).json();
  assert.equal(failed.requires_confirmation, true); assert.notEqual(failed.recovery_token, blocked.recovery_token);
  assert.equal((await f.api(`${path}/retry`, firstBody, true)).status, 409); assert.equal(f.requests.length, 1);
  await f.send(); assert.equal(f.requests.length, 1);
});

test('legacy retry waits for a complete edition and refuses an active old sender', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f, 'sending', Date.now() + 300000);
  const blocked = await (await f.api(`${path}/send`, {}, true)).json();
  const body = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  f.db.prepare("UPDATE robot_deliveries SET status = 'uncertain', lease_until = 0").run();
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'ai'").run();
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  assert.equal(f.record().status, 'uncertain'); assert.equal(f.requests.length, 0);
});

test('retry never bypasses a revoked approval or changed administrator configuration', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f);
  const blocked = await (await f.api(`${path}/send`, {}, true)).json();
  const body = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  await f.api(`${path}/mentions`, { mention_mode: 'none' }, true);
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  await f.api(`${path}/reject`, { note: '停止发送' }, true);
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409); assert.equal(f.requests.length, 0);
});

test('legacy recovery does not discard messages confirmed by the old sender after migration', async t => {
  const f = fixture(t); const path = await uncertainLegacy(f);
  const blocked = await (await f.api(`${path}/send`, {}, true)).json();
  const body = { confirm_not_received: true, recovery_token: blocked.recovery_token };
  f.db.prepare('UPDATE robot_deliveries SET next_part = 1').run();
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  f.db.prepare("UPDATE robot_deliveries SET next_part = 0, status = 'sent'").run();
  assert.equal((await f.api(`${path}/retry`, body, true)).status, 409);
  assert.equal(f.requests.length, 0); assert.equal(f.record().status, 'uncertain');
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
