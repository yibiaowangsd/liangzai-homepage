import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../news-worker/index.js';
import { buildRobotDigest, robotConfigured, robotStatus, sendRobotDigest } from '../news-worker/robot.js';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const testUrl = 'https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=test-only-key';

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../news-worker/migrations/0002_robot_digest.sql', import.meta.url), 'utf8'));
  db.exec('CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT, source_name TEXT, source_url TEXT, published_at TEXT, status TEXT)');
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  let id = 0;
  for (const day of [date, '2020-01-01']) {
    for (const category of ['pqc', 'protocol', 'standards', 'security', 'ai']) {
      for (let i = 0; i < 5; i++) {
        insert.run(++id, `${day}-${category}-${i}`, `${category} story ${i}`, '中文摘要', category,
          '一手来源', `https://example.com/${category}/${i}?a=1&b=2`, `${day}T08:00:00Z`, 'published');
      }
    }
  }
  const DB = { prepare(sql) {
    const statement = db.prepare(sql); let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return statement.get(...args); },
      async all() { return { results: statement.all(...args) }; },
      async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; },
    };
  } };
  const env = { DB, NEWS_BOT_WEBHOOK_URL: testUrl, ADMIN_TOKEN: 'test-admin' };
  const requests = []; let respond = () => new Response(JSON.stringify({ ok: true, code: 200, message: '成功' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, env.NEWS_BOT_WEBHOOK_URL);
    assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    const payload = JSON.parse(options.body);
    assert.equal(payload.type, 'text'); assert.equal(payload.textMsg.isMentioned, false);
    assert.ok(payload.textMsg.content);
    requests.push(payload);
    return respond(payload, requests.length);
  });
  const pauses = [];
  const send = day => sendRobotDigest(env, day || date, { pause: async () => { pauses.push(true); } });
  const api = (path, method = 'GET', token) => worker.fetch(new Request('https://api.wangyibiao.com' + path, {
    method, headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), env);
  const record = () => db.prepare('SELECT * FROM robot_deliveries WHERE edition_date = ?').get(date);
  t.after(() => db.close());
  return { db, env, requests, pauses, send, api, record, respond(callback) { respond = callback; } };
}

test('complete edition sends five original-source sections once, independent of email subscriptions', async t => {
  const f = fixture(t);
  assert.equal((await f.send()).sent, 5);
  assert.equal(f.requests.length, 5); assert.equal(f.pauses.length, 5);
  const labels = ['后量子密码', '抗量子协议', '标准动态', '网络安全', 'AI 前沿'];
  f.requests.forEach((message, index) => {
    assert.match(message.textMsg.content, new RegExp(`${index + 1}/5 · ${labels[index]}`));
    assert.equal([...message.textMsg.content.matchAll(/阅读原文：https:\/\/example.com/g)].length, 5);
    assert.match(message.textMsg.content, /中文摘要/);
    assert.doesNotMatch(message.textMsg.content, /2020-01-01|wangyibiao.com\/news\//);
  });
  assert.equal(f.record().status, 'sent'); assert.equal(f.record().next_part, 5);
  assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 5);
  f.db.prepare('UPDATE news SET title = ? WHERE substr(published_at,1,10) = ?').run('改稿', date);
  assert.equal((await f.send()).sent, 0);
  assert.ok(!f.record().payload.includes('test-only-key'));
});

test('incomplete, unpublished and wrong-date news never create or send a robot edition', async t => {
  const f = fixture(t);
  f.db.prepare("UPDATE news SET status = 'draft' WHERE category = 'ai' AND substr(published_at,1,10) = ?").run(date);
  const response = await f.send();
  assert.equal(response.sent, 0); assert.match(response.message, /尚未完整/);
  assert.equal(f.record(), undefined); assert.equal(f.requests.length, 0);
  f.db.prepare("UPDATE news SET published_at = '2020-01-01T08:00:00Z'").run();
  assert.equal((await f.send()).sent, 0);
});

test('disabled or invalid destinations never perform database work or leak webhook credentials', async () => {
  for (const value of [undefined, '', 'http://imtwo.zdxlz.com/im-external/v1/webhook/send?key=x',
    'https://evil.example/im-external/v1/webhook/send?key=x',
    'https://user:password@imtwo.zdxlz.com/im-external/v1/webhook/send?key=x',
    'https://imtwo.zdxlz.com/im-external/v1/webhook/send',
    'https://imtwo.zdxlz.com/another?key=x']) {
    const env = { NEWS_BOT_WEBHOOK_URL: value };
    assert.equal(robotConfigured(env), false);
    const result = await sendRobotDigest(env);
    assert.equal(result.enabled, false); assert.equal(result.sent, 0);
    assert.doesNotMatch(JSON.stringify(result), /password|imtwo|key=/);
  }
});

test('parallel Cron/manual sends atomically claim one edition and never double-send parts', async t => {
  const f = fixture(t);
  const results = await Promise.all([f.send(), f.send(), f.send()]);
  assert.equal(results.reduce((sum, item) => sum + item.sent, 0), 5);
  assert.equal(f.requests.length, 5); assert.equal(f.record().status, 'sent');
});

test('provider rejection retains accepted parts and retries the frozen remaining content', async t => {
  const f = fixture(t);
  f.respond((_payload, number) => new Response(JSON.stringify(number === 3 ? { success: false, code: 7101, message: testUrl } : { ok: true, code: 200 })));
  const first = await f.send();
  assert.equal(first.ok, false); assert.equal(first.sent, 2); assert.equal(first.status, 'pending');
  assert.doesNotMatch(JSON.stringify(first), /test-only-key|imtwo/);
  const frozen = JSON.parse(f.record().payload);
  assert.equal(f.record().next_part, 2);
  assert.equal((await f.send()).sent, 0, 'Backoff prevents immediate retries');
  f.db.prepare('UPDATE news SET title = ?').run('更改的新闻');
  f.db.prepare('UPDATE robot_deliveries SET next_attempt_at = 0').run();
  assert.equal((await f.send()).sent, 3);
  assert.deepEqual(f.requests.slice(3), frozen.slice(2));
  assert.equal(f.record().status, 'sent'); assert.equal(f.record().attempts, 2);
});

test('rate limits retry at most five rounds without creating another edition', async t => {
  const f = fixture(t); f.respond(() => new Response('', { status: 429 }));
  for (let attempt = 1; attempt <= 5; attempt++) {
    f.db.prepare('UPDATE robot_deliveries SET next_attempt_at = 0').run();
    assert.equal((await f.send()).ok, false);
    assert.equal(f.record().attempts, attempt);
  }
  assert.equal(f.record().status, 'failed'); assert.equal(f.record().error, 'rate_limited');
  assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 5);
});

test('uncertain transport and acknowledgements stop automatic retries instead of duplicating group messages', async t => {
  for (const failure of ['network', 'server', 'html', 'empty', 'huge', 'wrong-code']) {
    await t.test(failure, async sub => {
      const f = fixture(sub);
      f.respond(() => {
        if (failure === 'network') throw new Error(testUrl);
        if (failure === 'server') return new Response('Error: ' + testUrl, { status: 500 });
        if (failure === 'html') return new Response('<html>not JSON</html>');
        if (failure === 'huge') return new Response('x'.repeat(17000));
        return new Response(JSON.stringify(failure === 'wrong-code' ? { ok: true, code: 500 } : {}));
      });
      const result = await f.send();
      assert.equal(result.status, 'uncertain'); assert.equal(f.record().status, 'uncertain');
      assert.doesNotMatch(JSON.stringify(result), /test-only-key|imtwo/);
      assert.equal((await f.send()).sent, 0); assert.equal(f.requests.length, 1);
    });
  }
});

test('an expired in-flight lease pauses; a live lease is never reclaimed', async t => {
  const f = fixture(t); f.respond(() => new Response(JSON.stringify({ ok: false, code: 500 })));
  await f.send();
  f.db.prepare("UPDATE robot_deliveries SET status = 'sending', lease_until = ?").run(Date.now() + 300000);
  assert.equal((await f.send()).sent, 0); assert.equal(f.record().status, 'sending');
  f.db.prepare('UPDATE robot_deliveries SET lease_until = 0').run();
  assert.equal((await f.send()).sent, 0); assert.equal(f.record().status, 'uncertain');
  assert.equal(f.record().error, 'lease_expired'); assert.equal(f.requests.length, 1);
});

test('changing destinations never forwards an old pending payload to another group', async t => {
  const f = fixture(t); f.respond(() => new Response(JSON.stringify({ ok: false, code: 500 })));
  await f.send();
  f.env.NEWS_BOT_WEBHOOK_URL = testUrl.replace('test-only-key', 'rotated-test-key');
  const result = await f.send();
  assert.equal(result.sent, 0); assert.equal(f.requests.length, 1);
  assert.equal(f.record().status, 'failed'); assert.equal(f.record().error, 'destination_changed');
});

test('formatting suppresses mentions, control text and unsafe source links', () => {
  const payloads = buildRobotDigest(date, [
    { category: 'pqc', title: '@all\n伪标题', summary: '😀'.repeat(500), source_url: 'javascript:alert(1)' },
    { category: 'pqc', title: '来源缺失', source_url: '/news/fallback' },
    { category: 'pqc', title: '带凭据地址', source_url: 'https://username:password@example.com/' },
    { category: 'pqc', title: '有效来源', source_url: 'https://example.com/a?b=1&c=2' },
  ]);
  const content = payloads[0].textMsg.content;
  assert.match(content, /＠all 伪标题/); assert.doesNotMatch(content, /javascript:|\/news\/fallback|username:password|@all/);
  assert.match(content, /阅读原文：https:\/\/example.com\/a\?b=1&c=2/);
  assert.equal([...content.matchAll(/原始来源暂未提供链接。/g)].length, 3);
  assert.ok(!content.includes('\uFFFD'), 'Unicode summaries do not split surrogate pairs');
});

test('health reveals only readiness; robot administration requires the publisher credential', async t => {
  const f = fixture(t);
  const health = await (await f.api('/api/health')).json();
  assert.equal(health.robot_ready, true); assert.doesNotMatch(JSON.stringify(health), /test-only-key|imtwo/);
  assert.equal((await f.api('/api/admin/robot/status')).status, 401);
  assert.equal((await f.api('/api/admin/robot/send', 'POST', 'wrong')).status, 401);
  const status = await (await f.api('/api/admin/robot/status', 'GET', 'test-admin')).json();
  assert.equal(status.enabled, true); assert.equal(status.delivery, null);
  assert.doesNotMatch(JSON.stringify(status), /test-only-key|imtwo/);
  assert.equal((await f.api('/api/admin/robot/send', 'GET', 'test-admin')).status, 405);
  assert.equal(f.requests.length, 0);
  delete f.env.ADMIN_TOKEN;
  assert.equal((await f.api('/api/admin/robot/status')).status, 503);
});

test('scheduled robot delivery uses waitUntil and the real rate-limit delay when mail is disabled', async t => {
  const f = fixture(t); const delays = [];
  t.mock.method(globalThis, 'setTimeout', (callback, ms) => { delays.push(ms); callback(); return 0; });
  let task;
  worker.scheduled({}, f.env, { waitUntil(promise) { task = promise; } });
  assert.ok(task instanceof Promise); await task;
  assert.equal(f.requests.length, 5); assert.equal(f.record().status, 'sent');
  assert.deepEqual(delays, [3100, 3100, 3100, 3100, 3100]);
  const status = await robotStatus(f.env);
  assert.equal(status.delivery.next_part, 5); assert.equal(status.delivery.status, 'sent');
  assert.doesNotMatch(JSON.stringify(status), /test-only-key/);
});

test('invalid edition dates are rejected before any sends', async t => {
  const f = fixture(t);
  for (const day of ['bad', '2026-02-30', '2026-10-09T00:00:00Z']) await assert.rejects(() => f.send(day), /Invalid edition date/);
  assert.equal(f.requests.length, 0);
});
