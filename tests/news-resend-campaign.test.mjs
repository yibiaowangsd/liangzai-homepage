import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import policy from '../news/edition-policy.json' with { type: 'json' };
import { encryptWebhook, webhookHash } from '../news-worker/robot-config.js';
import { sendDailyDigest } from '../news-worker/subscriptions.js';
import { sendRobotDigest } from '../news-worker/robot.js';
import { editionHash, previewResendCampaign, startResendCampaign, stepResendCampaign, getResendCampaignStatus } from '../news-worker/resend-campaign.js';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const campaignId = `resend-${date}`;
const legacyCategories = ['pqc', 'migration', 'protocol', 'standards', 'security', 'ai', 'ngcc'];

function fixture(t) {
  const originalTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => originalTimeout(callback, [3100, 550].includes(delay) ? 0 : delay, ...args));
  const db = new DatabaseSync(':memory:');
  const migrations = new URL('../news-worker/migrations/', import.meta.url);
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, summary TEXT, content TEXT,
    category TEXT, tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT, published_at TEXT, status TEXT, updated_at TEXT)`);
  for (const file of readdirSync(migrations).filter(file => /^\d{4}.*\.sql$/.test(file)).sort()) db.exec(readFileSync(new URL(file, migrations), 'utf8'));
  const items = Object.keys(policy.categories).map((category, index) => ({
    slug: `${date.replaceAll('-', '')}-${category}-verified-update`, title: `${category} verified update`,
    summary: `${category} 已核实的新消息与必要背景。`, content: `原始发布日期：${date}。\n\n经过核实的具体内容，测试使用独立虚构资料，不发出真实消息。`,
    category, tags: ['test', category], source_name: 'Original source', source_url: `https://example.com/${category}`,
    cover_image: null, published_at: `${date}T08:00:00+08:00`, status: 'published', id: index + 1,
  }));
  const insert = db.prepare('INSERT INTO news (id,slug,title,summary,content,category,tags,source_name,source_url,cover_image,published_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const item of items) insert.run(item.id, item.slug, item.title, item.summary, item.content, item.category,
    JSON.stringify([...item.tags].sort()), item.source_name, item.source_url, item.cover_image, new Date(item.published_at).toISOString(), item.status);
  const coverage = Object.fromEntries(Object.keys(policy.categories).map(category => [category, { count: 1, note: '测试覆盖说明：该栏只有一条可核实的新进展，不凑数量。' }]));
  db.prepare('INSERT INTO news_editions (date,schema_version,coverage,slugs) VALUES (?,3,?,?)').run(date, JSON.stringify(coverage), JSON.stringify(items.map(item => item.slug).sort()));
  const DB = { prepare(sql) {
    const statement = db.prepare(sql); let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); },
      async all() { return { results: statement.all(...args) }; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } };
  }, async batch(statements) {
    db.exec('BEGIN');
    try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const env = { DB, ADMIN_TOKEN: 'test-only-admin', NEWSLETTER_FROM: 'test@example.com', RESEND_API_KEY: 'test-only-provider' };
  const calls = []; let respond = (channel, n) => channel === 'email' ? Response.json({ id: `email-${n}` }) : Response.json({ ok: true, code: 200 });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const host = new URL(url).hostname;
    assert.ok(['api.resend.com', 'imtwo.zdxlz.com'].includes(host), 'Only mocked delivery providers can be called');
    const channel = host === 'api.resend.com' ? 'email' : 'robot';
    calls.push({ channel, payload: JSON.parse(options.body), key: options.headers['Idempotency-Key'],
      recipient_key: channel === 'robot' ? new URL(url).searchParams.get('key') : null });
    return respond(channel, calls.length);
  });
  const addEmail = (overrides = {}) => {
    const row = { id: crypto.randomUUID(), email: `reader-${crypto.randomUUID()}@example.com`, categories: '["pqc","ai"]',
      status: 'approved', token_version: crypto.randomUUID(), email_verified_at: '2026-10-19 00:00:00', ...overrides };
    db.prepare(`INSERT INTO newsletter_subscribers (id,email,categories,reason,status,consent_version,token_version,email_verified_at)
      VALUES (?,?,?,'测试',?,'test',?,?)`).run(row.id, row.email, row.categories, row.status, row.token_version, row.email_verified_at);
    return db.prepare('SELECT * FROM newsletter_subscribers WHERE id=?').get(row.id);
  };
  const addRobot = async (overrides = {}) => {
    const row = { id: crypto.randomUUID(), categories: '["pqc","ai"]', status: 'approved', version: crypto.randomUUID(),
      send_mode: 'multiple', mention_mode: 'all', mention_mobiles: '[]', ...overrides };
    const url = `https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=test-only-${row.id}`;
    db.prepare(`INSERT INTO robot_subscribers (id,webhook_hash,webhook_ciphertext,webhook_display,categories,reason,status,consent_version,version,send_mode,mention_mode,mention_mobiles)
      VALUES (?,?,?,'test robot',?,'测试',?,'test',?,?,?,?)`).run(row.id, await webhookHash(env, url), await encryptWebhook(env, row.id, url),
      row.categories, row.status, row.version, row.send_mode, row.mention_mode, row.mention_mobiles);
    return db.prepare('SELECT * FROM robot_subscribers WHERE id=?').get(row.id);
  };
  const preview = () => previewResendCampaign(env, { date });
  const start = async () => { const p = await preview(); return startResendCampaign(env, p); };
  const step = (limit = 2) => stepResendCampaign(env, { campaign_id: campaignId, limit });
  const status = () => getResendCampaignStatus(env, { campaign_id: campaignId });
  const jobs = () => db.prepare('SELECT * FROM news_resend_jobs ORDER BY channel,subscriber_id').all();
  t.after(() => db.close());
  return { db, env, items, calls, addEmail, addRobot, preview, start, step, status, jobs, respond(fn) { respond = fn; } };
}

test('editorial hash is shared across input/DB normalization and ignores only enrichment fields', async t => {
  const f = fixture(t), rows = f.db.prepare('SELECT * FROM news').all();
  assert.equal(await editionHash(date, f.items), await editionHash(date, rows));
  const reordered = rows.toReversed().map(row => ({ ...row, id: 999, updated_at: 'changed', cover_image: 'https://example.com/new.jpg', tags: JSON.parse(row.tags).toReversed() }));
  assert.equal(await editionHash(date, f.items), await editionHash(date, reordered));
  rows[0].content += ' 有实质新增';
  assert.notEqual(await editionHash(date, f.items), await editionHash(date, rows));
});

test('preview counts only approved and confirmed recipients; concurrent starts freeze one audience', async t => {
  const f = fixture(t), email = f.addEmail();
  f.addEmail({ email_verified_at: null }); f.addEmail({ status: 'pending' });
  const robot = await f.addRobot({ categories: JSON.stringify(legacyCategories) }); await f.addRobot({ status: 'pending' });
  const preview = await f.preview();
  assert.deepEqual(preview.eligible, { email: 1, robot: 1 });
  assert.deepEqual(preview.planned_messages, { email: 1, robot: 7 });
  assert.doesNotMatch(JSON.stringify(preview), /reader-|test-only-|webhook|token_version|mentionedMobileList/);
  const [first, second] = await Promise.all([startResendCampaign(f.env, preview), startResendCampaign(f.env, preview)]);
  assert.equal(first.campaign_id, second.campaign_id); assert.equal(f.jobs().length, 2); assert.equal(f.calls.length, 0);
  assert.equal(f.db.prepare('SELECT categories FROM newsletter_subscribers WHERE id=?').get(email.id).categories, email.categories);
  assert.equal(f.db.prepare('SELECT categories FROM robot_subscribers WHERE id=?').get(robot.id).categories, JSON.stringify(legacyCategories));
  assert.doesNotMatch(f.jobs().find(job => job.channel === 'robot').payload, /快讯|flash/);
  assert.doesNotMatch(JSON.stringify(first), /reader-|test-only-|webhook|token_version|mentionedMobileList/);
});

test('changed hash, source slugs or approved audience fail closed before any campaign exists', async t => {
  const f = fixture(t); f.addEmail(); const preview = await f.preview();
  for (const altered of [{ ...preview, edition_hash: '0'.repeat(64) }, { ...preview, slugs: preview.slugs.slice(1) }, { ...preview, audience_hash: '0'.repeat(64) }]) {
    await assert.rejects(() => startResendCampaign(f.env, altered), error => error.status === 409);
  }
  f.db.prepare('UPDATE news SET content = content || ? WHERE id=1').run(' 新增正文');
  await assert.rejects(() => startResendCampaign(f.env, preview), error => error.status === 409);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM news_resend_campaigns').get().n, 0);
  assert.equal(f.calls.length, 0);
});

test('payload creation is transactional, with no partially frozen campaign after database failure', async t => {
  const f = fixture(t); f.addEmail(); await f.addRobot(); const preview = await f.preview();
  f.db.exec("CREATE TRIGGER fail_robot_snapshot BEFORE INSERT ON news_resend_jobs WHEN NEW.channel='robot' BEGIN SELECT RAISE(ABORT,'test failure'); END");
  await assert.rejects(() => startResendCampaign(f.env, preview));
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM news_resend_campaigns').get().n, 0); assert.equal(f.jobs().length, 0);
  f.db.exec('DROP TRIGGER fail_robot_snapshot');
  await startResendCampaign(f.env, preview); assert.equal(f.jobs().length, 2); assert.equal(f.calls.length, 0);
});

test('bounded steps use frozen content, retain saved subscriptions and never duplicate completed work', async t => {
  const f = fixture(t); f.addEmail(); await f.addRobot(); const preview = await f.preview();
  await startResendCampaign(f.env, preview);
  f.db.prepare('UPDATE news SET title=?').run('Later changed live content');
  for (let i = 0; i < 3; i++) { const before = f.calls.length; await f.step(1); assert.equal(f.calls.length - before, 1); }
  const final = await f.status();
  assert.equal(final.completed, true); assert.equal(final.counts.email.sent, 1); assert.equal(final.counts.robot.sent, 1);
  assert.equal(final.counts.robot.messages_sent, 2);
  for (const call of f.calls) {
    assert.match(JSON.stringify(call.payload), /更新补发/); assert.match(JSON.stringify(call.payload), /verified update/);
    assert.doesNotMatch(JSON.stringify(call.payload), /Later changed live content|flash verified update/);
  }
  const robots = f.calls.filter(call => call.channel === 'robot');
  assert.equal(robots[0].payload.textMsg.isMentioned, true); assert.equal(robots[1].payload.textMsg.isMentioned, false);
  await startResendCampaign(f.env, preview); await f.step(); await f.step(); assert.equal(f.calls.length, 3);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM newsletter_deliveries').get().n, 0, 'normal daily history is not rewritten');
});

test('unsubscribe, mailbox version and category changes cancel frozen recipients before delivery', async t => {
  const f = fixture(t), a = f.addEmail(), b = f.addEmail(), c = f.addEmail(); const robot = await f.addRobot();
  await f.start();
  f.db.prepare("UPDATE newsletter_subscribers SET status='unsubscribed' WHERE id=?").run(a.id);
  f.db.prepare("UPDATE newsletter_subscribers SET token_version='new-version' WHERE id=?").run(b.id);
  f.db.prepare("UPDATE newsletter_subscribers SET categories='[\"flash\"]' WHERE id=?").run(c.id);
  f.db.prepare("UPDATE robot_subscribers SET version='new-version' WHERE id=?").run(robot.id);
  const status = await f.step();
  assert.equal(status.counts.email.cancelled, 3); assert.equal(status.counts.robot.cancelled, 1); assert.equal(f.calls.length, 0);
});

test('unconfirmed robot acknowledgement stops the fixed manual batch without an automatic resend', async t => {
  const f = fixture(t); await f.addRobot(); await f.start();
  f.respond(() => Response.json({ code: 200 }));
  const status = await f.step();
  assert.equal(status.counts.robot.uncertain, 1); assert.equal(status.completed, true);
  const sendId = f.jobs()[0].delivery_id;
  await f.step(); await f.step(); assert.equal(f.calls.length, 1);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM robot_manual_deliveries WHERE send_id=?').get(sendId).n, 1);
});

test('uncertain email retries keep the exact provider key and payload within the 23-hour window', async t => {
  const f = fixture(t); f.addEmail(); await f.start();
  f.respond(() => { throw new TypeError('simulated connection loss after request'); });
  let status = await f.step(1); assert.equal(status.counts.email.pending, 1);
  f.db.exec('UPDATE news_resend_jobs SET next_attempt_at=0');
  f.respond(() => Response.json({ id: 'same-provider-id' }));
  status = await f.step(1); assert.equal(status.counts.email.sent, 1);
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0].key, f.calls[1].key);
  assert.deepEqual(f.calls[0].payload, f.calls[1].payload);
  await f.step(); assert.equal(f.calls.length, 2);
});

test('email stops retrying before the provider deduplication window expires', async t => {
  const f = fixture(t); f.addEmail(); await f.start();
  f.db.prepare('UPDATE news_resend_jobs SET created_at=?,attempts=1').run(Date.now() - 23 * 3600000);
  const status = await f.step();
  assert.equal(status.counts.email.uncertain, 1); assert.equal(f.calls.length, 0);
  assert.equal(status.errors[0].code, 'mail_retry_window_exhausted');
});

test('an active normal email finishes before its separate authorized supplement is sent', async t => {
  const f = fixture(t), row = f.addEmail();
  f.db.prepare(`INSERT INTO newsletter_deliveries (id,subscriber_id,edition_date,categories,token_version,payload,status,lease_until,created_at)
    VALUES ('normal',?,?,?,?,?,'sending',?,?)`).run(row.id, date, row.categories, row.token_version, '{}', Date.now() + 60000, Date.now());
  await f.start(); let status = await f.step(); assert.equal(f.calls.length, 0); assert.equal(status.counts.email.pending, 1);
  f.db.exec("UPDATE newsletter_deliveries SET status='sent',provider_id='old-receipt'; UPDATE news_resend_jobs SET next_attempt_at=0");
  status = await f.step(); assert.equal(status.counts.email.sent, 1); assert.equal(f.calls.length, 1);
  assert.equal(f.db.prepare('SELECT provider_id FROM newsletter_deliveries').get().provider_id, 'old-receipt');
});

test('concurrent steps share a campaign lease while one provider request is in flight', async t => {
  const f = fixture(t); f.addEmail(); await f.start();
  let entered, release;
  const atProvider = new Promise(resolve => { entered = resolve; });
  const delivery = new Promise(resolve => { release = resolve; });
  f.respond(async () => { entered(); await delivery; return Response.json({ id: 'once' }); });
  const first = f.step(1); await atProvider;
  const second = await f.step(1); assert.equal(second.counts.email.sending, 1); assert.equal(f.calls.length, 1);
  release(); await first; await f.step(1); assert.equal(f.calls.length, 1);
});

test('recorded robot progress recovers across a campaign bookkeeping interruption', async t => {
  const f = fixture(t); await f.addRobot(); await f.start(); await f.step(1);
  assert.equal(f.calls.length, 1);
  f.db.exec("UPDATE news_resend_jobs SET status='sending',next_part=0,lease_until=0,lease_token='expired-campaign-step'");
  const status = await f.step(1);
  assert.equal(status.counts.robot.sent, 1); assert.equal(f.calls.length, 2);
  assert.match(f.calls[0].payload.textMsg.content, /pqc verified update/);
  assert.match(f.calls[1].payload.textMsg.content, /ai verified update/);
  assert.equal(f.calls[1].payload.textMsg.isMentioned, false);
});

test('an expired in-flight robot lease is marked uncertain and never replayed', async t => {
  const f = fixture(t), row = await f.addRobot(); await f.start(); const job = f.jobs()[0];
  f.db.prepare(`INSERT INTO robot_manual_deliveries (send_id,subscriber_id,edition_date,version,payload,status,lease_until,created_at)
    VALUES (?,?,?,?,?,'sending',0,?)`).run(job.delivery_id, row.id, date, row.version, job.payload, Date.now());
  const status = await f.step(); assert.equal(status.counts.robot.uncertain, 1); assert.equal(f.calls.length, 0);
  await f.step(); assert.equal(f.calls.length, 0);
});

test('campaign reservations atomically block normal automatic claims before and after the supplement', async t => {
  const f = fixture(t); f.addEmail(); await f.addRobot(); await f.start();
  await sendDailyDigest(f.env, date); await sendRobotDigest(f.env, date, { pause: async () => {} });
  assert.equal(f.calls.length, 0, 'a normal daily claim cannot overtake a frozen campaign');
  for (let i = 0; i < 3; i++) await f.step(1);
  assert.equal(f.calls.length, 3);
  await sendDailyDigest(f.env, date); await sendRobotDigest(f.env, date, { pause: async () => {} });
  assert.equal(f.calls.length, 3, 'the same daily content is not automatically appended after supplementation');
});

for (const sendMode of ['multiple', 'single']) test(`all eight selected sections retain ${sendMode} mode and one administrator mention`, async t => {
  const f = fixture(t), selected = Object.keys(policy.categories);
  await f.addRobot({ categories: JSON.stringify(selected), send_mode: sendMode,
    mention_mode: 'members', mention_mobiles: '["13800000000"]' });
  const preview = await f.preview();
  assert.equal(preview.planned_messages.robot, sendMode === 'multiple' ? 8 : 1);
  await startResendCampaign(f.env, preview);
  for (let i = 0; i < selected.length && !(await f.status()).completed; i++) await f.step(1);
  const status = await f.status();
  assert.equal(status.counts.robot.sent, 1); assert.equal(f.calls.length, sendMode === 'multiple' ? 8 : 1);
  assert.equal(f.calls.filter(call => call.payload.textMsg.isMentioned).length, 1);
  assert.deepEqual(f.calls[0].payload.textMsg.mentionedMobileList, ['13800000000']);
  assert.equal(f.calls[0].payload.textMsg.mentionType, 2);
  assert.match(f.calls.at(-1).payload.textMsg.content, sendMode === 'multiple' ? /八、快讯（8\/8）/ : /八、快讯/);
});

for (const oldStatus of ['pending', 'sending']) test(`an expired ${oldStatus} manual batch from an older date cannot permanently block a new supplement`, async t => {
  const f = fixture(t), row = await f.addRobot();
  const oldId = crypto.randomUUID(), oldDate = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  f.db.prepare(`INSERT INTO robot_manual_deliveries
    (send_id,subscriber_id,edition_date,version,payload,status,next_part,lease_until,created_at)
    VALUES (?,?,?,?,?,?,1,0,?)`).run(oldId, row.id, oldDate, row.version,
      JSON.stringify([{ type: 'text', textMsg: { content: 'Old queued message' } }]), oldStatus, Date.now() - 86400000);
  await f.start();
  const status = await f.step(1);
  assert.equal(f.calls.length, 1); assert.equal(status.counts.robot.pending, 1);
  assert.match(f.calls[0].payload.textMsg.content, /pqc verified update/); assert.doesNotMatch(f.calls[0].payload.textMsg.content, /Old queued message/);
  const old = f.db.prepare('SELECT * FROM robot_manual_deliveries WHERE send_id=?').get(oldId);
  assert.equal(old.status, 'uncertain'); assert.equal(old.next_part, 1); assert.equal(old.error, 'lease_expired');
  assert.equal((await f.step(1)).counts.robot.sent, 1); assert.equal(f.calls.length, 2);
});

for (const queued of [false, true]) test(`twenty-one reserved emails ${queued ? 'already queued' : 'awaiting ordinary job creation'} cannot starve a newly confirmed subscriber`, async t => {
  const f = fixture(t), reserved = Array.from({ length: 21 }, () => f.addEmail());
  f.db.exec("UPDATE newsletter_subscribers SET created_at='2000-01-01 00:00:00'");
  await f.start();
  if (queued) {
    const insert = f.db.prepare(`INSERT INTO newsletter_deliveries
      (id,subscriber_id,edition_date,categories,token_version,payload,status,created_at)
      VALUES (?,?,?,?,?,?,'pending',?)`);
    for (const [index, row] of reserved.entries()) insert.run(crypto.randomUUID(), row.id, date, row.categories,
      row.token_version, JSON.stringify({ to: [row.email], text: 'reserved normal email' }), Date.now() - 1000 + index);
  }
  const originalJobs = f.db.prepare('SELECT * FROM newsletter_deliveries ORDER BY id').all();
  const newcomer = f.addEmail();
  const result = await sendDailyDigest(f.env, date);
  assert.equal(result.sent, 1, 'the new confirmed subscriber is not hidden behind the LIMIT 20 reservation prefix');
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].channel, 'email');
  assert.deepEqual(f.calls[0].payload.to, [newcomer.email]);
  assert.doesNotMatch(f.calls[0].payload.subject, /更新补发/);
  const preserved = f.db.prepare('SELECT * FROM newsletter_deliveries WHERE subscriber_id != ? ORDER BY id').all(newcomer.id);
  assert.deepEqual(preserved, originalJobs, 'reserved ordinary records remain intact and are not newly created, claimed or cleared');
  assert.equal(f.jobs().length, 21, 'the approved audience snapshot is not expanded');
  assert.equal(f.jobs().every(job => job.status === 'pending'), true);
  await sendDailyDigest(f.env, date); assert.equal(f.calls.length, 1, 'neither the new delivery nor reservations repeat on the next cron');
});

for (const queued of [false, true]) test(`six reserved robots ${queued ? 'already queued' : 'awaiting ordinary job creation'} cannot starve a newly approved robot`, async t => {
  const f = fixture(t), reserved = [];
  for (let index = 0; index < 6; index++) reserved.push(await f.addRobot());
  f.db.exec("UPDATE robot_subscribers SET created_at='2000-01-01 00:00:00'");
  await f.start();
  if (queued) {
    const insert = f.db.prepare(`INSERT INTO robot_subscription_deliveries
      (id,subscriber_id,edition_date,version,payload,status,created_at)
      VALUES (?,?,?,?,?,'pending',?)`);
    for (const [index, row] of reserved.entries()) insert.run(crypto.randomUUID(), row.id, date, row.version,
      JSON.stringify([{ type: 'text', textMsg: { content: 'reserved normal robot message', isMentioned: false } }]), Date.now() - 1000 + index);
  }
  const originalJobs = f.db.prepare('SELECT * FROM robot_subscription_deliveries ORDER BY id').all();
  const newcomer = await f.addRobot();
  const result = await sendRobotDigest(f.env, date, { pause: async () => {} });
  assert.equal(result.sent, 2, 'both selected sections reach the newcomer despite the LIMIT 5 reservation prefix');
  assert.equal(f.calls.length, 2);
  for (const call of f.calls) {
    assert.equal(call.channel, 'robot'); assert.equal(call.recipient_key, `test-only-${newcomer.id}`);
    assert.doesNotMatch(call.payload.textMsg.content, /reserved normal robot message|更新补发/);
  }
  const preserved = f.db.prepare('SELECT * FROM robot_subscription_deliveries WHERE subscriber_id != ? ORDER BY id').all(newcomer.id);
  assert.deepEqual(preserved, originalJobs, 'existing reserved robot records remain unchanged');
  assert.equal(f.jobs().length, 6, 'the newcomer is served by ordinary cron, not appended to the frozen campaign');
  assert.equal(f.jobs().every(job => job.status === 'pending'), true);
  await sendRobotDigest(f.env, date, { pause: async () => {} }); assert.equal(f.calls.length, 2);
});
