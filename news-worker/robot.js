import { SUBSCRIPTION_CATEGORIES, normalizeCategories, digest, RequestError } from './subscriptions.js';
import { robotConfigured, decryptWebhook } from './robot-config.js';
export { robotConfigured } from './robot-config.js';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const pauseBetweenMessages = () => new Promise(resolve => setTimeout(resolve, 3100));
function cleanText(value, limit) {
  // Prevent news text from adding fake sections, control characters or mass mentions.
  const text = String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/@/g, '＠').replace(/\s+/g, ' ').trim();
  const chars = Array.from(text);
  return chars.length > limit ? chars.slice(0, limit - 1).join('') + '…' : text;
}

function sourceUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function buildRobotDigest(date, items, selected = Object.keys(SUBSCRIPTION_CATEGORIES), mentions = { mode: 'none', mobiles: [] }) {
  const categories = normalizeCategories(selected);
  return categories.map((category, part) => {
    const label = SUBSCRIPTION_CATEGORIES[category];
    const stories = items.filter(item => item.category === category).slice(0, 5);
    const lines = [`量仔每日前沿 · ${date}`, `${part + 1}/${categories.length} · ${label}`];
    for (const [index, item] of stories.entries()) {
      lines.push(`${index + 1}. ${cleanText(item.title, 180)}`);
      if (item.summary) lines.push(cleanText(item.summary, 220));
      lines.push(`来源：${cleanText(item.source_name || '原始来源', 100)}`);
      const original = sourceUrl(item.source_url);
      lines.push(original ? `阅读原文：${original}` : '原始来源暂未提供链接。');
      lines.push('');
    }
    return { type: 'text', textMsg: { content: lines.join('\n').trim(), isMentioned: part === 0 && mentions.mode === 'members',
      ...(part === 0 && mentions.mode === 'members' ? { mentionType: 2, mentionedMobileList: mentions.mobiles } : {}) } };
  });
}

class DeliveryError extends Error {
  constructor(code, uncertain = false, provider = {}) { super(code); this.uncertain = uncertain; this.provider = provider; }
}

function acknowledgementInfo(response, result) {
  // Never return a provider's raw body/message: it may echo the secret URL.
  return { http_status: response.status,
    ...(typeof result?.ok === 'boolean' ? { ok: result.ok } : {}),
    ...(typeof result?.success === 'boolean' ? { success: result.success } : {}),
    ...(/^-?\d{1,9}$/.test(String(result?.code ?? '')) ? { code: String(result.code) } : {}),
    acknowledgement_fields: ['ok', 'success', 'code', 'message', 'msg', 'data'].filter(key => result && Object.hasOwn(result, key)),
  };
}

async function postMessage(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload),
    });
  } catch (error) { throw new DeliveryError('delivery_unconfirmed', true, { failure_kind: ['TimeoutError', 'AbortError'].includes(error?.name) ? 'timeout' : 'network' }); }
  if (response.status === 429) throw new DeliveryError('rate_limited', false, { http_status: response.status });
  if (!response.ok) throw new DeliveryError(`http_${response.status}`, response.status >= 500, { http_status: response.status });
  // Require a positive provider acknowledgement. HTTP 200 alone is not success.
  let result;
  try {
    const reader = response.body.getReader();
    const chunks = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16384) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    result = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new DeliveryError('invalid_acknowledgement', true, { http_status: response.status }); }
  const provider = acknowledgementInfo(response, result);
  if (result?.success === false || result?.ok === false) throw new DeliveryError('provider_rejected', false, provider);
  if (!(result?.success === true || result?.ok === true) ||
      (result.code !== undefined && ![0, 200, '0', '200'].includes(result.code))) {
    throw new DeliveryError('delivery_unconfirmed', true, provider);
  }
  return provider;
}

export async function sendRobotConnectionTest(env, subscriberId, testId) {
  if (!robotConfigured(env)) throw new RequestError('机器人服务尚未配置。', 503);
  if (!/^[a-f0-9-]{36}$/.test(subscriberId || '') || !/^[A-Z0-9-]{1,64}$/.test(testId || '')) throw new RequestError('测试参数无效。');
  const subscriber = await env.DB.prepare("SELECT * FROM robot_subscribers WHERE id = ? AND status = 'approved'").bind(subscriberId).first();
  if (!subscriber) throw new RequestError('机器人不存在或尚未审核通过。', 409);
  let url;
  try { url = await decryptWebhook(env, subscriber); } catch { throw new RequestError('机器人凭据无法读取。', 503); }
  // A connection check is exactly one independent message, with no mentions,
  // retries or changes to daily delivery history and automatic delivery jobs.
  const payload = { type: 'text', textMsg: { content: `量仔机器人连接确认\n测试编号：${testId}\n这是一条连接测试消息。请确认收到，确认后再继续配置日报。`, isMentioned: false } };
  try {
    const provider = await postMessage(url, payload);
    return { ok: true, attempted: 1, test_id: testId, provider, message: '已发出一条连接测试消息，机器人服务返回成功，请在群内确认收到。' };
  } catch (error) {
    if (!(error instanceof DeliveryError)) throw error;
    return { ok: false, attempted: 1, test_id: testId, error_code: error.message, uncertain: error.uncertain, provider: error.provider,
      message: error.uncertain ? '连接测试已尝试发送，但服务未返回明确成功，请核对群内是否收到。' : '机器人服务拒绝连接测试消息。' };
  }
}

async function editionItems(env, date) {
  const { results: items = [] } = await env.DB.prepare("SELECT slug, title, summary, category, source_name, source_url FROM news WHERE status = 'published' AND substr(published_at, 1, 10) = ? ORDER BY published_at DESC, id DESC").bind(date).all();
  return Object.keys(SUBSCRIPTION_CATEGORIES).every(key => items.filter(item => item.category === key).length >= 5) ? items : null;
}

// Only an authenticated administrator's explicit, current confirmation can
// release an uncertain job. Cron and ordinary send requests never do this.
export async function retryUnconfirmedRobotDelivery(env, subscriber, recoveryToken, date = today()) {
  const job = await env.DB.prepare('SELECT * FROM robot_subscription_deliveries WHERE subscriber_id = ? AND edition_date = ?').bind(subscriber.id, date).first();
  if (!job || job.status !== 'uncertain' || recoveryToken !== (job.lease_token || job.id)) {
    throw new RequestError('发送状态已变化，请刷新列表后重新核对。', 409);
  }
  if (job.version !== subscriber.version) throw new RequestError('成员配置已变化，旧任务不能重试，新配置从下一份日报生效。', 409);
  let payload = job.payload;
  if (job.error === 'legacy_delivery') {
    const fingerprint = await digest(await decryptWebhook(env, subscriber));
    const legacy = await env.DB.prepare('SELECT status, lease_until, next_part FROM robot_deliveries WHERE edition_date = ? AND destination_hash = ?').bind(date, fingerprint).first();
    if (legacy?.status === 'sent' || legacy?.next_part > 0) throw new RequestError('旧版已有消息确认送达，不能整份重发，请核对群内记录并等待下一份日报。', 409);
    if (legacy?.status === 'sending' && legacy.lease_until > Date.now()) throw new RequestError('旧版推送仍在发送中，请稍后再核对。', 409);
    const items = await editionItems(env, date);
    if (!items) throw new RequestError('当日日报尚未完整发布，暂不能重试。', 409);
    // Legacy migration stores no payload. Rebuild the approved application's
    // selected sections and saved @ configuration; leave legacy history intact.
    payload = JSON.stringify(buildRobotDigest(date, items, JSON.parse(subscriber.categories), { mode: subscriber.mention_mode, mobiles: JSON.parse(subscriber.mention_mobiles) }));
  }
  const result = await env.DB.prepare(`UPDATE robot_subscription_deliveries SET status = 'pending', payload = ?, attempts = 0,
    lease_until = 0, lease_token = NULL, next_attempt_at = 0, error = NULL WHERE id = ? AND status = 'uncertain'
    AND coalesce(lease_token, id) = ? AND version = ?
    AND EXISTS (SELECT 1 FROM robot_subscribers WHERE id = ? AND status = 'approved' AND version = ?)`)
    .bind(payload, job.id, recoveryToken, subscriber.version, subscriber.id, subscriber.version).run();
  if (result.meta.changes !== 1) throw new RequestError('发送状态已变化，请刷新列表后重新核对。', 409);
}

export async function sendRobotDigest(env, date = today(), { pause = pauseBetweenMessages, subscriberId = null, maxMessages = Infinity } = {}) {
  if (!robotConfigured(env)) return { ok: true, enabled: false, sent: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid edition date');
  const { results: subscribers = [] } = await env.DB.prepare(`SELECT s.* FROM robot_subscribers s
    WHERE s.status = 'approved' AND (? IS NULL OR s.id = ?) AND NOT EXISTS (SELECT 1 FROM robot_subscription_deliveries d WHERE d.subscriber_id = s.id AND d.edition_date = ?)
    ORDER BY s.created_at, s.id LIMIT 5`).bind(subscriberId, subscriberId, date).all();
  if (subscribers.length) {
    const items = await editionItems(env, date);
    if (!items) return { ok: true, enabled: true, sent: 0, message: '当日日报尚未完整发布，等待下一次推送。' };
    for (const subscriber of subscribers) {
      const payload = buildRobotDigest(date, items, JSON.parse(subscriber.categories), { mode: subscriber.mention_mode, mobiles: JSON.parse(subscriber.mention_mobiles) });
      // Respect today's legacy singleton history when the same group applies
      // after migration. Approval must not replay an already attempted edition.
      let fingerprint;
      try { fingerprint = await digest(await decryptWebhook(env, subscriber)); }
      catch { /* The claimed job reports an unavailable credential safely. */ }
      const legacy = fingerprint ? await env.DB.prepare('SELECT status, sent_at FROM robot_deliveries WHERE edition_date = ? AND destination_hash = ?').bind(date, fingerprint).first() : null;
      const inheritedStatus = !legacy ? 'pending' : legacy.status === 'sent' ? 'sent' : ['sending','uncertain'].includes(legacy.status) ? 'uncertain' : 'cancelled';
      await env.DB.prepare(`INSERT INTO robot_subscription_deliveries (id, subscriber_id, edition_date, version, payload, created_at, status, error, sent_at)
        SELECT ?, id, ?, version, ?, ?, ?, ?, ? FROM robot_subscribers WHERE id = ? AND status = 'approved' AND version = ?
        ON CONFLICT(subscriber_id, edition_date) DO NOTHING`)
        .bind(crypto.randomUUID(), date, legacy ? "[]" : JSON.stringify(payload), Date.now(), inheritedStatus, legacy ? "legacy_delivery" : null, legacy?.sent_at || null, subscriber.id, subscriber.version).run();
    }
  }
  // Without provider idempotency, expired in-flight leases may already have sent.
  await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = 'uncertain', error = 'lease_expired', lease_until = 0 WHERE status = 'sending' AND lease_until < ? AND (? IS NULL OR subscriber_id = ?)").bind(Date.now(), subscriberId, subscriberId).run();
  const { results: jobs = [] } = await env.DB.prepare(`SELECT id FROM robot_subscription_deliveries WHERE edition_date = ?
    AND status = 'pending' AND next_attempt_at <= ? AND attempts < 5 AND (? IS NULL OR subscriber_id = ?) ORDER BY created_at, id LIMIT 5`).bind(date, Date.now(), subscriberId, subscriberId).all();
  let sent = 0, failed = 0, completed = 0;
  for (const record of jobs) {
    const lease = crypto.randomUUID();
    const job = await env.DB.prepare(`UPDATE robot_subscription_deliveries SET status = 'sending', lease_token = ?, lease_until = ?, attempts = attempts + 1
      WHERE id = ? AND status = 'pending' AND next_attempt_at <= ? AND attempts < 5 RETURNING *`)
      .bind(lease, Date.now() + 300000, record.id, Date.now()).first();
    if (!job) continue;
    try {
      const subscriber = await env.DB.prepare('SELECT * FROM robot_subscribers WHERE id = ? AND status = ? AND version = ?').bind(job.subscriber_id, 'approved', job.version).first();
      if (!subscriber) {
        await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = 'cancelled', lease_until = 0 WHERE id = ? AND lease_token = ?").bind(job.id, lease).run();
        continue;
      }
      let url;
      try { url = await decryptWebhook(env, subscriber); } catch { throw new DeliveryError('credential_unavailable', true); }
      const messages = JSON.parse(job.payload);
      let cancelled = false, yielded = false;
      for (let part = job.next_part; part < messages.length; part++) {
        await pause();
        // Recheck approval and administrator configuration immediately before each
        // outbound request, so revocation stops unsent sections of an active job.
        const active = await env.DB.prepare(`SELECT d.id FROM robot_subscription_deliveries d JOIN robot_subscribers s ON s.id = d.subscriber_id
          WHERE d.id = ? AND d.lease_token = ? AND d.status = 'sending' AND s.status = 'approved' AND s.version = d.version`)
          .bind(job.id, lease).first();
        if (!active) { cancelled = true; break; }
        await postMessage(url, messages[part]);
        sent++;
        const progress = await env.DB.prepare("UPDATE robot_subscription_deliveries SET next_part = ? WHERE id = ? AND lease_token = ? AND status = 'sending'").bind(part + 1, job.id, lease).run();
        if (progress.meta.changes !== 1) throw new DeliveryError('progress_unconfirmed', true);
        if (sent >= maxMessages && part + 1 < messages.length) {
          // Manual sends confirm one message per HTTP request, keeping the
          // connection below the form timeout. The next request or cron resumes.
          await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = 'pending', lease_until = 0, lease_token = NULL, attempts = attempts - 1, next_attempt_at = 0, error = NULL WHERE id = ? AND lease_token = ? AND status = 'sending'").bind(job.id, lease).run();
          yielded = true;
          break;
        }
      }
      if (!cancelled && !yielded) {
        const result = await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = 'sent', sent_at = datetime('now'), lease_until = 0, error = NULL WHERE id = ? AND lease_token = ? AND status = 'sending'").bind(job.id, lease).run();
        completed += result.meta.changes;
      } else if (cancelled) {
        await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = 'cancelled', lease_until = 0 WHERE id = ? AND lease_token = ? AND status = 'sending'").bind(job.id, lease).run();
      }
    } catch (error) {
      const uncertain = !(error instanceof DeliveryError) || error.uncertain;
      const status = uncertain ? 'uncertain' : job.attempts >= 5 ? 'failed' : 'pending';
      const code = error instanceof DeliveryError ? error.message : 'delivery_unconfirmed';
      await env.DB.prepare("UPDATE robot_subscription_deliveries SET status = ?, lease_until = 0, next_attempt_at = ?, error = ? WHERE id = ? AND lease_token = ? AND status = 'sending'")
        .bind(status, Date.now() + 15 * 60000, code, job.id, lease).run();
      failed++;
    }
    if (sent >= maxMessages) break;
  }
  return { ok: failed === 0, enabled: true, sent, completed, failed, date };
}

export async function robotStatus(env, date = today()) {
  const counts = await env.DB.prepare("SELECT count(*) AS total, sum(status = 'approved') AS approved, sum(status = 'pending') AS pending FROM robot_subscribers").first();
  const { results: deliveries } = await env.DB.prepare('SELECT status, count(*) AS count FROM robot_subscription_deliveries WHERE edition_date = ? GROUP BY status').bind(date).all();
  return { enabled: robotConfigured(env), review_required: true, date, subscriptions: counts, deliveries };
}
