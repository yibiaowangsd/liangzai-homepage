import { publishedCoverage } from './edition.js';
import { buildDigest, digest, mailConfigured, normalizeCategories, RequestError, sendMail } from './subscriptions.js';
import { buildRobotDigest, sendManualRobotDigest } from './robot.js';
import { normalizeSendMode, robotConfigured } from './robot-config.js';

const RETRY_WINDOW_MS = 23 * 3600000;
const LEASE_MS = 120000;
const TERMINAL = new Set(['sent', 'failed', 'uncertain', 'cancelled']);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new RequestError('补发日期无效。');
  }
  return date;
}
function campaignDate(id) {
  if (typeof id !== 'string' || !/^resend-\d{4}-\d{2}-\d{2}$/.test(id)) throw new RequestError('补发批次无效。');
  return validDate(id.slice(7));
}
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
function canonicalTags(value) {
  let tags = value;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = tags.split(','); }
  }
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))].slice(0, 20).sort();
}
function canonicalItems(items) {
  return items.map(item => ({
    slug: String(item.slug).trim().toLowerCase(), title: text(item.title), summary: text(item.summary),
    content: text(item.content), category: text(item.category) || 'daily', tags: canonicalTags(item.tags),
    source_name: text(item.source_name), source_url: text(item.source_url),
    published_at: new Date(item.published_at).toISOString(), status: text(item.status) || 'published',
  })).sort((a, b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
}

// Shared by the trusted publishing workflow and live preview. Database IDs and
// enriched cover images deliberately do not affect this editorial-content hash.
export async function editionHash(date, items) {
  return digest(JSON.stringify({ date: validDate(date), items: canonicalItems(items) }));
}

async function liveEdition(env, date) {
  validDate(date);
  const manifest = await env.DB.prepare('SELECT schema_version, coverage, slugs FROM news_editions WHERE date = ?').bind(date).first();
  const { results: items = [] } = await env.DB.prepare("SELECT * FROM news WHERE status = 'published' AND date(published_at, '+8 hours') = ? ORDER BY published_at DESC, id DESC").bind(date).all();
  if (!manifest || !items.length || !await publishedCoverage(env, date, items)) {
    throw new RequestError('该日报尚未完整发布或清单不一致，不能创建补发。', 409);
  }
  const slugs = items.map(item => item.slug).sort();
  if (JSON.stringify(slugs) !== JSON.stringify(JSON.parse(manifest.slugs).sort())) {
    throw new RequestError('线上文章与日报清单不一致。', 409);
  }
  return { date, items, slugs, hash: await editionHash(date, items), schema_version: manifest.schema_version };
}

async function recipientFingerprint(channel, row) {
  const categories = normalizeCategories(JSON.parse(row.categories));
  return digest(JSON.stringify(channel === 'email' ? {
    channel, id: row.id, email: row.email, categories, version: row.token_version,
  } : {
    channel, id: row.id, webhook_hash: row.webhook_hash, categories, version: row.version,
    send_mode: normalizeSendMode(row.send_mode), mention_mode: row.mention_mode,
    mention_mobiles: JSON.parse(row.mention_mobiles),
  }));
}

async function audience(env) {
  const { results: email = [] } = await env.DB.prepare("SELECT * FROM newsletter_subscribers WHERE status = 'approved' AND email_verified_at IS NOT NULL ORDER BY id").all();
  const { results: robot = [] } = await env.DB.prepare("SELECT * FROM robot_subscribers WHERE status = 'approved' ORDER BY id").all();
  const rows = [];
  for (const [channel, subscribers] of [['email', email], ['robot', robot]]) {
    for (const row of subscribers) rows.push({ channel, row, fingerprint: await recipientFingerprint(channel, row) });
  }
  return { rows, hash: await digest(JSON.stringify(rows.map(entry => [entry.channel, entry.row.id, entry.fingerprint]))) };
}

export async function previewResendCampaign(env, { date } = {}) {
  const edition = await liveEdition(env, date);
  const recipients = await audience(env);
  const eligible = { email: 0, robot: 0 }, planned = { email: 0, robot: 0 };
  for (const { channel, row } of recipients.rows) {
    eligible[channel]++;
    planned[channel] += channel === 'email' || row.send_mode === 'single' ? 1 : normalizeCategories(JSON.parse(row.categories)).length;
  }
  const categoryCounts = {};
  for (const item of edition.items) categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  return {
    ok: true, date, campaign_id: `resend-${date}`, edition_hash: edition.hash, audience_hash: recipients.hash,
    slugs: edition.slugs, article_count: edition.items.length, category_counts: categoryCounts,
    eligible, planned_messages: planned, configured: { email: mailConfigured(env), robot: robotConfigured(env) },
  };
}

const emptyCounts = () => ({ total: 0, pending: 0, sending: 0, sent: 0, failed: 0, uncertain: 0, cancelled: 0, messages_sent: 0, total_messages: 0 });

export async function getResendCampaignStatus(env, { campaign_id: campaignId } = {}) {
  campaignDate(campaignId);
  const campaign = await env.DB.prepare('SELECT * FROM news_resend_campaigns WHERE campaign_id = ?').bind(campaignId).first();
  if (!campaign) throw new RequestError('补发批次不存在。', 404);
  const { results: rows = [] } = await env.DB.prepare(`SELECT channel, status, count(*) AS total,
    sum(next_part) AS messages_sent, sum(total_parts) AS total_messages
    FROM news_resend_jobs WHERE campaign_id = ? GROUP BY channel, status`).bind(campaignId).all();
  const counts = { email: emptyCounts(), robot: emptyCounts() };
  for (const row of rows) {
    const channel = counts[row.channel];
    channel.total += row.total; channel[row.status] += row.total;
    channel.messages_sent += row.messages_sent; channel.total_messages += row.total_messages;
  }
  const remaining = counts.email.pending + counts.email.sending + counts.robot.pending + counts.robot.sending;
  const issues = counts.email.failed + counts.email.uncertain + counts.email.cancelled + counts.robot.failed + counts.robot.uncertain + counts.robot.cancelled;
  const next = await env.DB.prepare(`SELECT min(max(next_attempt_at, lease_until)) AS at
    FROM news_resend_jobs WHERE campaign_id = ? AND status IN ('pending', 'sending')`).bind(campaignId).first();
  const { results: errorRows = [] } = await env.DB.prepare(`SELECT error AS code, count(*) AS count FROM news_resend_jobs
    WHERE campaign_id = ? AND error IS NOT NULL GROUP BY error`).bind(campaignId).all();
  return {
    ok: true, campaign_id: campaignId, date: campaign.edition_date, edition_hash: campaign.edition_hash,
    audience_hash: campaign.audience_hash, state: remaining ? 'in_progress' : issues ? 'completed_with_issues' : 'completed',
    completed: remaining === 0, counts, errors: errorRows,
    next_attempt_at: remaining ? Math.max(Date.now(), next?.at || 0, campaign.lease_until) : null,
    created_at: campaign.created_at, completed_at: campaign.completed_at,
  };
}

export async function startResendCampaign(env, { date, edition_hash: expectedHash, audience_hash: expectedAudience, slugs: expectedSlugs } = {}) {
  validDate(date);
  if (!/^[a-f0-9]{64}$/.test(expectedHash || '') || !/^[a-f0-9]{64}$/.test(expectedAudience || '') ||
      !Array.isArray(expectedSlugs) || expectedSlugs.some(slug => typeof slug !== 'string')) throw new RequestError('请提供已核对的完整日报与收件范围摘要。');
  const campaignId = `resend-${date}`;
  const existing = await env.DB.prepare('SELECT edition_hash, audience_hash, edition_snapshot FROM news_resend_campaigns WHERE campaign_id = ?').bind(campaignId).first();
  if (existing) {
    const frozenSlugs = JSON.parse(existing.edition_snapshot).map(item => item.slug).sort();
    if (existing.edition_hash !== expectedHash || existing.audience_hash !== expectedAudience ||
        JSON.stringify(frozenSlugs) !== JSON.stringify([...expectedSlugs].sort())) throw new RequestError('该日期已有补发批次，不能创建第二轮或替换其快照。', 409);
    return getResendCampaignStatus(env, { campaign_id: campaignId });
  }
  if (date !== today()) throw new RequestError('只能为北京时间当日创建补发。', 409);
  const edition = await liveEdition(env, date), recipients = await audience(env);
  if (edition.hash !== expectedHash || JSON.stringify(edition.slugs) !== JSON.stringify([...expectedSlugs].sort())) throw new RequestError('线上日报已变化，请重新核对后创建补发。', 409);
  if (recipients.hash !== expectedAudience) throw new RequestError('有效订阅范围已变化，请重新核对补发范围。', 409);
  if (recipients.rows.some(({ channel }) => channel === 'email' ? !mailConfigured(env) : !robotConfigured(env))) throw new RequestError('补发渠道尚未全部配置，未创建任何发送任务。', 503);
  const now = Date.now(), nonce = crypto.randomUUID();
  const statements = [env.DB.prepare(`INSERT INTO news_resend_campaigns
    (campaign_id, edition_date, edition_hash, audience_hash, edition_snapshot, creation_nonce, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(edition_date) DO NOTHING`)
    .bind(campaignId, date, edition.hash, recipients.hash, JSON.stringify(canonicalItems(edition.items)), nonce, now)];
  for (const { channel, row, fingerprint } of recipients.rows) {
    let payload, total;
    if (channel === 'email') {
      payload = await buildDigest(env, row, date, edition.items);
      payload.subject = payload.subject.replace('量仔每日前沿', '量仔每日前沿（更新补发）');
      payload.text = payload.text.replace('量仔每日前沿', '量仔每日前沿（更新补发）');
      payload.html = payload.html.replace('>量仔每日前沿</h1>', '>量仔每日前沿（更新补发）</h1>');
      total = 1;
    } else {
      payload = buildRobotDigest(date, edition.items, JSON.parse(row.categories), { mode: row.mention_mode, mobiles: JSON.parse(row.mention_mobiles) }, { send_mode: row.send_mode });
      for (const message of payload) message.textMsg.content = message.textMsg.content.replace('量仔每日前沿', '量仔每日前沿（更新补发）');
      total = payload.length;
    }
    statements.push(env.DB.prepare(`INSERT INTO news_resend_jobs
      (campaign_id, channel, subscriber_id, edition_date, subscription_version, categories, recipient_fingerprint, payload, delivery_id, total_parts, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM news_resend_campaigns WHERE campaign_id = ? AND creation_nonce = ?
      ON CONFLICT(campaign_id, channel, subscriber_id) DO NOTHING`)
      .bind(campaignId, channel, row.id, date, channel === 'email' ? row.token_version : row.version,
        row.categories, fingerprint, JSON.stringify(payload), crypto.randomUUID(), total, now, campaignId, nonce));
  }
  // D1 batches are transactions: a failed payload write must not leave a partly
  // frozen audience. The nonce also makes simultaneous start requests converge.
  await env.DB.batch(statements);
  const saved = await env.DB.prepare('SELECT edition_hash, audience_hash FROM news_resend_campaigns WHERE campaign_id = ?').bind(campaignId).first();
  if (saved.edition_hash !== expectedHash || saved.audience_hash !== expectedAudience) throw new RequestError('该日期已经存在另一份冻结的补发快照。', 409);
  return getResendCampaignStatus(env, { campaign_id: campaignId });
}

async function finishJob(env, job, status, { error = null, nextPart = job.next_part, nextAttempt = 0, providerId = null } = {}) {
  await env.DB.prepare(`UPDATE news_resend_jobs SET status = ?, error = ?, next_part = ?, next_attempt_at = ?,
    lease_until = 0, lease_token = NULL, provider_id = COALESCE(?, provider_id), sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END
    WHERE campaign_id = ? AND channel = ? AND subscriber_id = ? AND status = 'sending' AND lease_token = ?`)
    .bind(status, error, nextPart, nextAttempt, providerId, status, Date.now(), job.campaign_id, job.channel, job.subscriber_id, job.lease_token).run();
}

async function currentRecipient(env, job) {
  const table = job.channel === 'email' ? 'newsletter_subscribers' : 'robot_subscribers';
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(job.subscriber_id).first();
  if (!row || row.status !== 'approved' || (job.channel === 'email' && !row.email_verified_at)) return null;
  try { return await recipientFingerprint(job.channel, row) === job.recipient_fingerprint ? row : null; }
  catch { return null; }
}

async function sendEmailJob(env, job) {
  if (Date.now() - job.created_at >= RETRY_WINDOW_MS || job.attempts >= 5) {
    await finishJob(env, job, job.attempts ? 'uncertain' : 'failed', { error: 'mail_retry_window_exhausted' });
    return 0;
  }
  if (!mailConfigured(env)) {
    await finishJob(env, job, 'pending', { error: 'mail_not_configured', nextAttempt: Date.now() + 60000 });
    return 0;
  }
  const normal = await env.DB.prepare("SELECT id FROM newsletter_deliveries WHERE subscriber_id = ? AND edition_date = ? AND status = 'sending' AND lease_until > ?").bind(job.subscriber_id, job.edition_date, Date.now()).first();
  if (normal) {
    await finishJob(env, job, 'pending', { error: 'waiting_daily_delivery', nextAttempt: Date.now() + 15000 });
    return 0;
  }
  if (!await currentRecipient(env, job)) {
    await finishJob(env, job, 'cancelled', { error: 'subscription_changed' });
    return 0;
  }
  await env.DB.prepare("UPDATE news_resend_jobs SET attempts = attempts + 1 WHERE campaign_id = ? AND channel = 'email' AND subscriber_id = ? AND lease_token = ?")
    .bind(job.campaign_id, job.subscriber_id, job.lease_token).run();
  try {
    const providerId = await sendMail(env, JSON.parse(job.payload), `newsletter-resend/${job.campaign_id}/${job.subscriber_id}`);
    await finishJob(env, job, 'sent', { nextPart: 1, providerId });
  } catch {
    // A failed acknowledgement may already represent accepted mail. Retry only
    // this exact payload/key, and stop before Resend's 24-hour key lifetime.
    await finishJob(env, job, job.attempts + 1 >= 5 ? 'uncertain' : 'pending', {
      error: 'mail_provider_unconfirmed', nextAttempt: Date.now() + 60000,
    });
  }
  return 1;
}

async function sendRobotJob(env, job, row) {
  if (!robotConfigured(env)) {
    await finishJob(env, job, 'pending', { error: 'robot_not_configured', nextAttempt: Date.now() + 60000 });
    return 0;
  }
  // An abandoned earlier manual batch must not keep the subscriber's unique
  // active-job slot forever. Preserve its history as uncertain; this campaign
  // neither replays it nor revives its unanswered request. Our own confirmed
  // pending boundary is deliberately excluded so a later step can continue.
  await env.DB.prepare(`UPDATE robot_manual_deliveries SET status = 'uncertain', error = 'lease_expired', lease_until = 0
    WHERE subscriber_id = ? AND send_id != ? AND status IN ('pending','sending') AND lease_until <= ?`)
    .bind(row.id, job.delivery_id, Date.now()).run();
  let manual = await env.DB.prepare('SELECT * FROM robot_manual_deliveries WHERE send_id = ?').bind(job.delivery_id).first();
  if (!manual) {
    const now = Date.now();
    await env.DB.prepare(`INSERT INTO robot_manual_deliveries (send_id, subscriber_id, edition_date, version, payload, lease_until, created_at)
      SELECT ?, id, ?, version, ?, ?, ? FROM robot_subscribers WHERE id = ? AND status = 'approved' AND version = ?
      AND NOT EXISTS (SELECT 1 FROM robot_manual_deliveries WHERE subscriber_id = ? AND status IN ('pending','sending'))
      AND NOT EXISTS (SELECT 1 FROM robot_subscription_deliveries WHERE subscriber_id = ? AND status = 'sending' AND lease_until > ?)
      ON CONFLICT(send_id) DO NOTHING`)
      .bind(job.delivery_id, job.edition_date, job.payload, now + 300000, now, row.id, row.version, row.id, row.id, now).run();
    manual = await env.DB.prepare('SELECT * FROM robot_manual_deliveries WHERE send_id = ?').bind(job.delivery_id).first();
    if (!manual) {
      await finishJob(env, job, 'pending', { error: 'waiting_robot_delivery', nextAttempt: Date.now() + 15000 });
      return 0;
    }
  }
  if (manual.subscriber_id !== row.id || manual.version !== job.subscription_version || manual.edition_date !== job.edition_date || manual.payload !== job.payload) {
    await finishJob(env, job, 'uncertain', { error: 'robot_snapshot_mismatch' });
    return 0;
  }
  if (TERMINAL.has(manual.status)) {
    await finishJob(env, job, manual.status, { nextPart: manual.next_part, error: manual.status === 'sent' ? null : `robot_${manual.status}` });
    return 0;
  }
  if (manual.status === 'sending') {
    if (manual.lease_until > Date.now()) {
      await finishJob(env, job, 'pending', { error: 'waiting_robot_acknowledgement', nextAttempt: manual.lease_until });
    } else {
      await env.DB.prepare("UPDATE robot_manual_deliveries SET status = 'uncertain', error = 'lease_expired', lease_until = 0 WHERE send_id = ? AND status = 'sending' AND lease_until <= ?").bind(job.delivery_id, Date.now()).run();
      await finishJob(env, job, 'uncertain', { nextPart: manual.next_part, error: 'robot_delivery_unconfirmed' });
    }
    return 0;
  }
  if (manual.next_part < job.next_part || manual.next_part >= job.total_parts) {
    await finishJob(env, job, 'uncertain', { error: 'robot_progress_mismatch' });
    return 0;
  }
  // Pending is a positively recorded boundary between parts, with no request
  // in flight. Renew only that boundary; never revive sending or uncertain work.
  await env.DB.prepare("UPDATE robot_manual_deliveries SET lease_until = ? WHERE send_id = ? AND status = 'pending' AND next_part = ?")
    .bind(Date.now() + 300000, job.delivery_id, manual.next_part).run();
  try {
    const result = await sendManualRobotDigest(env, row.id, {
      send_id: job.delivery_id, part: manual.next_part, version: job.subscription_version, date: job.edition_date,
    });
    const saved = await env.DB.prepare('SELECT status, next_part FROM robot_manual_deliveries WHERE send_id = ?').bind(job.delivery_id).first();
    await finishJob(env, job, saved.status === 'pending' ? 'pending' : saved.status, {
      nextPart: saved.next_part, error: result.ok ? null : saved.status === 'uncertain' ? 'robot_delivery_unconfirmed' : 'robot_provider_rejected',
    });
    return result.duplicate ? 0 : 1;
  } catch {
    const saved = await env.DB.prepare('SELECT status, next_part FROM robot_manual_deliveries WHERE send_id = ?').bind(job.delivery_id).first();
    if (saved?.status === 'sent' || saved?.status === 'pending') {
      const progressed = saved.next_part > manual.next_part;
      await finishJob(env, job, saved.status, { nextPart: saved.next_part,
        error: progressed || saved.status === 'sent' ? null : 'robot_preflight_failed',
        nextAttempt: progressed || saved.status === 'sent' ? 0 : Date.now() + 60000,
      });
    } else if (saved?.status === 'cancelled') {
      await finishJob(env, job, 'cancelled', { error: 'subscription_changed', nextPart: saved.next_part });
    } else {
      await env.DB.prepare("UPDATE robot_manual_deliveries SET status = 'uncertain', error = 'campaign_delivery_unconfirmed', lease_until = 0 WHERE send_id = ? AND status = 'sending'").bind(job.delivery_id).run();
      await finishJob(env, job, 'uncertain', { error: 'robot_delivery_unconfirmed', nextPart: saved?.next_part || job.next_part });
    }
    return 1;
  }
}

export async function stepResendCampaign(env, { campaign_id: campaignId, limit = 2 } = {}) {
  const date = campaignDate(campaignId);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new RequestError('每批补发数量须为 1 至 5。');
  if (date !== today()) throw new RequestError('补发日期已变化，已停止继续发送。', 409);
  const lease = crypto.randomUUID(), now = Date.now();
  const campaign = await env.DB.prepare(`UPDATE news_resend_campaigns SET lease_token = ?, lease_until = ?
    WHERE campaign_id = ? AND lease_until <= ? RETURNING *`).bind(lease, now + LEASE_MS, campaignId, now).first();
  if (!campaign) return getResendCampaignStatus(env, { campaign_id: campaignId });
  let attempted = 0;
  try {
    const { results: jobs = [] } = await env.DB.prepare(`SELECT channel, subscriber_id FROM news_resend_jobs
      WHERE campaign_id = ? AND status IN ('pending', 'sending') AND next_attempt_at <= ? AND lease_until <= ?
      ORDER BY created_at, channel, subscriber_id LIMIT 30`).bind(campaignId, now, now).all();
    for (const candidate of jobs) {
      if (attempted >= limit || Date.now() - now >= 35000) break;
      const jobLease = crypto.randomUUID();
      const job = await env.DB.prepare(`UPDATE news_resend_jobs SET status = 'sending', lease_token = ?, lease_until = ?
        WHERE campaign_id = ? AND channel = ? AND subscriber_id = ? AND status IN ('pending','sending')
        AND lease_until <= ? AND next_attempt_at <= ? RETURNING *`)
        .bind(jobLease, Date.now() + LEASE_MS, campaignId, candidate.channel, candidate.subscriber_id, Date.now(), Date.now()).first();
      if (!job) continue;
      const row = await currentRecipient(env, job);
      if (!row) {
        await finishJob(env, job, 'cancelled', { error: 'subscription_changed' });
        await env.DB.prepare("UPDATE robot_manual_deliveries SET status = 'cancelled', lease_until = 0 WHERE send_id = ? AND status = 'pending'").bind(job.delivery_id).run();
        continue;
      }
      if (attempted && job.channel === 'email') await pause(550);
      attempted += job.channel === 'email' ? await sendEmailJob(env, job) : await sendRobotJob(env, job, row);
    }
    await env.DB.prepare(`UPDATE news_resend_campaigns SET completed_at = COALESCE(completed_at, ?)
      WHERE campaign_id = ? AND NOT EXISTS (SELECT 1 FROM news_resend_jobs WHERE campaign_id = ? AND status IN ('pending','sending'))`)
      .bind(Date.now(), campaignId, campaignId).run();
  } finally {
    await env.DB.prepare('UPDATE news_resend_campaigns SET lease_until = 0, lease_token = NULL WHERE campaign_id = ? AND lease_token = ?').bind(campaignId, lease).run();
  }
  return { ...await getResendCampaignStatus(env, { campaign_id: campaignId }), attempted };
}
