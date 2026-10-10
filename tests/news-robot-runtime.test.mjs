import { manifestFor } from './fixtures/news-manifest.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { encryptWebhook } from '../news-worker/robot-config.js';

// Node accepts redirect: "error", while workerd rejects it before sending.
// Exercise the production API in the actual Worker runtime with a fake provider.
const bundle = await build({ entryPoints: ['news-worker/index.js'], bundle: true, write: false, format: 'esm', platform: 'browser' });
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const id = 'e2df292a-a95a-4a7c-bb01-d58eb20d845f';
const webhook = 'https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=runtime-test-only';

test('workerd can send an approved digest again and rejects redirects without forwarding credentials', async t => {
  const requests = []; let redirect = false;
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text,
    // This date is supported by the repository's locked local workerd version.
    compatibilityDate: '2026-05-22', d1Databases: { DB: 'robot-runtime-test' }, bindings: { ADMIN_TOKEN: 'test-admin', NEWSLETTER_ADMIN_TOKEN: 'test-review' },
    outboundService: async request => {
      requests.push({ url: request.url, payload: await request.json() });
      assert.equal(request.url, webhook); assert.equal(request.method, 'POST');
      return redirect ? new Response(null, { status: 302, headers: { Location: 'https://other.example/' } }) : Response.json({ ok: true, code: 200 });
    },
  });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  for (const file of ['0001_subscriptions.sql', '0002_robot_digest.sql', '0003_robot_subscriptions.sql', '0004_robot_manual_deliveries.sql', '0005_news_editions.sql']) {
    const sql = readFileSync(new URL(`../news-worker/migrations/${file}`, import.meta.url), 'utf8').replace(/--[^\n]*/g, '');
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  await db.prepare('CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT, source_name TEXT, source_url TEXT, published_at TEXT, status TEXT)').run();
  const ciphertext = await encryptWebhook({ ADMIN_TOKEN: 'test-admin' }, id, webhook);
  await db.prepare("INSERT INTO robot_subscribers (id, webhook_hash, webhook_ciphertext, webhook_display, categories, reason, consent_version, status, version) VALUES (?, 'runtime-hash', ?, 'example', '[\"ai\"]', 'test', 'robot-daily-v1', 'approved', 'runtime-version')").bind(id, ciphertext).run();
  for (let i = 0; i < 5; i++) await db.prepare("INSERT INTO news VALUES (?, ?, ?, 'summary', 'ai', 'source', ?, ?, 'published')").bind(i, `${date.replaceAll("-", "")}-runtime-${i}`, `story ${i}`, `https://example.com/story/${i}`, `${date}T08:00:00Z`).run();
  const manifest = manifestFor((await db.prepare('SELECT slug, category FROM news').all()).results);
  await db.prepare('INSERT INTO news_editions (date, schema_version, coverage, slugs) VALUES (?, 2, ?, ?)').bind(date, manifest.coverage, manifest.slugs).run();
  const send = async (operational = false, sendId = crypto.randomUUID(), allowBusy = false) => {
    const response = await mf.dispatchFetch(operational ? `https://api.wangyibiao.com/api/admin/robot/send` : `https://api.wangyibiao.com/api/admin/robot-subscriptions/${id}/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: operational ? 'Bearer test-admin' : 'Bearer test-review', Origin: 'https://wangyibiao.com' }, body: JSON.stringify({ send_id: sendId, part: 0, ...(operational ? { subscriber_id: id } : {}) }),
    });
    assert.ok(response.status === 200 || (allowBusy && response.status === 409)); return { ...await response.json(), api_status: response.status };
  };
  for (let click = 0; click < 2; click++) {
    const result = await send(); assert.equal(result.ok, true); assert.equal(result.sent, 1); assert.equal(result.more, false);
    assert.equal(result.provider.http_status, 200);
  }
  assert.equal(requests.length, 2);
  assert.match(requests[0].payload.textMsg.content, /^1\. story 4 https:\/\/example.com\/story\/4$/m);
  assert.doesNotMatch(requests[0].payload.textMsg.content, /summary|来源：|阅读原文：/);
  assert.equal((await db.prepare('SELECT count(*) AS count FROM robot_subscription_deliveries').first()).count, 0);
  assert.equal((await send(true)).ok, true, 'Separate operational credentials use the production manual sender');
  const duplicateId = crypto.randomUUID();
  const parallel = await Promise.all([send(false, duplicateId, true), send(false, duplicateId, true)]);
  assert.deepEqual(parallel.map(r => r.api_status).sort(), [200, 409]);
  const beforeDuplicate = requests.length;
  const duplicate = await send(false, duplicateId);
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.sent, 0); assert.equal(requests.length, beforeDuplicate);
  redirect = true;
  const rejected = await send(); assert.equal(rejected.ok, false); assert.equal(rejected.error_code, 'redirect_rejected');
  assert.equal(requests.length, 5, 'No request is made to the redirect target');
});
