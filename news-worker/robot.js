import { publishedCoverage, CORE_CATEGORIES } from './edition.js';
import { SUBSCRIPTION_CATEGORIES, normalizeCategories, digest, RequestError } from './subscriptions.js';
import { robotConfigured, decryptWebhook, normalizeSendMode } from './robot-config.js';
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

export function buildRobotDigest(date, items, selected = Object.keys(SUBSCRIPTION_CATEGORIES), mentions = { mode: 'none', mobiles: [] }, options = {}) {
  const categories = normalizeCategories(selected);
  const sendMode = normalizeSendMode(options.send_mode);
  const sections = categories.map(category => {
    const label = SUBSCRIPTION_CATEGORIES[category];
    const stories = items.filter(item => item.category === category).slice(0, 5);
    const lines = [];
    for (const [index, item] of stories.entries()) {
      const original = sourceUrl(item.source_url);
      lines.push(`${index + 1}. ${cleanText(item.title, 60)}${original ? ` ${original}` : ''}`);
    }
    return { label, lines };
  });
  const message = (content, first) => ({ type: 'text', textMsg: { content, isMentioned: first && mentions.mode === 'members',
    ...(first && mentions.mode === 'members' ? { mentionType: 2, mentionedMobileList: mentions.mobiles } : {}) } });
  if (sendMode === 'single') {
    return [message([`量仔每日前沿 · ${date}`, ...sections.map(section => [section.label, ...section.lines].join('\n'))].join('\n\n'), true)];
  }
  return sections.map((section, part) => message([`量仔每日前沿 · ${date}`, `${part + 1}/${sections.length} · ${section.label}`, ...section.lines].join('\n').trim(), part === 0));
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
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload),
    });
  } catch (error) { throw new DeliveryError('delivery_unconfirmed', true, { failure_kind: ['TimeoutError', 'AbortError'].includes(error?.name) ? 'timeout' : 'network' }); }
  // workerd supports manual/follow, not redirect:error. Reject 3xx ourselves
  // so the credential and message are never forwarded to another destination.
  if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new DeliveryError('redirect_rejected', false, { http_status: response.status }); }
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

async function editionItems(env, date, selected = null) {
  const { results: items = [] } = await env.DB.prepare("SELECT slug, title, summary, category, source_name, source_url, published_at, status FROM news WHERE status = 'published' AND date(published_at, '+8 hours') = ? ORDER BY published_at DESC, id DESC").bind(date).all();
  const coverage = await publishedCoverage(env, date, items, selected);
  return coverage ? { items, coverage } : null;
}

export async function sendManualRobotDigest(env, subscriberId, { send_id: sendId, part, version, date = today(), pause = pauseBetweenMessages } = {}) {
  if (!robotConfigured(env)) throw new RequestError('机器人服务尚未配置。', 503);
  if (!/^[a-f0-9-]{36}$/.test(sendId || '') || !Number.isSafeInteger(part) || part < 0 || part >= CORE_CATEGORIES.length) throw new RequestError('发送操作已更新，请刷新页面后重试。');
  if (date !== today()) throw new RequestError('日报日期已变化，请重新点击立刻发送。', 409);
  const row = await env.DB.prepare("SELECT * FROM robot_subscribers WHERE id = ? AND status = 'approved'").bind(subscriberId).first();
  if (!row) throw new RequestError('只有审核通过的机器人可以立刻发送。', 409);
  const categories = normalizeCategories(JSON.parse(row.categories));
  if (part >= categories.length) throw new RequestError('发送消息不存在。');
  if (part > 0 && version !== row.version) throw new RequestError('订阅配置已变化，请重新点击立刻发送。', 409);
  if (row.send_mode === 'single' && part > 0) throw new RequestError('发送消息不存在。');
  await env.DB.prepare("UPDATE robot_manual_deliveries SET status = 'uncertain', error = 'lease_expired', lease_until = 0 WHERE subscriber_id = ? AND status IN ('pending','sending') AND lease_until < ?").bind(subscriberId, Date.now()).run();
  let job = await env.DB.prepare('SELECT * FROM robot_manual_deliveries WHERE send_id = ?').bind(sendId).first();
  if (!job) {
    if (part !== 0) throw new RequestError('发送批次不存在，请重新点击立刻发送。', 409);
    const edition = await editionItems(env, date, categories);
    if (!edition) throw new RequestError('所选板块的当日日报尚未完整发布，暂不能发送。', 409);
    const payload = buildRobotDigest(date, edition.items, categories, { mode: row.mention_mode, mobiles: JSON.parse(row.mention_mobiles) }, { send_mode: row.send_mode });
    // This insert and Cron's claim each exclude the other's active work. A
    // completed manual batch also suppresses today's later automatic delivery.
    await env.DB.prepare(`INSERT INTO robot_manual_deliveries (send_id, subscriber_id, edition_date, version, payload, lease_until, created_at)
      SELECT ?, id, ?, version, ?, ?, ? FROM robot_subscribers WHERE id = ? AND status = 'approved' AND version = ?
      AND NOT EXISTS (SELECT 1 FROM robot_manual_deliveries WHERE subscriber_id = ? AND status IN ('pending','sending'))
      AND NOT EXISTS (SELECT 1 FROM robot_subscription_deliveries WHERE subscriber_id = ? AND status = 'sending' AND lease_until > ?)
      ON CONFLICT(send_id) DO NOTHING`)
      .bind(sendId, date, JSON.stringify(payload), Date.now() + 300000, Date.now(), subscriberId, row.version, subscriberId, subscriberId, Date.now()).run();
    job = await env.DB.prepare('SELECT * FROM robot_manual_deliveries WHERE send_id = ?').bind(sendId).first();
    if (!job) throw new RequestError('该机器人已有发送任务进行中，请完成后再发送。', 409);
  }
  if (job.subscriber_id !== subscriberId || job.edition_date !== date || job.version !== row.version) throw new RequestError('发送批次或配置已变化，请重新点击立刻发送。', 409);
  const receipt = await env.DB.prepare('SELECT result FROM robot_manual_receipts WHERE send_id = ? AND part = ?').bind(sendId, part).first();
  if (receipt) {
    console.log('robot_manual', JSON.stringify({ send_id: sendId, part, sent: 0, duplicate: true, status: job.status }));
    return { ...JSON.parse(receipt.result), sent: 0, duplicate: true };
  }
  if (job.status !== 'pending' || job.next_part !== part) throw new RequestError(job.status === 'sending' ? '本次消息正在发送，请勿重复提交。' : '本次发送已停止，请重新点击立刻发送。', 409);
  let url;
  try { url = await decryptWebhook(env, row); } catch { throw new RequestError('机器人凭据无法读取。', 503); }
  const lease = crypto.randomUUID();
  const claimed = await env.DB.prepare(`UPDATE robot_manual_deliveries SET status = 'sending', lease_token = ?, lease_until = ?
    WHERE send_id = ? AND status = 'pending' AND next_part = ? RETURNING send_id`).bind(lease, Date.now() + 300000, sendId, part).first();
  if (!claimed) throw new RequestError('本次消息正在发送，请勿重复提交。', 409);
  await pause();
  const active = await env.DB.prepare(`SELECT s.id FROM robot_subscribers s JOIN robot_manual_deliveries m ON m.subscriber_id = s.id
    WHERE s.id = ? AND s.status = 'approved' AND s.version = ? AND m.send_id = ? AND m.status = 'sending' AND m.lease_token = ? AND m.lease_until > ?`)
    .bind(subscriberId, row.version, sendId, lease, Date.now()).first();
  if (!active) {
    await env.DB.prepare("UPDATE robot_manual_deliveries SET status = 'cancelled', lease_until = 0 WHERE send_id = ? AND lease_token = ?").bind(sendId, lease).run();
    throw new RequestError('审核或成员配置已变化，本次发送已停止。', 409);
  }
  const payload = JSON.parse(job.payload); let result, status;
  try {
    const provider = await postMessage(url, payload[part]);
    const nextPart = part + 1; status = nextPart < payload.length ? 'pending' : 'sent';
    result = { ok: true, sent: 1, more: nextPart < payload.length, next_part: nextPart, total: payload.length,
      send_id: sendId, version: row.version, date, provider,
      message: nextPart < payload.length ? `本次已发送 ${nextPart} / ${payload.length} 条，正在继续…` : `本次当日日报已发送，共 ${payload.length} 条消息。再次点击可重新发送。` };
  } catch (error) {
    if (!(error instanceof DeliveryError)) throw error;
    status = error.uncertain ? 'uncertain' : 'failed';
    result = { ok: false, sent: 0, more: false, next_part: part, total: payload.length, send_id: sendId, version: row.version, date,
      error_code: error.message, provider: error.provider,
      message: error.uncertain ? `本次第 ${part + 1} 条发送结果未确认。可点击「立刻发送」重新发送。` : '机器人未接受本次消息，请检查 webhook 和成员配置后再次发送。' };
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO robot_manual_receipts (send_id, part, result) VALUES (?, ?, ?)').bind(sendId, part, JSON.stringify(result)),
    env.DB.prepare("UPDATE robot_manual_deliveries SET status = ?, next_part = ?, lease_token = NULL, lease_until = ?, error = ? WHERE send_id = ? AND lease_token = ? AND status = 'sending'")
      .bind(status, result.next_part, status === 'pending' ? Date.now() + 300000 : 0, result.error_code || null, sendId, lease),
  ]);
  console.log('robot_manual', JSON.stringify({ send_id: sendId, part, sent: result.sent, status }));
  return result;
}

export async function sendRobotDigest(env, date = today(), { pause = pauseBetweenMessages, subscriberId = null, maxMessages = Infinity } = {}) {
  if (!robotConfigured(env)) return { ok: true, enabled: false, sent: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid edition date');
  const { results: subscribers = [] } = await env.DB.prepare(`SELECT s.* FROM robot_subscribers s
    WHERE s.status = 'approved' AND NOT EXISTS (SELECT 1 FROM robot_manual_deliveries m WHERE m.subscriber_id = s.id AND m.edition_date = ?) AND (? IS NULL OR s.id = ?) AND NOT EXISTS (SELECT 1 FROM robot_subscription_deliveries d WHERE d.subscriber_id = s.id AND d.edition_date = ?)
    ORDER BY s.created_at, s.id LIMIT 5`).bind(date, subscriberId, subscriberId, date).all();
  if (subscribers.length) {
    const edition = await editionItems(env, date);
    if (!edition) return { ok: true, enabled: true, sent: 0, message: '当日日报尚未完整发布，等待下一次推送。' };
    for (const subscriber of subscribers) {
      const payload = buildRobotDigest(date, edition.items, JSON.parse(subscriber.categories), { mode: subscriber.mention_mode, mobiles: JSON.parse(subscriber.mention_mobiles) }, { send_mode: subscriber.send_mode });
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
    AND status = 'pending' AND next_attempt_at <= ? AND attempts < 5 AND NOT EXISTS (SELECT 1 FROM robot_manual_deliveries m WHERE m.subscriber_id = robot_subscription_deliveries.subscriber_id AND m.edition_date = robot_subscription_deliveries.edition_date) AND (? IS NULL OR subscriber_id = ?) ORDER BY created_at, id LIMIT 5`).bind(date, Date.now(), subscriberId, subscriberId).all();
  let sent = 0, failed = 0, completed = 0;
  for (const record of jobs) {
    const lease = crypto.randomUUID();
    const job = await env.DB.prepare(`UPDATE robot_subscription_deliveries SET status = 'sending', lease_token = ?, lease_until = ?, attempts = attempts + 1
      WHERE id = ? AND status = 'pending' AND next_attempt_at <= ? AND attempts < 5 AND NOT EXISTS (SELECT 1 FROM robot_manual_deliveries m WHERE m.subscriber_id = robot_subscription_deliveries.subscriber_id AND m.edition_date = robot_subscription_deliveries.edition_date) RETURNING *`)
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
