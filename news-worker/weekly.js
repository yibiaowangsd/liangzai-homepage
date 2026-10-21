import { CORE_CATEGORIES, beijingDate } from './edition.js';
import { PRIORITIES } from './priority.js';
import { sendRobotDigest } from './robot.js';
import { sendDailyDigest } from './subscriptions.js';

const DAY = 86400000;
export function weeklyWindow(date) {
  const end = new Date(`${date}T08:10:00+08:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(end.getTime()) || beijingDate(end) !== date || end.getUTCDay() !== 5) {
    throw new Error('weekly date must be a valid Friday');
  }
  return { period_start: new Date(end.getTime() - 7 * DAY).toISOString(), period_end: end.toISOString() };
}

export function validateWeeklyReport(report) {
  if (!report || report.schema_version !== 1 || report.kind !== 'weekly') throw new Error('unsupported weekly report schema');
  const window = weeklyWindow(report.date);
  for (const field of ['period_start', 'period_end']) {
    if (typeof report[field] !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(report[field]) || !Number.isFinite(Date.parse(report[field])) || new Date(report[field]).toISOString() !== window[field]) throw new Error(`weekly ${field} must match Friday 08:10 Beijing window`);
  }
  if (typeof report.summary !== 'string' || report.summary.trim().length < 80 || report.summary.length > 2000) throw new Error('weekly summary must contain 80–2000 characters');
  if (!Array.isArray(report.items) || !report.items.length || report.items.length > 40) throw new Error('weekly items must contain 1–40 events');
  const slugs = new Set(), sources = new Set(), counts = Object.fromEntries(CORE_CATEGORIES.map(key => [key, 0]));
  for (const item of report.items) {
    if (!new RegExp(`^${report.date.replaceAll('-', '')}-weekly-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(item.slug) || slugs.has(item.slug)) throw new Error('weekly items must have unique dated weekly slugs');
    slugs.add(item.slug);
    if (!Object.hasOwn(counts, item.category) || ++counts[item.category] > 5) throw new Error('weekly items must use eight desks with at most five events each');
    if (!Object.hasOwn(PRIORITIES, item.priority) || typeof item.priority_reason !== 'string' || item.priority_reason.trim().length < 8 || item.priority_reason.length > 300) throw new Error('weekly items must include priority P1/P2/P3 and its reason');
    if (typeof item.front_page !== 'boolean' || (item.front_page && item.priority === 'P3')) throw new Error('weekly front_page must be boolean and headline priority must be P1 or P2');
    for (const field of ['title', 'summary', 'content', 'source_name']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`weekly items ${field} is required`);
    }
    if (item.title.length > 300 || item.summary.length < 40 || item.summary.length > 500 || item.content.length < (item.category === 'flash' ? 80 : 600) || item.content.length > 12000) throw new Error('weekly items must contain substantial bounded content');
    const source = new URL(item.source_url);
    if (source.protocol !== 'https:' || source.username || source.password || source.href.length > 2048 || sources.has(source.href)) throw new Error('weekly items must have unique HTTPS primary sources of at most 2048 characters');
    sources.add(source.href);
    const event = Date.parse(item.event_at);
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(item.event_at) || !Number.isFinite(event) || event < Date.parse(window.period_start) || event >= Date.parse(window.period_end)) throw new Error('weekly event_at must belong to the half-open seven day window');
  }
  if (!report.coverage || Object.keys(report.coverage).length !== CORE_CATEGORIES.length) throw new Error('weekly coverage must include all eight desks');
  for (const category of CORE_CATEGORIES) {
    const coverage = report.coverage[category];
    if (coverage?.count !== counts[category] || typeof coverage.note !== 'string' || coverage.note.trim().length < 12 || coverage.note.length > 600) throw new Error('weekly coverage must match events and describe actual checks');
  }
  return report;
}

export async function publishWeeklyReport(env, report) {
  validateWeeklyReport(report);
  await env.DB.prepare(`INSERT INTO news_weekly_reports (date, report) VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET report = excluded.report, updated_at = datetime('now')`).bind(report.date, JSON.stringify(report)).run();
  return { ok: true, date: report.date, total: report.items.length, headlines: report.items.filter(item => item.front_page).length };
}

export async function readWeeklyReport(env, date = null) {
  const row = await (date
    ? env.DB.prepare('SELECT report FROM news_weekly_reports WHERE date = ?').bind(date)
    : env.DB.prepare('SELECT report FROM news_weekly_reports ORDER BY date DESC LIMIT 1')).first();
  return row ? JSON.parse(row.report) : null;
}

export async function sendWeeklyReport(env, now = new Date(), options = {}) {
  // Saturday retries can finish a late Friday edition; no historical bulk send.
  const local = new Date(now.getTime() + 8 * 3600000);
  const day = local.getUTCDay();
  if (![5, 6].includes(day) || (day === 5 && local.getUTCHours() * 60 + local.getUTCMinutes() < 490)) return { ok: true, sent: 0, waiting: true };
  const friday = beijingDate(new Date(now.getTime() - (day === 6 ? DAY : 0)));
  const report = await readWeeklyReport(env, friday);
  if (!report) return { ok: true, sent: 0, waiting: true, date: friday };
  const robot = await sendRobotDigest(env, friday, { ...options, report });
  const email = await sendDailyDigest(env, friday, { report });
  return { ok: robot.ok && email.ok && !email.failed, date: friday, robot, email };
}
