export const SUBSCRIPTION_CATEGORIES = {
  pqc: '后量子密码', protocol: '抗量子协议', standards: '标准动态', security: '网络安全', ai: 'AI 前沿',
};
const SITE = 'https://wangyibiao.com';
const API = 'https://api.wangyibiao.com';
const encoder = new TextEncoder();
const CONSENT_VERSION = 'daily-news-v1';

class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function cleanString(value, max, required = false) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new RequestError('请完整填写申请信息，并遵守字数限制。');
  }
  return value.trim();
}
export function normalizeCategories(values) {
  if (!Array.isArray(values) || !values.length || values.length > 5 || values.some(v => typeof v !== 'string' || !SUBSCRIPTION_CATEGORIES[v])) {
    throw new RequestError('请至少选择一个有效新闻板块。');
  }
  return Object.keys(SUBSCRIPTION_CATEGORIES).filter(key => values.includes(key));
}
function emailAddress(value) {
  const email = cleanString(value, 254, true).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) || email.split('@')[0].length > 64) {
    throw new RequestError('请输入有效的邮箱地址。');
  }
  return email;
}
async function readBody(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw new RequestError('请使用 JSON 提交申请。', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('申请内容为空。');
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new RequestError('申请内容过长。', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new RequestError('申请内容格式不正确。'); }
}
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function secretMatches(a, b) {
  if (!a || !b) return false;
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function signingSecret(env) {
  // Domain separation prevents subscription tokens from being usable as admin credentials.
  const secret = env.NEWSLETTER_TOKEN_SECRET || env.ADMIN_TOKEN;
  if (!secret) throw new RequestError('订阅服务尚未完成配置，请稍后再试。', 503);
  return `liangzai-newsletter-v1:${secret}`;
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unbase64(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
async function hmacKey(env) {
  return crypto.subtle.importKey('raw', encoder.encode(signingSecret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function subscriptionToken(env, subscriber, action) {
  const payload = base64url(encoder.encode(JSON.stringify({ id: subscriber.id, v: subscriber.token_version, action,
    exp: action === 'confirm' ? subscriber.confirmation_expires_at : null })));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(env), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}
async function resolveToken(env, token, action) {
  if (typeof token !== 'string' || token.length > 1024) throw new RequestError('链接无效或已过期。', 403);
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await hmacKey(env), unbase64(parts[1]), encoder.encode(parts[0]))) throw new Error();
    const payload = JSON.parse(new TextDecoder().decode(unbase64(parts[0])));
    if (payload.action !== action || typeof payload.id !== 'string' || typeof payload.v !== 'string' || (action === 'confirm' && (!Number.isSafeInteger(payload.exp) || payload.exp < Date.now()))) throw new Error();
    const subscriber = await env.DB.prepare('SELECT * FROM newsletter_subscribers WHERE id = ? AND token_version = ?').bind(payload.id, payload.v).first();
    if (!subscriber) throw new Error();
    return subscriber;
  } catch { throw new RequestError('链接无效或已过期，请联系管理员重新发送确认邮件。', 403); }
}
export function mailConfigured(env) { return Boolean(env.RESEND_API_KEY && env.NEWSLETTER_FROM && (env.NEWSLETTER_TOKEN_SECRET || env.ADMIN_TOKEN)); }
async function sendMail(env, payload, key) {
  if (!mailConfigured(env)) throw new RequestError('邮件服务尚未配置，申请将保持待审核。', 503);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new RequestError(`邮件服务发送失败（${response.status}），请稍后重试。`, 502);
  const result = await response.json();
  if (typeof result.id !== 'string') throw new RequestError('邮件服务未确认发送成功。', 502);
  return result.id;
}
async function confirmation(env, subscriber) {
  const token = await subscriptionToken(env, subscriber, 'confirm');
  const href = `${SITE}/news/subscribe?action=confirm&token=${encodeURIComponent(token)}`;
  const labels = normalizeCategories(JSON.parse(subscriber.categories)).map(key => SUBSCRIPTION_CATEGORIES[key]).join('、');
  const payload = { from: env.NEWSLETTER_FROM, to: [subscriber.email], subject: '量仔日报订阅已通过审核，请确认邮箱',
    text: `你的量仔日报订阅申请已通过审核。订阅板块：${labels}。\n确认后才会开始收到日报，链接七天内有效：\n${href}\n如果这不是你的申请，请忽略此邮件；不会向你发送日报。`,
    html: `<h1>订阅申请已通过审核</h1><p>订阅板块：${escapeHtml(labels)}</p><p>确认邮箱后才会开始收到日报，链接七天内有效。</p><p><a href="${escapeHtml(href)}">确认邮箱并启用订阅</a></p><p>如果这不是你的申请，请忽略此邮件；不会向你发送日报。</p>` };
  await sendMail(env, payload, `newsletter-confirm/${subscriber.id}/${subscriber.token_version}/${subscriber.confirmation_expires_at}/${subscriber.confirmation_generation}`);
  await env.DB.prepare("UPDATE newsletter_subscribers SET confirmation_sent_at = datetime('now') WHERE id = ? AND token_version = ?").bind(subscriber.id, subscriber.token_version).run();
}
async function apply(request, env) {
  signingSecret(env);
  const body = await readBody(request);
  if (body.website) return { ok: true, message: '申请已提交，审核通过后将向邮箱发送确认链接。' };
  const email = emailAddress(body.email);
  const categories = normalizeCategories(body.categories);
  const applicantName = cleanString(body.name || '', 80);
  const reason = cleanString(body.reason, 500, true);
  if (body.consent !== true) throw new RequestError('请先同意订阅说明。');
  const now = Date.now();
  const key = await digest(`${signingSecret(env)}:${Math.floor(now / 3600000)}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
  const limit = await env.DB.prepare('INSERT INTO newsletter_request_limits (key, expires_at) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count').bind(key, now + 7200000).first();
  if (limit.count > 5) throw new RequestError('提交过于频繁，请一小时后再试。', 429);
  await env.DB.prepare('DELETE FROM newsletter_request_limits WHERE expires_at < ?').bind(now).run();
  await env.DB.prepare(`INSERT INTO newsletter_subscribers (id, email, categories, applicant_name, reason, consent_version, token_version)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET categories = excluded.categories,
    applicant_name = excluded.applicant_name, reason = excluded.reason, consent_version = excluded.consent_version,
    token_version = excluded.token_version, status = 'pending', email_verified_at = NULL,
    confirmation_expires_at = NULL, confirmation_sent_at = NULL, confirmation_generation = 0, review_note = '', reviewed_at = NULL, updated_at = datetime('now')
    WHERE newsletter_subscribers.status IN ('rejected', 'unsubscribed')`).bind(crypto.randomUUID(), email, JSON.stringify(categories), applicantName, reason, CONSENT_VERSION, crypto.randomUUID()).run();
  // Do not disclose whether an address already exists, or let unauthenticated duplicates replace approved preferences.
  return { ok: true, message: '申请已提交，审核通过后将向邮箱发送确认链接。已订阅用户可通过日报中的管理入口修改板块。' };
}
export async function buildDigest(env, subscriber, date, items) {
  const categories = normalizeCategories(JSON.parse(subscriber.categories));
  const manage = `${SITE}/news/subscribe?action=manage&token=${encodeURIComponent(await subscriptionToken(env, subscriber, 'manage'))}`;
  const unsubscribeToken = await subscriptionToken(env, subscriber, 'unsubscribe');
  const unsubscribe = `${SITE}/news/subscribe?action=unsubscribe&token=${encodeURIComponent(unsubscribeToken)}`;
  const oneClick = `${API}/api/subscriptions/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const sections = categories.map(category => ({ label: SUBSCRIPTION_CATEGORIES[category], items: items.filter(item => item.category === category).slice(0, 5) }));
  const text = [`量仔每日前沿 · ${date}`, ...sections.flatMap(section => [section.label, ...section.items.map(item => `${item.title}\n${item.summary || ''}\n阅读全文：${SITE}/news/${encodeURIComponent(item.slug)}${item.source_url ? `\n原文：${item.source_url}` : ''}`)]), `管理订阅：${manage}`, `退订：${unsubscribe}`].join('\n\n');
  const html = `<html lang="zh-CN"><body style="margin:0;background:#f5f3ed;color:#202321;font:16px/1.8 Arial,sans-serif"><main style="max-width:680px;margin:auto;padding:32px 24px"><h1 style="font-size:28px">量仔每日前沿</h1><p>${date} · 仅包含你已获批订阅的板块</p>${sections.map(section => `<h2 style="margin-top:32px;border-bottom:1px solid #d4d6ce">${escapeHtml(section.label)}</h2>${section.items.map(item => `<article style="margin:24px 0"><h3><a style="color:#263c32" href="${SITE}/news/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><p style="font-size:13px">${escapeHtml(item.source_name || '原始来源')} · <a href="${SITE}/news/${encodeURIComponent(item.slug)}">阅读全文与原文来源</a></p></article>`).join('')}`).join('')}<hr><p style="font-size:13px">你收到此邮件是因为订阅申请已通过审核并确认邮箱。<br><a href="${escapeHtml(manage)}">管理订阅板块</a> · <a href="${escapeHtml(unsubscribe)}">退订日报</a></p></main></body></html>`;
  return { from: env.NEWSLETTER_FROM, to: [subscriber.email], subject: `量仔每日前沿｜${date}｜${sections.map(s => s.label).join(' · ')}`, html, text,
    headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}
export async function sendDailyDigest(env, date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())) {
  if (!mailConfigured(env)) return { ok: true, enabled: false, sent: 0, message: '邮件服务未配置，未发送任何邮件。' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RequestError('日报日期无效。');
  const { results: items = [] } = await env.DB.prepare("SELECT slug, title, summary, category, source_name, source_url FROM news WHERE status = 'published' AND substr(published_at, 1, 10) = ? ORDER BY published_at DESC, id DESC").bind(date).all();
  if (!Object.keys(SUBSCRIPTION_CATEGORIES).every(key => items.filter(item => item.category === key).length >= 5)) return { ok: true, enabled: true, sent: 0, message: '当日日报尚未完整发布，等待下一次自动发送。' };
  const { results: subscribers = [] } = await env.DB.prepare(`SELECT s.* FROM newsletter_subscribers s
    WHERE s.status = 'approved' AND s.email_verified_at IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM newsletter_deliveries d WHERE d.subscriber_id = s.id AND d.edition_date = ?)
    ORDER BY s.created_at LIMIT 20`).bind(date).all();
  for (const subscriber of subscribers) {
    const payload = await buildDigest(env, subscriber, date, items);
    await env.DB.prepare('INSERT INTO newsletter_deliveries (id, subscriber_id, edition_date, categories, token_version, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(subscriber_id, edition_date) DO NOTHING').bind(crypto.randomUUID(), subscriber.id, date, subscriber.categories, subscriber.token_version, JSON.stringify(payload), Date.now()).run();
  }
  const now = Date.now();
  // Freeze retry payloads and stop before the provider's 24-hour deduplication window expires.
  await env.DB.prepare("UPDATE newsletter_deliveries SET status = 'failed', error = 'retry_window_expired' WHERE status IN ('pending','sending') AND created_at < ?").bind(now - 23 * 3600000).run();
  const { results: jobs = [] } = await env.DB.prepare("SELECT id FROM newsletter_deliveries WHERE edition_date = ? AND status IN ('pending','sending') AND lease_until < ? AND attempts < 5 ORDER BY created_at LIMIT 20").bind(date, now).all();
  let sent = 0, failed = 0;
  for (const job of jobs) {
    const lease = crypto.randomUUID();
    const claimed = await env.DB.prepare(`UPDATE newsletter_deliveries SET status = 'sending', lease_until = ?, lease_token = ?, attempts = attempts + 1
      WHERE id = ? AND status IN ('pending','sending') AND lease_until < ? AND attempts < 5 RETURNING *`).bind(Date.now() + 300000, lease, job.id, Date.now()).first();
    if (!claimed) continue;
    if (sent > 0) await new Promise(resolve => setTimeout(resolve, 550));
    const current = await env.DB.prepare('SELECT status, email_verified_at, categories, token_version FROM newsletter_subscribers WHERE id = ?').bind(claimed.subscriber_id).first();
    if (current?.status !== 'approved' || !current.email_verified_at || current.categories !== claimed.categories || current.token_version !== claimed.token_version) {
      await env.DB.prepare("UPDATE newsletter_deliveries SET status = 'cancelled', lease_until = 0 WHERE id = ? AND lease_token = ?").bind(job.id, lease).run();
      continue;
    }
    try {
      const providerId = await sendMail(env, JSON.parse(claimed.payload), `newsletter-daily/${claimed.subscriber_id}/${date}`);
      await env.DB.prepare("UPDATE newsletter_deliveries SET status = 'sent', provider_id = ?, sent_at = datetime('now'), lease_until = 0, error = NULL WHERE id = ? AND lease_token = ?").bind(providerId, job.id, lease).run();
      sent++;
    } catch {
      // An uncertain provider outcome always retries the same key and frozen payload.
      await env.DB.prepare('UPDATE newsletter_deliveries SET status = ?, error = ?, lease_until = ? WHERE id = ? AND lease_token = ?').bind(claimed.attempts >= 5 ? 'failed' : 'pending', 'mail_provider_error', Date.now() + 60000, job.id, lease).run();
      failed++;
      break; // Also handles provider throttling; next cron continues without a burst.
    }
  }
  return { ok: true, enabled: true, sent, failed, date };
}
export async function handleSubscriptions(request, env, json) {
  const url = new URL(request.url);
  const isPublic = url.pathname === '/api/subscriptions' || url.pathname.startsWith('/api/subscriptions/');
  const isReview = url.pathname === '/api/admin/subscriptions' || url.pathname.startsWith('/api/admin/subscriptions/');
  if (!isPublic && !isReview) return null;
  try {
    const origin = request.headers.get('Origin');
    if (origin && ![SITE, 'https://www.wangyibiao.com'].includes(origin) && url.pathname !== '/api/subscriptions/unsubscribe') throw new RequestError('不允许的请求来源。', 403);
    if (isReview && !env.NEWSLETTER_ADMIN_TOKEN && !env.ADMIN_TOKEN) throw new RequestError('审核服务未配置。', 503);
    if (isReview && !await secretMatches(request.headers.get('Authorization'), `Bearer ${env.NEWSLETTER_ADMIN_TOKEN || env.ADMIN_TOKEN}`)) throw new RequestError('审核口令不正确。', 401);
    if (request.method === 'GET' && url.pathname === '/api/subscriptions') {
      await env.DB.prepare('SELECT id FROM newsletter_subscribers LIMIT 1').first();
      return json(request, { review_required: true, email_confirmation_required: true, mail_ready: mailConfigured(env) });
    }
    if (request.method === 'POST' && url.pathname === '/api/subscriptions') return json(request, await apply(request, env), 202);
    if (url.pathname === '/api/subscriptions/unsubscribe') {
      const body = request.method === 'POST' && request.headers.get('Content-Type')?.includes('application/json') ? await readBody(request) : {};
      const subscriber = await resolveToken(env, body.token || url.searchParams.get('token'), 'unsubscribe');
      if (request.method === 'POST') {
        await stopSubscription(env, subscriber.id, 'unsubscribed');
        return json(request, { ok: true, message: '已退订，之后不再发送日报。' });
      }
      if (request.method === 'GET') return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>退订量仔日报</title><h1>退订量仔日报</h1><p>点击按钮后停止接收日报。</p><form method="post"><button type="submit">确认退订</button></form></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    if (request.method === 'POST' && url.pathname === '/api/subscriptions/confirm') {
      const body = await readBody(request);
      const subscriber = await resolveToken(env, body.token, 'confirm');
      if (subscriber.status !== 'approved') throw new RequestError('申请尚未通过审核或已停止订阅。', 409);
      const result = await env.DB.prepare("UPDATE newsletter_subscribers SET email_verified_at = COALESCE(email_verified_at, datetime('now')), updated_at = datetime('now') WHERE id = ? AND status = 'approved'").bind(subscriber.id).run();
      if (!result.meta.changes) throw new RequestError('申请状态已变化，请重新打开确认链接。', 409);
      return json(request, { ok: true, message: '邮箱已确认，订阅已启用。完整日报发布后将发送所选板块。' });
    }
    if (url.pathname === '/api/subscriptions/settings' && ['GET', 'POST'].includes(request.method)) {
      const body = request.method === 'POST' ? await readBody(request) : {};
      const subscriber = await resolveToken(env, body.token || url.searchParams.get('token'), 'manage');
      if (request.method === 'POST') {
        if (subscriber.status === 'unsubscribed') throw new RequestError('已退订，请重新提交申请。', 409);
        const categories = normalizeCategories(body.categories);
        await env.DB.batch([
          env.DB.prepare("UPDATE newsletter_subscribers SET categories = ?, status = 'pending', reviewed_at = NULL, review_note = '', updated_at = datetime('now') WHERE id = ? AND status != 'unsubscribed'").bind(JSON.stringify(categories), subscriber.id),
          env.DB.prepare("UPDATE newsletter_deliveries SET status = 'cancelled' WHERE subscriber_id = ? AND status IN ('pending','sending')").bind(subscriber.id),
        ]);
        return json(request, { ok: true, message: '新板块已提交审核，审核期间暂停发送日报。' });
      }
      return json(request, { categories: JSON.parse(subscriber.categories), status: subscriber.status });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/subscriptions') {
      const status = url.searchParams.get('status') || 'pending';
      if (!['pending', 'approved', 'rejected', 'unsubscribed', 'all'].includes(status)) throw new RequestError('审核状态无效。');
      const page = Math.max(1, Math.min(parseInt(url.searchParams.get('page') || '1', 10) || 1, 100000));
      const where = status === 'all' ? '' : 'WHERE status = ?';
      const args = status === 'all' ? [] : [status];
      const count = await env.DB.prepare(`SELECT count(*) AS total FROM newsletter_subscribers ${where}`).bind(...args).first();
      const rows = await env.DB.prepare(`SELECT id, email, categories, applicant_name, reason, status, email_verified_at, confirmation_sent_at, review_note, reviewed_at, created_at FROM newsletter_subscribers ${where} ORDER BY created_at DESC, id LIMIT 50 OFFSET ?`).bind(...args, (page - 1) * 50).all();
      return json(request, { data: rows.results || [], page, total: count.total, mail_ready: mailConfigured(env) });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/subscriptions/send') {
      return json(request, await sendDailyDigest(env));
    }
    const review = url.pathname.match(/^\/api\/admin\/subscriptions\/([a-z0-9-]{36})\/(approve|reject|resend)$/);
    if (request.method === 'POST' && review) {
      const [, id, action] = review;
      const body = await readBody(request);
      const subscriber = await env.DB.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').bind(id).first();
      if (!subscriber) throw new RequestError('申请不存在。', 404);
      if (action === 'reject') {
        const note = cleanString(body.note, 500, true);
        if (!['pending', 'approved'].includes(subscriber.status)) throw new RequestError('申请已结束，请刷新列表。', 409);
        await stopSubscription(env, id, 'rejected', note);
        return json(request, { ok: true, message: '申请已拒绝，日报发送已停止。' });
      }
      if (!mailConfigured(env)) throw new RequestError('请先配置 RESEND_API_KEY 和 NEWSLETTER_FROM，再通过申请。', 503);
      if (action === 'approve' && subscriber.status !== 'pending') throw new RequestError('仅待审核申请可以通过。', 409);
      if (action === 'resend' && (subscriber.status !== 'approved' || subscriber.email_verified_at)) throw new RequestError('只有已通过但尚未确认邮箱的申请可以重发确认邮件。', 409);
      const expires = subscriber.confirmation_expires_at > Date.now() ? subscriber.confirmation_expires_at : Date.now() + 7 * 86400000;
      // A failed/uncertain attempt keeps its key; an explicit resend after success starts a new attempt.
      const generation = action === 'resend' && subscriber.confirmation_sent_at ? 1 : 0;
      await env.DB.prepare("UPDATE newsletter_subscribers SET status = 'approved', confirmation_expires_at = ?, confirmation_generation = confirmation_generation + ?, confirmation_sent_at = NULL, review_note = '', reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = ?").bind(expires, generation, id, subscriber.status).run();
      const updated = await env.DB.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').bind(id).first();
      if (updated.status !== 'approved') throw new RequestError('申请状态已变化，请刷新列表。', 409);
      if (!updated.email_verified_at) await confirmation(env, updated);
      return json(request, { ok: true, message: updated.email_verified_at ? '已通过审核，订阅恢复发送。' : '已通过审核并发送确认邮件；收件人确认后才开始发送日报。' });
    }
    return json(request, { error: 'Not found' }, 404);
  } catch (error) {
    if (error instanceof RequestError) return json(request, { error: error.message }, error.status);
    // Never log application bodies, addresses, secrets or signed links.
    console.error('newsletter_request_failed');
    return json(request, { error: '订阅服务暂时不可用，请稍后再试。' }, 503);
  }
}

async function stopSubscription(env, id, status, note = '') {
  await env.DB.batch([
    env.DB.prepare("UPDATE newsletter_subscribers SET status = ?, review_note = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(status, note, id),
    env.DB.prepare("UPDATE newsletter_deliveries SET status = 'cancelled' WHERE subscriber_id = ? AND status IN ('pending','sending')").bind(id),
  ]);
}
