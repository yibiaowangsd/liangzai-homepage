import { sendRobotDigest, retryUnconfirmedRobotDelivery } from './robot.js';
import { RequestError, cleanString, readBody, digest, secretMatches, normalizeCategories } from './subscriptions.js';
import { robotConfigured, normalizeWebhook, webhookDisplay, webhookHash, encryptWebhook, normalizeMentions } from './robot-config.js';

const success = { ok: true, message: '机器人订阅申请已提交。管理员审核通过后启用定时推送，@ 成员由管理员配置。调整或停止推送请联系管理员。' };
function deliveryMessage(delivery) {
  if (!delivery) return '当日日报尚未完整发布，等待下一次推送。';
  const total = delivery.total_parts ?? JSON.parse(delivery.payload).length;
  if (delivery.status === 'sent') return delivery.error === 'legacy_delivery' ? '今日旧版日报已有成功记录，未重复推送。' : `当日日报已发送，共 ${total} 条消息。`;
  if (delivery.status === 'uncertain') return delivery.error === 'legacy_delivery'
    ? '今日旧版推送结果未确认，已阻止新增机器人的重复推送。请核对群内消息后选择「核对后重试」。'
    : `已确认 ${delivery.next_part} / ${total} 条；下一条发送结果未确认，请核对群内消息后选择「核对后重试」。`;
  if (delivery.status === 'sending') return '当日日报正在发送，请稍后刷新查看结果。';
  if (delivery.status === 'cancelled') return '当前发送任务已停止，新配置从下一份日报生效。';
  const reason = delivery.error === 'provider_rejected' ? '机器人服务拒绝消息，请检查 webhook 和成员配置。'
    : delivery.error === 'rate_limited' ? '机器人服务限流。'
    : /^http_\d{3}$/.test(delivery.error || '') ? `机器人服务返回 HTTP ${delivery.error.slice(5)}。` : '';
  if (delivery.status === 'failed') return `推送未完成，已暂停自动重试。${reason || '请检查机器人配置。'}`;
  return reason ? `${reason}定时任务将重试未发送部分。` : `已确认 ${delivery.next_part} / ${total} 条，等待继续发送。`;
}
async function apply(request, env) {
  if (!robotConfigured(env)) throw new RequestError('机器人订阅服务尚未配置，请稍后再试。', 503);
  const body = await readBody(request);
  if (body.website) return success;
  const webhook = normalizeWebhook(body.webhook);
  const categories = normalizeCategories(body.categories);
  const name = cleanString(body.name || '', 80, true);
  const reason = cleanString(body.reason, 500, true);
  if (body.consent !== true) throw new RequestError('请先同意订阅说明。');
  const now = Date.now();
  const limitKey = await digest(`robot-request-v1:${env.ROBOT_WEBHOOK_SECRET || env.NEWSLETTER_TOKEN_SECRET || env.ADMIN_TOKEN}:${Math.floor(now / 3600000)}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
  const limit = await env.DB.prepare('INSERT INTO newsletter_request_limits (key, expires_at) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count').bind(limitKey, now + 7200000).first();
  if (limit.count > 5) throw new RequestError('提交过于频繁，请一小时后再试。', 429);
  await env.DB.prepare('DELETE FROM newsletter_request_limits WHERE expires_at < ?').bind(now).run();
  const fingerprint = await webhookHash(env, webhook);
  const existing = await env.DB.prepare('SELECT id FROM robot_subscribers WHERE webhook_hash = ?').bind(fingerprint).first();
  const id = existing?.id || crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO robot_subscribers (id, webhook_hash, webhook_ciphertext, webhook_display, categories, applicant_name, reason, consent_version, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'robot-daily-v1', ?) ON CONFLICT(webhook_hash) DO UPDATE SET
    webhook_ciphertext = excluded.webhook_ciphertext, categories = excluded.categories, applicant_name = excluded.applicant_name,
    reason = excluded.reason, consent_version = excluded.consent_version, version = excluded.version, status = 'pending',
    mention_mode = 'none', mention_mobiles = '[]', review_note = '', reviewed_at = NULL, updated_at = datetime('now')
    WHERE robot_subscribers.status IN ('rejected','unsubscribed')`)
    .bind(id, fingerprint, await encryptWebhook(env, id, webhook), webhookDisplay(webhook), JSON.stringify(categories), name, reason, crypto.randomUUID()).run();
  // Public applicants cannot grant approval, choose @ recipients or overwrite an
  // approved subscription by submitting the same credential again.
  return success;
}
export async function handleRobotSubscriptions(request, env, json) {
  const url = new URL(request.url);
  const isPublic = url.pathname === '/api/robot-subscriptions';
  const isReview = url.pathname === '/api/admin/robot-subscriptions' || url.pathname.startsWith('/api/admin/robot-subscriptions/');
  if (!isPublic && !isReview) return null;
  try {
    const origin = request.headers.get('Origin');
    if (origin && !['https://wangyibiao.com', 'https://www.wangyibiao.com'].includes(origin)) throw new RequestError('不允许的请求来源。', 403);
    if (isReview && !env.NEWSLETTER_ADMIN_TOKEN && !env.ADMIN_TOKEN) throw new RequestError('审核服务未配置。', 503);
    if (isReview && !await secretMatches(request.headers.get('Authorization'), `Bearer ${env.NEWSLETTER_ADMIN_TOKEN || env.ADMIN_TOKEN}`)) throw new RequestError('审核口令不正确。', 401);
    if (isPublic && request.method === 'GET') return json(request, { review_required: true, robot_ready: robotConfigured(env), mentions_admin_only: true });
    if (isPublic && request.method === 'POST') return json(request, await apply(request, env), 202);
    if (request.method === 'GET' && url.pathname === '/api/admin/robot-subscriptions') {
      const status = url.searchParams.get('status') || 'pending';
      if (!['pending','approved','rejected','unsubscribed','all'].includes(status)) throw new RequestError('申请状态无效。');
      const page = Number(url.searchParams.get('page') || 1);
      if (!Number.isSafeInteger(page) || page < 1) throw new RequestError('页码无效。');
      const where = status === 'all' ? '' : 'WHERE s.status = ?';
      const args = status === 'all' ? [] : [status];
      const count = await env.DB.prepare(`SELECT count(*) AS total FROM robot_subscribers s ${where}`).bind(...args).first();
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
      const { results: data } = await env.DB.prepare(`SELECT s.id, s.webhook_display, s.categories, s.applicant_name, s.reason, s.status,
        s.mention_mode, s.mention_mobiles, s.review_note, s.created_at, d.status AS delivery_status, d.next_part, d.error AS delivery_error,
        json_array_length(d.payload) AS total_parts, CASE WHEN d.status = 'uncertain' THEN coalesce(d.lease_token, d.id) END AS recovery_token
        FROM robot_subscribers s LEFT JOIN robot_subscription_deliveries d ON d.subscriber_id = s.id AND d.edition_date = ?
        ${where} ORDER BY s.created_at DESC, s.id LIMIT 50 OFFSET ?`).bind(date, ...args, (page - 1) * 50).all();
      return json(request, { data: data.map(row => ({ ...row, delivery_message: deliveryMessage(row.delivery_status ? { status: row.delivery_status, error: row.delivery_error, next_part: row.next_part, total_parts: row.total_parts } : null) })), total: count.total, page, robot_ready: robotConfigured(env) });
    }
    const match = url.pathname.match(/^\/api\/admin\/robot-subscriptions\/([a-f0-9-]{36})\/(approve|reject|mentions|send|retry)$/);
    if (request.method === 'POST' && match) {
      const [, id, action] = match;
      const body = await readBody(request);
      const row = await env.DB.prepare('SELECT * FROM robot_subscribers WHERE id = ?').bind(id).first();
      if (!row) throw new RequestError('申请不存在。', 404);
      if (action === 'send' || action === 'retry') {
        if (row.status !== 'approved') throw new RequestError('只有审核通过的机器人可以立刻发送。', 409);
        if (!robotConfigured(env)) throw new RequestError('机器人订阅服务尚未配置。', 503);
        if (action === 'retry') {
          if (body.confirm_not_received !== true || typeof body.recovery_token !== 'string') throw new RequestError('请先核对群内消息，确认待重试的消息未收到。', 409);
          await retryUnconfirmedRobotDelivery(env, row, body.recovery_token);
        }
        const result = await sendRobotDigest(env, undefined, { subscriberId: id, maxMessages: 1 });
        const delivery = await env.DB.prepare('SELECT id, status, error, lease_token, next_part, next_attempt_at, payload FROM robot_subscription_deliveries WHERE subscriber_id = ? AND edition_date = ?').bind(id, result.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())).first();
        const total = delivery ? JSON.parse(delivery.payload).length : 0;
        const more = result.sent > 0 && delivery?.status === 'pending' && delivery.next_attempt_at <= Date.now();
        const message = !delivery ? result.message || '当日日报尚未完整发布，未发送。'
          : delivery.status === 'sent' ? result.sent ? deliveryMessage(delivery) : '当日日报已发送，未重复推送。'
          : more ? `已发送 ${delivery.next_part} / ${total} 条，正在继续…`
          : deliveryMessage(delivery);
        const requiresConfirmation = delivery?.status === 'uncertain';
        return json(request, { ok: result.ok && !['uncertain', 'cancelled', 'failed'].includes(delivery?.status), sent: result.sent, more, status: delivery?.status || 'waiting', next_part: delivery?.next_part || 0, total, message,
          requires_confirmation: requiresConfirmation, ...(requiresConfirmation ? { recovery_token: delivery.lease_token || delivery.id } : {}) });
      }
      if (action === 'approve' && row.status !== 'pending') throw new RequestError('只有待审核申请可以通过。', 409);
      if (action === 'mentions' && row.status !== 'approved') throw new RequestError('请先通过申请，再调整成员配置。', 409);
      if (action === 'reject' && !['pending','approved'].includes(row.status)) throw new RequestError('此申请已处理。', 409);
      if (action !== 'reject' && !robotConfigured(env)) throw new RequestError('机器人订阅服务尚未配置。', 503);
      const note = cleanString(body.note || '', 500, action === 'reject');
      const mentions = action === 'reject' ? { mode: 'none', mobiles: [] } : normalizeMentions(body);
      const version = crypto.randomUUID();
      const status = action === 'reject' ? 'rejected' : 'approved';
      const result = await env.DB.batch([
        env.DB.prepare(`UPDATE robot_subscribers SET status = ?, mention_mode = ?, mention_mobiles = ?, version = ?,
          review_note = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND version = ?`)
          .bind(status, mentions.mode, JSON.stringify(mentions.mobiles), version, action === 'mentions' ? row.review_note : note, id, row.version),
        env.DB.prepare(`UPDATE robot_subscription_deliveries SET status = 'cancelled', lease_until = 0 WHERE subscriber_id = ?
          AND status IN ('pending','sending') AND version != ? AND EXISTS (SELECT 1 FROM robot_subscribers WHERE id = ? AND version = ?)`)
          .bind(id, version, id, version),
      ]);
      if (result[0].meta.changes !== 1) throw new RequestError('申请已被其他操作修改，请刷新后重试。', 409);
      return json(request, { ok: true, message: action === 'reject' ? '已拒绝申请并停止后续推送。' : action === 'mentions' ? '@ 成员配置已更新，下一份日报生效。' : '已通过审核，完整日报发布后自动推送。' });
    }
    return json(request, { error: '不支持的请求。' }, 405);
  } catch (error) { return json(request, { error: error instanceof RequestError ? error.message : '机器人订阅服务暂不可用，请稍后再试。' }, error instanceof RequestError ? error.status : 500); }
}
