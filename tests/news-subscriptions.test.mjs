import { seedManifest } from './fixtures/news-manifest.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../news-worker/index.js';
import { buildDigest, sendDailyDigest, subscriptionToken } from '../news-worker/subscriptions.js';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
function fixture(t, mail = true) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../news-worker/migrations/0001_subscriptions.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../news-worker/migrations/0003_robot_subscriptions.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../news-worker/migrations/0004_robot_manual_deliveries.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../news-worker/migrations/0005_news_editions.sql', import.meta.url), 'utf8'));
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT, source_name TEXT, source_url TEXT, published_at TEXT, status TEXT)`);
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  let id = 0;
  for (const category of ['pqc', 'protocol', 'standards', 'security', 'ai']) {
    for (let i = 0; i < 5; i++) insert.run(++id, `${date.replaceAll("-", "")}-${category}-${i}`, `${category} story ${i}`, '<script>unsafe</script>摘要', category, 'Official', 'https://example.com/source', `${date}T08:00:00Z`, 'published');
  }
  seedManifest(db, date);
  const DB = { prepare(sql) {
    const statement = db.prepare(sql); let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } };
  }, async batch(statements) {
    db.exec('BEGIN');
    try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const env = { DB, ADMIN_TOKEN: 'test-admin-secret', ...(mail ? { RESEND_API_KEY: 'test-api-key', NEWSLETTER_FROM: '量仔 <daily@example.com>' } : {}) };
  const mails = []; let fail = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const message = JSON.parse(options.body); mails.push({ message, key: options.headers['Idempotency-Key'] });
    return new Response(JSON.stringify(fail ? { error: 'failure' } : { id: `mail-${mails.length}` }), { status: fail ? 429 : 200, headers: { 'Content-Type': 'application/json' } });
  });
  const api = async (path, body, admin = false, extra = {}) => {
    const request = new Request('https://api.wangyibiao.com/api' + path, {
      method: body === undefined ? 'GET' : 'POST', headers: { Origin: 'https://wangyibiao.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...(admin ? { Authorization: `Bearer ${env.ADMIN_TOKEN}` } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return worker.fetch(request, env);
  };
  const apply = async (email = 'reader@example.com', categories = ['pqc', 'ai']) => {
    const response = await api('/subscriptions', { email, categories, reason: '研究和学习', name: '读者', consent: true }); assert.equal(response.status, 202);
    return db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email.toLowerCase());
  };
  const approve = async row => { const response = await api(`/admin/subscriptions/${row.id}/approve`, {}, true); assert.equal(response.status, 200, await response.text()); };
  const confirm = async row => {
    const updated = db.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').get(row.id);
    const response = await api('/subscriptions/confirm', { token: await subscriptionToken(env, updated, 'confirm') }); assert.equal(response.status, 200);
  };
  t.after(() => db.close());
  return { db, env, mails, api, apply, approve, confirm, setFail(value) { fail = value; } };
}

test('approval and mailbox confirmation are both required; selected sections only and one delivery per day', async t => {
  const f = fixture(t); const row = await f.apply('Reader@EXAMPLE.com');
  assert.equal(row.status, 'pending'); assert.equal(f.mails.length, 0);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  await f.approve(row);
  assert.equal(f.mails.length, 1); assert.match(f.mails[0].message.subject, /确认邮箱/);
  const href = f.mails[0].message.text.match(/https:\/\/wangyibiao.com\/news\/subscribe\?[^\s]+/)[0];
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  assert.equal((await f.api('/subscriptions/confirm', { token: new URL(href).searchParams.get('token') })).status, 200);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 1);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  assert.equal(f.mails.length, 2);
  const digest = f.mails[1].message;
  assert.match(digest.text, /pqc story/); assert.match(digest.text, /ai story/); assert.doesNotMatch(digest.text, /protocol story/);
  assert.doesNotMatch(digest.html, /<script>/); assert.match(digest.html, /&lt;script&gt;/);
  assert.match(digest.html, /href="https:\/\/example.com\/source"/);
  assert.match(digest.text, /阅读原文：https:\/\/example.com\/source/);
  assert.doesNotMatch(digest.html + digest.text, /https:\/\/wangyibiao.com\/news\/\d{4}-/);
  assert.match(digest.headers['List-Unsubscribe'], /api\/subscriptions\/unsubscribe\?token=/);
  assert.equal(digest.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.equal(f.db.prepare('SELECT count(*) n FROM newsletter_deliveries WHERE status = ?').get('sent').n, 1);
});

test('digest titles and reading links go straight to original sources; missing or unsafe URLs never fall back to site articles', async t => {
  const f = fixture(t);
  const row = await f.apply('reader@example.com', ['pqc']);
  for (const [index, url] of [[0, 'https://example.com/original?part=1&lang=zh'], [1, null], [2, 'javascript:alert(1)'], [3, '/news/fallback']]) {
    f.db.prepare('UPDATE news SET source_url = ? WHERE slug = ?').run(url, `${date.replaceAll("-", "")}-pqc-${index}`);
  }
  const items = f.db.prepare('SELECT * FROM news').all();
  const digest = await buildDigest(f.env, row, date, items);
  assert.match(digest.html, /href="https:\/\/example.com\/original\?part=1&amp;lang=zh"/);
  assert.match(digest.text, /阅读原文：https:\/\/example.com\/original\?part=1&lang=zh/);
  assert.doesNotMatch(digest.html + digest.text, /javascript:|https:\/\/wangyibiao.com\/news\/\d{4}-|\/news\/fallback/);
  assert.equal([...digest.html.matchAll(/href="https:\/\/example.com\//g)].length, 4, 'Both title and reading link point to each available original');
  assert.equal([...digest.html.matchAll(/原始来源暂未提供链接。/g)].length, 3);
  assert.match(digest.html, /管理订阅板块/);
  assert.match(digest.html, /退订日报/);
  assert.equal(f.mails.length, 0, 'Rendering a digest does not send mail');
});

test('public validation, origin restriction and administrator authentication protect applications', async t => {
  const f = fixture(t);
  for (const values of [{ email: 'bad' }, { categories: [] }, { categories: ['test'] }, { consent: false }, { reason: '' }]) {
    assert.equal((await f.api('/subscriptions', { email: 'valid@example.com', categories: ['ai'], consent: true, reason: '学习', ...values })).status, 400);
  }
  assert.equal((await f.api('/subscriptions', { email: 'valid@example.com', categories: ['ai'], consent: true, reason: '学习' }, false, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.api('/admin/subscriptions')).status, 401);
  assert.equal((await f.api('/admin/subscriptions', undefined, true)).status, 200);
  const oversized = new Request('https://api.wangyibiao.com/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'a'.repeat(9000) }) });
  assert.equal((await worker.fetch(oversized, f.env)).status, 413);
  const response = await f.api('/admin/subscriptions', undefined, true); assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://wangyibiao.com');
  assert.equal(f.db.prepare('SELECT count(*) n FROM newsletter_subscribers').get().n, 0);
});

test('confirmation details show the signed recipient and approved sections without activating mail', async t => {
  const f = fixture(t); const row = await f.apply('Reader@EXAMPLE.com', ['security', 'ai']);
  const pending = await subscriptionToken(f.env, { ...row, confirmation_expires_at: Date.now() + 86400000 }, 'confirm');
  const pendingResponse = await f.api(`/subscriptions/confirm?token=${encodeURIComponent(pending)}`);
  assert.equal(pendingResponse.status, 409); assert.doesNotMatch(await pendingResponse.text(), /reader@example\.com/);
  await f.approve(row);
  const updated = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  const token = await subscriptionToken(f.env, updated, 'confirm');
  const href = `/subscriptions/confirm?token=${encodeURIComponent(token)}`;
  const details = await f.api(href);
  assert.equal(details.status, 200); assert.equal(details.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await details.json(), { email: 'reader@example.com', categories: ['security', 'ai'], email_verified: false });
  assert.equal(f.db.prepare('SELECT email_verified_at FROM newsletter_subscribers').get().email_verified_at, null);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  assert.equal(f.mails.length, 1, 'Reading confirmation details sends no mail');
  assert.equal((await f.api('/subscriptions/confirm', { token })).status, 200);
  assert.equal((await (await f.api(href)).json()).email_verified, true);
  await f.api(`/admin/subscriptions/${row.id}/reject`, { note: '停止订阅' }, true);
  const stopped = await f.api(href); assert.equal(stopped.status, 409); assert.doesNotMatch(await stopped.text(), /reader@example\.com/);
  for (const badToken of ['', 'x' + token, await subscriptionToken(f.env, updated, 'manage'), await subscriptionToken(f.env, { ...updated, confirmation_expires_at: Date.now() - 1000 }, 'confirm')]) {
    const invalid = await f.api(`/subscriptions/confirm?token=${encodeURIComponent(badToken)}`);
    assert.equal(invalid.status, 403); assert.doesNotMatch(await invalid.text(), /reader@example\.com/);
  }
  const publicResult = await (await f.api('/subscriptions')).json();
  assert.ok(!('email' in publicResult), 'Public service metadata never exposes a recipient');
});

test('missing administrator or mail configuration fails closed without approving or sending', async t => {
  const f = fixture(t, false); const row = await f.apply();
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/approve`, {}, true)).status, 503);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'pending');
  assert.equal((await sendDailyDigest(f.env, date)).enabled, false); assert.equal(f.mails.length, 0);
  const env = { ...f.env, ADMIN_TOKEN: undefined };
  assert.equal((await worker.fetch(new Request('https://api.wangyibiao.com/api/admin/subscriptions', { headers: { Authorization: 'Bearer ' } }), env)).status, 503);
});

test('duplicates cannot overwrite approved preferences; application limiter rejects repeated submissions', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row);
  await f.apply('reader@example.com', ['security']);
  assert.equal(f.db.prepare('SELECT categories FROM newsletter_subscribers').get().categories, '["pqc","ai"]');
  for (let i = 0; i < 3; i++) await f.apply();
  assert.equal((await f.api('/subscriptions', { email: 'extra@example.com', categories: ['ai'], reason: '研究', consent: true })).status, 429);
});

test('confirmation and action tokens cannot be forged or reused for another action', async t => {
  const f = fixture(t); const row = await f.apply();
  const premature = { ...row, confirmation_expires_at: Date.now() + 86400000 };
  assert.equal((await f.api('/subscriptions/confirm', { token: await subscriptionToken(f.env, premature, 'confirm') })).status, 409);
  await f.approve(row);
  const token = await subscriptionToken(f.env, row, 'manage');
  assert.equal((await f.api('/subscriptions/confirm', { token })).status, 403);
  assert.equal((await f.api('/subscriptions/settings', { token: 'x' + token, categories: ['ai'] })).status, 403);
  assert.equal((await f.api('/subscriptions/confirm', { token: await subscriptionToken(f.env, { ...row, confirmation_expires_at: Date.now() - 1000 }, 'confirm') })).status, 403);
});

test('unsubscribe GET is safe for scanners; signed one-click POST stops future sends; reapplication invalidates old tokens', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  const token = await subscriptionToken(f.env, row, 'unsubscribe');
  const href = `/subscriptions/unsubscribe?token=${encodeURIComponent(token)}`;
  assert.equal((await f.api(href)).status, 200);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'approved');
  const response = await worker.fetch(new Request('https://api.wangyibiao.com/api' + href, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }), f.env);
  assert.equal(response.status, 200);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  await f.apply();
  assert.equal((await f.api(href, {})).status, 403);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'pending');
});

test('preference edits pause sending, require another review and cancel queued old selections', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  f.setFail(true); await sendDailyDigest(f.env, date);
  const token = await subscriptionToken(f.env, row, 'manage');
  assert.equal((await f.api('/subscriptions/settings', { token, categories: ['security'] })).status, 200);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'pending');
  assert.equal(f.db.prepare('SELECT status FROM newsletter_deliveries').get().status, 'cancelled');
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  f.setFail(false); await f.approve(row);
  const updated = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal(updated.status, 'approved'); assert.ok(updated.email_verified_at);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  assert.equal(f.mails.length, 2); // Initial confirmation and failed provider request only.
});

test('rejection requires a reason and stops an approved subscriber', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/reject`, {}, true)).status, 400);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/reject`, { note: '申请理由不足' }, true)).status, 200);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  const list = await (await f.api('/admin/subscriptions?status=rejected', undefined, true)).json();
  assert.equal(list.data.length, 1); assert.equal(list.data[0].review_note, '申请理由不足'); assert.ok(!('token_version' in list.data[0]));
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/approve`, {}, true)).status, 409);
});

test('administrator chooses approved sections before confirmation and delivery', async t => {
  const f = fixture(t); const row = await f.apply();
  const response = await f.api(`/admin/subscriptions/${row.id}/approve`, { categories: ['ngcc', 'security', 'migration'], expected_categories: ['pqc', 'ai'] }, true);
  assert.equal(response.status, 200);
  const saved = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal(saved.categories, '["migration","security","ngcc"]');
  assert.equal(saved.email_verified_at, null);
  assert.match(f.mails[0].message.text, /抗量子迁移、网络安全、NGCC 公钥征集/);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  await f.confirm(row); assert.equal((await sendDailyDigest(f.env, date)).sent, 1);
  assert.match(f.mails.at(-1).message.text, /security story/);
  assert.doesNotMatch(f.mails.at(-1).message.text, /pqc story|ai story/);
});

test('admin section edits preserve approval, verified identity and signed links; sending uses the saved choice', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  const manage = await subscriptionToken(f.env, row, 'manage');
  const unsubscribe = await subscriptionToken(f.env, row, 'unsubscribe');
  const response = await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['security', 'protocol'], expected_categories: ['pqc', 'ai'] }, true);
  assert.equal(response.status, 200); assert.equal(f.mails.length, 1, 'Saving sends no email');
  const saved = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal(saved.status, 'approved'); assert.ok(saved.email_verified_at); assert.equal(saved.token_version, row.token_version);
  assert.deepEqual((await (await f.api(`/subscriptions/settings?token=${manage}`)).json()).categories, ['protocol', 'security']);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 1);
  assert.match(f.mails.at(-1).message.text, /protocol story/); assert.match(f.mails.at(-1).message.text, /security story/);
  assert.doesNotMatch(f.mails.at(-1).message.text, /pqc story|ai story/);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['ai'] }, true)).status, 200);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0, 'Changing sections never causes a duplicate daily email');
  assert.equal((await f.api('/subscriptions/unsubscribe', { token: unsubscribe })).status, 200);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'unsubscribed');
});

test('section changes cancel queued email and a late provider error cannot revive the old payload', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  t.mock.method(globalThis, 'fetch', async () => {
    assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['ai'] }, true)).status, 200);
    throw new Error('provider outcome unknown');
  });
  await sendDailyDigest(f.env, date);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_deliveries').get().status, 'cancelled');
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['pqc', 'ai'] }, true)).status, 200);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0, 'Restoring a prior selection cannot revive an old batch');
});

test('changing unverified sections keeps confirmation required and gives its new content a new resend key', async t => {
  const f = fixture(t); const row = await f.apply(); f.setFail(true);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/approve`, {}, true)).status, 502);
  const previous = f.mails.at(-1);
  const before = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  const token = await subscriptionToken(f.env, before, 'confirm');
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['ai'] }, true)).status, 200);
  assert.equal(f.mails.length, 1);
  const confirmation = await (await f.api(`/subscriptions/confirm?token=${token}`)).json();
  assert.deepEqual(confirmation.categories, ['ai']); assert.equal(confirmation.email_verified, false);
  f.setFail(false);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/resend`, {}, true)).status, 200);
  assert.notEqual(f.mails.at(-1).key, previous.key);
  assert.match(f.mails.at(-1).message.text, /订阅板块：AI 前沿/);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
});

test('admin section validation, authentication and stale edits leave the subscription untouched', async t => {
  const f = fixture(t); const row = await f.apply(); const path = `/admin/subscriptions/${row.id}`;
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] }, true)).status, 409);
  for (const categories of [[], ['unknown'], ['constructor'], ['__proto__'], null]) {
    assert.equal((await f.api(`${path}/approve`, { categories }, true)).status, 400);
  }
  assert.equal(f.db.prepare('SELECT status FROM newsletter_subscribers').get().status, 'pending');
  await f.approve(row);
  const before = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] })).status, 401);
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'] }, true, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await f.api(`${path}/settings`, { categories: ['ai'], expected_categories: ['security'] }, true)).status, 409);
  for (const categories of [undefined, [], ['unknown'], ['constructor'], ['__proto__'], null]) {
    assert.equal((await f.api(`${path}/settings`, { categories }, true)).status, 400);
  }
  assert.deepEqual(f.db.prepare('SELECT * FROM newsletter_subscribers').get(), before);
});

test('saving unchanged email sections preserves the pending retry and configuration works while mail is unavailable', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  f.setFail(true); await sendDailyDigest(f.env, date);
  const before = f.db.prepare('SELECT * FROM newsletter_deliveries').get();
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['ai', 'pqc'] }, true)).status, 200);
  assert.deepEqual(f.db.prepare('SELECT * FROM newsletter_deliveries').get(), before);
  delete f.env.RESEND_API_KEY;
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/settings`, { categories: ['security'] }, true)).status, 200);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_deliveries').get().status, 'cancelled');
});

test('incomplete editions wait, failed delivery retries freeze the payload and provider key', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'protocol'").run();
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  f.db.prepare("UPDATE news SET status = 'published'").run();
  f.setFail(true); assert.equal((await sendDailyDigest(f.env, date)).failed, 1);
  const first = f.mails.at(-1);
  f.db.prepare("UPDATE news SET title = 'Changed after first attempt'").run();
  f.db.prepare('UPDATE newsletter_deliveries SET lease_until = 0').run();
  f.setFail(false); assert.equal((await sendDailyDigest(f.env, date)).sent, 1);
  const retry = f.mails.at(-1); assert.equal(retry.key, first.key); assert.deepEqual(retry.message, first.message);
});

test('concurrent scheduler runs claim a single delivery and old uncertain retries are abandoned', async t => {
  const f = fixture(t); const row = await f.apply(); await f.approve(row); await f.confirm(row);
  const results = await Promise.all([sendDailyDigest(f.env, date), sendDailyDigest(f.env, date)]);
  assert.equal(results.reduce((sum, value) => sum + value.sent, 0), 1);
  assert.equal(f.mails.length, 2);
  f.db.prepare("UPDATE newsletter_deliveries SET status = 'pending', lease_until = 0, created_at = ?").run(Date.now() - 24 * 3600000);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  assert.equal(f.db.prepare('SELECT status FROM newsletter_deliveries').get().status, 'failed');
});

test('scheduled handler registers the daily task with waitUntil', async t => {
  const f = fixture(t, false); let task;
  worker.scheduled({}, f.env, { waitUntil(promise) { task = promise; } });
  assert.ok(task instanceof Promise); await task; assert.equal(f.mails.length, 0);
});

test('failed approval cannot activate mail; confirmation retries keep a key and explicit successful resends get a new key', async t => {
  const f = fixture(t); const row = await f.apply(); f.setFail(true);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/approve`, {}, true)).status, 502);
  const failed = f.mails.at(-1);
  const waiting = f.db.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal(waiting.status, 'approved'); assert.equal(waiting.email_verified_at, null); assert.equal(waiting.confirmation_sent_at, null);
  assert.equal((await sendDailyDigest(f.env, date)).sent, 0);
  f.setFail(false);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/resend`, {}, true)).status, 200);
  assert.equal(f.mails.at(-1).key, failed.key); assert.deepEqual(f.mails.at(-1).message, failed.message);
  assert.equal((await f.api(`/admin/subscriptions/${row.id}/resend`, {}, true)).status, 200);
  assert.notEqual(f.mails.at(-1).key, failed.key);
});
