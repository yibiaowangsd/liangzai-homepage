import { SUBSCRIPTION_CATEGORIES } from './subscriptions.js';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const pauseBetweenMessages = () => new Promise(resolve => setTimeout(resolve, 3100));
const encoder = new TextEncoder();

function webhookUrl(env) {
  try {
    const url = new URL(env.NEWS_BOT_WEBHOOK_URL);
    if (url.protocol !== 'https:' || url.hostname !== 'imtwo.zdxlz.com' || url.port ||
        url.pathname !== '/im-external/v1/webhook/send' || !url.searchParams.get('key') ||
        url.username || url.password || url.hash) return null;
    return url.href;
  } catch { return null; }
}

export function robotConfigured(env) { return Boolean(webhookUrl(env)); }

async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    byte => byte.toString(16).padStart(2, '0')).join('');
}

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

export function buildRobotDigest(date, items) {
  return Object.entries(SUBSCRIPTION_CATEGORIES).map(([category, label], part) => {
    const stories = items.filter(item => item.category === category).slice(0, 5);
    const lines = [`量仔每日前沿 · ${date}`, `${part + 1}/5 · ${label}`];
    for (const [index, item] of stories.entries()) {
      lines.push(`${index + 1}. ${cleanText(item.title, 180)}`);
      if (item.summary) lines.push(cleanText(item.summary, 220));
      lines.push(`来源：${cleanText(item.source_name || '原始来源', 100)}`);
      const original = sourceUrl(item.source_url);
      lines.push(original ? `阅读原文：${original}` : '原始来源暂未提供链接。');
      lines.push('');
    }
    return { type: 'text', textMsg: { content: lines.join('\n').trim(), isMentioned: false } };
  });
}

class DeliveryError extends Error {
  constructor(code, uncertain = false) { super(code); this.uncertain = uncertain; }
}

async function postMessage(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload),
    });
  } catch { throw new DeliveryError('delivery_unconfirmed', true); }
  if (response.status === 429) throw new DeliveryError('rate_limited');
  if (!response.ok) throw new DeliveryError(`http_${response.status}`, response.status >= 500);
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
  } catch { throw new DeliveryError('invalid_acknowledgement', true); }
  if (result?.success === false || result?.ok === false) throw new DeliveryError('provider_rejected');
  if (!(result?.success === true || result?.ok === true) ||
      (result.code !== undefined && ![0, 200, '0', '200'].includes(result.code))) {
    throw new DeliveryError('delivery_unconfirmed', true);
  }
}

export async function sendRobotDigest(env, date = today(), { pause = pauseBetweenMessages } = {}) {
  const url = webhookUrl(env);
  if (!url) return { ok: true, enabled: false, sent: 0, message: '机器人尚未配置，未推送日报。' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid edition date');
  }
  const fingerprint = await hash(url);
  const existing = await env.DB.prepare('SELECT * FROM robot_deliveries WHERE edition_date = ?').bind(date).first();
  if (!existing) {
    const { results: items = [] } = await env.DB.prepare("SELECT slug, title, summary, category, source_name, source_url FROM news WHERE status = 'published' AND substr(published_at, 1, 10) = ? ORDER BY published_at DESC, id DESC").bind(date).all();
    if (!Object.keys(SUBSCRIPTION_CATEGORIES).every(key => items.filter(item => item.category === key).length >= 5)) {
      return { ok: true, enabled: true, sent: 0, message: '当日日报尚未完整发布，等待下一次推送。' };
    }
    await env.DB.prepare('INSERT INTO robot_deliveries (edition_date, destination_hash, payload, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(edition_date) DO NOTHING')
      .bind(date, fingerprint, JSON.stringify(buildRobotDigest(date, items)), Date.now()).run();
  }
  // This webhook has no documented idempotency key. Never retry an expired in-flight
  // request: the provider may have delivered it before the Worker stopped.
  await env.DB.prepare("UPDATE robot_deliveries SET status = 'uncertain', error = 'lease_expired' WHERE edition_date = ? AND status = 'sending' AND lease_until < ?").bind(date, Date.now()).run();
  await env.DB.prepare("UPDATE robot_deliveries SET status = 'failed', error = 'destination_changed' WHERE edition_date = ? AND status = 'pending' AND destination_hash != ?").bind(date, fingerprint).run();
  const lease = crypto.randomUUID();
  const job = await env.DB.prepare(`UPDATE robot_deliveries SET status = 'sending', lease_token = ?, lease_until = ?, attempts = attempts + 1
    WHERE edition_date = ? AND status = 'pending' AND next_attempt_at <= ? AND attempts < 5 AND destination_hash = ? RETURNING *`)
    .bind(lease, Date.now() + 300000, date, Date.now(), fingerprint).first();
  if (!job) {
    const record = await env.DB.prepare('SELECT status FROM robot_deliveries WHERE edition_date = ?').bind(date).first();
    const blocked = ['uncertain', 'failed'].includes(record?.status);
    return { ok: !blocked, enabled: true, sent: 0, date, status: record?.status,
      message: blocked ? '推送已暂停，请先检查发送记录与群内消息。' : '日报已发送、正在发送或等待处理，未重复推送。' };
  }
  const messages = JSON.parse(job.payload); let sent = 0;
  try {
    // Space every request, including the first after a partial retry, below 20/minute.
    for (let part = job.next_part; part < messages.length; part++) {
      await pause();
      await postMessage(url, messages[part]);
      const result = await env.DB.prepare('UPDATE robot_deliveries SET next_part = ? WHERE edition_date = ? AND lease_token = ? AND status = ?')
        .bind(part + 1, date, lease, 'sending').run();
      if (result.meta.changes !== 1) throw new DeliveryError('progress_unconfirmed', true);
      sent++;
    }
    await env.DB.prepare("UPDATE robot_deliveries SET status = 'sent', sent_at = datetime('now'), lease_until = 0, error = NULL WHERE edition_date = ? AND lease_token = ? AND status = 'sending'").bind(date, lease).run();
    return { ok: true, enabled: true, sent, date, message: '机器人日报已推送。' };
  } catch (error) {
    const uncertain = !(error instanceof DeliveryError) || error.uncertain;
    const status = uncertain ? 'uncertain' : job.attempts >= 5 ? 'failed' : 'pending';
    const code = error instanceof DeliveryError ? error.message : 'delivery_unconfirmed';
    await env.DB.prepare('UPDATE robot_deliveries SET status = ?, lease_until = 0, next_attempt_at = ?, error = ? WHERE edition_date = ? AND lease_token = ? AND status = ?')
      .bind(status, Date.now() + 15 * 60000, code, date, lease, 'sending').run();
    return { ok: false, enabled: true, sent, date, status, message: uncertain ? '推送结果尚未确认，已暂停自动重试，避免重复群消息。' : status === 'failed' ? '机器人未接受消息，已达到重试上限。' : '机器人未接受消息，稍后重试。' };
  }
}

export async function robotStatus(env, date = today()) {
  const record = await env.DB.prepare('SELECT edition_date, next_part, status, attempts, error, sent_at FROM robot_deliveries WHERE edition_date = ?').bind(date).first();
  return { enabled: robotConfigured(env), date, delivery: record || null };
}
