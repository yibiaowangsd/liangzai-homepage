import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

// Exercise the actual production CSS/chunks, without a live news or deployment dependency.
const edition = JSON.parse(await readFile(new URL('../news/inbox/2026-10-03.json', import.meta.url), 'utf8'));
const items = edition.items.map((item, index) => ({
  ...item, id: index + 1, tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags),
  cover_image: `/news-covers/${item.category}.svg`,
}));
function newsResponse(input) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.pathname.endsWith('/featured')) return Response.json({ edition_date: edition.date, data: items.slice(0, 6) });
  if (url.pathname.endsWith('/editions')) {
    const topics = Object.groupBy(items, item => item.category);
    return Response.json({ data: [{ date: edition.date, total: items.length, topics }], meta: { page: 1, pageSize: 1, totalDays: 1, totalPages: 1 } });
  }
  const item = items.find(item => item.slug === decodeURIComponent(url.pathname.split('/').at(-1)));
  return item ? Response.json(item) : new Response(null, { status: 404 });
}
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  return url.startsWith('https://api.wangyibiao.com/api/news') ? Promise.resolve(newsResponse(input)) : nativeFetch(input, init);
};
const { default: worker } = await import('../dist/server/index.js');
const clientRoot = resolve('dist/client');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg' };
async function asset(input) {
  const file = resolve(clientRoot, '.' + decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname));
  if (!file.startsWith(clientRoot + sep)) return new Response(null, { status: 404 });
  try {
    if (!(await stat(file)).isFile()) return new Response(null, { status: 404 });
    return new Response(await readFile(file), { headers: { 'Content-Type': types[extname(file)] || 'application/octet-stream' } });
  } catch (error) {
    if (error.code === 'ENOENT') return new Response(null, { status: 404 });
    throw error;
  }
}
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, { headers: incoming.headers });
    const file = await asset(request);
    const response = file.status === 404 ? await worker.fetch(request, { ASSETS: { fetch: asset } }, { waitUntil(promise) { void promise.catch(console.error); }, passThroughOnException() {} }) : file;
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const output = resolve('outputs/subscriptions');
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch(process.env.SUBSCRIPTIONS_BROWSER_PATH ? { executablePath: process.env.SUBSCRIPTIONS_BROWSER_PATH } : {});
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests = [];
  let approved = false;
  let mailReady = true;
  let applications = [
    { id: 'test-application', email: 'reader@example.com', categories: '["pqc","protocol","ai"]', applicant_name: '研究读者', reason: '关注抗量子协议的实现与迁移，希望持续跟进标准和开源进展。', status: 'pending', created_at: '2026-10-09 04:00:00', email_verified_at: null },
    { id: 'test-long-email', email: 'reader.with.a.long.address@example.com', categories: '["security","standards"]', applicant_name: '工程读者', reason: '跟进密码与网络安全的实践进展。', status: 'pending', created_at: '2026-10-09 03:00:00', email_verified_at: null },
    { id: 'test-verified', email: 'verified@example.com', categories: '["ai"]', applicant_name: '已确认读者', reason: '研究学习', status: 'approved', created_at: '2026-10-08 04:00:00', email_verified_at: '2026-10-08 05:00:00' },
    { id: 'test-waiting', email: 'waiting@example.com', categories: '["pqc"]', applicant_name: '待确认读者', reason: '研究学习', status: 'approved', created_at: '2026-10-08 03:00:00', email_verified_at: null },
  ];
  const reviewRequests = [];
  const confirmationEmail = 'reader.with.a.long.address@example.com';
  let confirmed = false;
  await context.route('https://api.wangyibiao.com/api/subscriptions**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/confirm')) {
      if (url.searchParams.get('token') === 'invalid-token') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: '链接无效或已过期，请联系管理员重新发送确认邮件。' }) }); return;
      }
      if (request.method() === 'POST') { requests.push({ url: request.url(), body: request.postDataJSON() }); confirmed = true; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: confirmationEmail, categories: ['ai', 'pqc'], email_verified: confirmed, message: '邮箱已确认，订阅已启用。' }) }); return;
    }
    if (request.method() === 'POST') requests.push({ url: request.url(), body: request.postDataJSON() });
    await route.fulfill({ status: 202, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base }, body: JSON.stringify({ ok: true, message: '申请已提交，审核通过后将向邮箱发送确认链接。' }) });
  });
  await context.route('https://api.wangyibiao.com/api/admin/subscriptions**', async route => {
    const request = route.request();
    if (request.headers().authorization !== 'Bearer test-review') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: '审核口令不正确。' }) }); return;
    }
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      reviewRequests.push({ url: request.url(), body: request.postDataJSON() });
      const [, id, action] = url.pathname.match(/\/subscriptions\/([^/]+)\/([^/]+)$/) || [];
      const row = applications.find(row => row.id === id);
      if (action === 'approve') { approved = true; row.status = 'approved'; }
      if (action === 'reject') { row.status = 'rejected'; row.review_note = request.postDataJSON().note; }
      await route.fulfill({ headers: { 'Access-Control-Allow-Origin': base }, contentType: 'application/json', body: JSON.stringify({ ok: true, message: action === 'resend' ? '确认邮件已重发。' : action === 'reject' ? '已拒绝申请。' : '已通过审核，等待邮箱确认。' }) }); return;
    }
    const status = url.searchParams.get('status');
    const pageNumber = Number(url.searchParams.get('page') || 1);
    const filtered = applications.filter(row => status === 'all' || row.status === status);
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': base }, contentType: 'application/json', body: JSON.stringify({ mail_ready: mailReady, total: filtered.length, page: pageNumber, data: filtered.slice((pageNumber - 1) * 50, pageNumber * 50) }) });
  });
  const robotRequests = [];
  const robotReviews = [];
  const robotApplication = { id: '24ff3dea-6ec3-4c8e-a5ea-9b5d4a3e7a81', webhook_display: 'imtwo.zdxlz.com · key …demo', categories: '["pqc","ai"]', applicant_name: '密码研究交流群（示例）', reason: '希望让群成员持续跟进密码标准与 AI 研究。', status: 'pending', created_at: '2026-10-09 08:00:00', mention_mode: 'none', mention_mobiles: '[]' };
  await context.route('https://api.wangyibiao.com/api/robot-subscriptions', async route => {
    robotRequests.push(route.request().postDataJSON());
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, message: '机器人订阅申请已提交。管理员审核通过后启用定时推送。' }) });
  });
  await context.route('https://api.wangyibiao.com/api/admin/robot-subscriptions**', async route => {
    const request = route.request();
    if (request.headers().authorization !== 'Bearer test-review') { await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"审核口令不正确。"}' }); return; }
    if (request.method() === 'POST') {
      const body = request.postDataJSON(); const action = new URL(request.url()).pathname.split('/').at(-1); robotReviews.push({ action, body });
      if (action === 'send') {
        assert.ok(Number.isInteger(body.part)); assert.match(body.send_id, /^[a-f0-9-]{36}$/);
        const next = body.part + 1;
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, sent: 1, more: next < 2, next_part: next, total: 2, version: 'example-approved-version', date: '2026-10-09', message: next < 2 ? '本次已发送 1 / 2 条，正在继续…' : '本次当日日报已发送，共 2 条消息。再次点击可重新发送。' }) }); return;
      }
      robotApplication.status = action === 'reject' ? 'rejected' : 'approved';
      if (action !== 'reject') { robotApplication.mention_mode = body.mention_mode; robotApplication.mention_mobiles = JSON.stringify(body.mention_mobiles); }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, message: action === 'mentions' ? '@ 成员配置已更新，下一份日报生效。' : action === 'reject' ? '已拒绝申请并停止后续推送。' : '已通过审核，完整日报发布后自动推送。' }) }); return;
    }
    const status = new URL(request.url()).searchParams.get('status');
    const data = status === 'all' || robotApplication.status === status ? [robotApplication] : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ robot_ready: true, data, total: data.length, page: 1 }) });
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/news?category=ai', { waitUntil: 'networkidle' });
    const subscriptionEntry = page.getByRole('link', { name: '订阅日报' });
    assert.equal(await subscriptionEntry.isVisible(), true);
    assert.equal(await subscriptionEntry.getAttribute('href'), '/news/subscribe?category=ai');
    const entryBounds = await subscriptionEntry.boundingBox();
    assert.ok(entryBounds.y + entryBounds.height < 900, 'Subscription entry is in the first viewport');
    assert.ok(entryBounds.height >= 44, 'Subscription entry has a comfortable tap target');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `News subscription entry fits ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `news-entry-${width}.png`), fullPage: false });
    const response = await page.goto(base + '/news/subscribe?category=ai', { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: '提交订阅申请' }).waitFor();
    assert.equal(await page.locator('.subscription-categories input:checked').count(), 1);
    assert.equal(await page.locator('input[name=categories][value=ai]').isChecked(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No horizontal overflow at ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `subscribe-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题').selectOption('midnight');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'midnight');
  const colors = await page.locator('.subscription-primary').evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
  assert.equal(colors.foreground, 'rgb(16, 24, 32)', 'Night theme keeps dark text on the light accent button');
  assert.equal(colors.background, 'rgb(159, 180, 255)');
  assert.equal(await page.locator('.subscription-categories strong').first().evaluate(element => getComputedStyle(element).color), 'rgb(242, 245, 247)', 'Night theme keeps section labels readable');
  assert.equal(await page.locator('.subscription-field-label').evaluate(element => getComputedStyle(element).color), 'rgb(242, 245, 247)', 'Night theme keeps the name label readable');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: resolve(output, 'subscribe-midnight.png'), fullPage: true });
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题').selectOption('paper');
  await page.keyboard.press('Escape');
  await page.getByLabel('邮箱地址').fill('reader@example.com');
  await page.getByLabel('申请理由').fill('研究学习');
  await page.locator('input[name=categories][value=pqc]').check();
  await page.locator('input[name=consent]').check();
  await page.getByRole('button', { name: '提交订阅申请' }).click();
  await page.getByRole('status').filter({ hasText: '申请已提交' }).waitFor();
  assert.deepEqual(requests[0].body.categories, ['ai', 'pqc']);
  assert.equal(requests[0].body.consent, true);
  assert.equal(await page.getByRole('button', { name: '提交订阅申请' }).count(), 0);
  assert.equal(await page.locator('.subscription-recipient strong').innerText(), 'reader@example.com', 'Application receipt displays the entered email');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/news/subscribe?action=confirm&token=test-token', { waitUntil: 'networkidle' });
    assert.equal(requests.length, 1, 'GET confirmation link cannot activate a subscription');
    assert.equal(await page.locator('.subscription-recipient strong').innerText(), confirmationEmail);
    assert.match(await page.locator('.subscription-topic-summary').innerText(), /AI 前沿/);
    assert.match(await page.locator('.subscription-topic-summary').innerText(), /后量子密码/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Confirmation email fits ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `confirm-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '确认邮箱并启用订阅' }).click();
  await page.getByRole('status').filter({ hasText: '邮箱已确认' }).waitFor();
  assert.match(requests[1].url, /subscriptions\/confirm$/);
  assert.equal(await page.locator('.subscription-recipient strong').innerText(), confirmationEmail, 'Confirmed receipt retains the recipient email');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('button', { name: '确认邮箱并启用订阅' }).count(), 0, 'Already verified email needs no repeat confirmation');
  await page.goto(base + '/news/subscribe?action=confirm&token=invalid-token', { waitUntil: 'networkidle' });
  await page.getByRole('alert').filter({ hasText: '链接无效或已过期' }).waitFor();
  assert.equal(await page.locator('.subscription-recipient').count(), 0, 'Invalid link exposes no email');
  assert.equal(await page.getByRole('button', { name: '确认邮箱并启用订阅' }).isEnabled(), false);
  await page.goto(base + '/news/subscribe?action=confirm', { waitUntil: 'networkidle' });
  await page.getByRole('alert').filter({ hasText: '链接不完整' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '确认邮箱并启用订阅' }).isEnabled(), false);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.portal-subscribe-button').getAttribute('href'), '/news/subscribe');
  await page.goto(base + '/news/subscriptions/review', { waitUntil: 'networkidle' });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Review login fits the viewport');
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `review-login-${width}.png`), fullPage: true });
  }
  await page.getByLabel('管理员审核口令').fill('incorrect-test-secret');
  await page.getByRole('button', { name: '进入审核', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '审核口令不正确' }).waitFor();
  assert.equal(await page.locator('.review-application').count(), 0, 'Invalid credentials reveal no applications');
  await page.getByLabel('管理员审核口令').fill('test-review');
  await page.getByRole('button', { name: '进入审核' }).click();
  await page.getByRole('heading', { name: 'reader@example.com', exact: true }).waitFor();
  assert.equal(await page.locator('.review-application').count(), 2);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Review workbench fits the viewport');
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `review-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题', { exact: true }).selectOption('midnight');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: resolve(output, 'review-midnight-1440.png'), fullPage: true });
  assert.equal(await page.locator('.review-application-heading h2').first().evaluate(el => getComputedStyle(el).color), 'rgb(242, 245, 247)', 'Review email is readable in midnight theme');
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题', { exact: true }).selectOption('paper');
  await page.keyboard.press('Escape');
  const application = page.locator('.review-application').filter({ has: page.getByRole('heading', { name: 'reader@example.com', exact: true }) });
  await application.getByRole('button', { name: '拒绝申请', exact: true }).click();
  await application.getByRole('button', { name: '确认拒绝', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '请填写拒绝理由' }).waitFor();
  assert.equal(reviewRequests.length, 0, 'Rejection without a reason sends no request');
  await application.getByRole('button', { name: '取消', exact: true }).click();
  await application.getByRole('button', { name: '通过申请', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '已通过审核' }).waitFor();
  assert.equal(approved, true);
  await page.getByRole('button', { name: '已通过', exact: true }).click();
  await page.getByRole('heading', { name: 'verified@example.com', exact: true }).waitFor();
  assert.equal(await page.locator('.review-application').count(), 3);
  await application.getByRole('button', { name: '重发确认邮件', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '确认邮件已重发' }).waitFor();
  assert.match(reviewRequests.at(-1).url, /\/resend$/);
  const verified = page.locator('.review-application').filter({ has: page.getByRole('heading', { name: 'verified@example.com', exact: true }) });
  assert.equal(await verified.getByRole('button', { name: '重发确认邮件', exact: true }).count(), 0, 'Verified subscriber needs no confirmation resend');
  await verified.getByRole('button', { name: '撤销批准并停止发送', exact: true }).click();
  await verified.getByLabel('拒绝理由').fill('测试撤销原因');
  await verified.getByRole('button', { name: '确认撤销', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '已拒绝申请' }).waitFor();
  assert.equal(reviewRequests.at(-1).body.note, '测试撤销原因');
  await page.getByRole('button', { name: '已拒绝', exact: true }).click();
  await page.getByText('测试撤销原因', { exact: true }).waitFor();
  await page.getByRole('button', { name: '已退订', exact: true }).click();
  await page.getByRole('heading', { name: '暂无已退订申请', exact: true }).waitFor();
  mailReady = false;
  await page.getByRole('button', { name: '待审核', exact: true }).click();
  await page.getByRole('heading', { name: 'reader.with.a.long.address@example.com', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '通过申请', exact: true }).isEnabled(), false, 'Missing mail service blocks approval');
  assert.equal(await page.getByRole('button', { name: '发送当日日报', exact: true }).isEnabled(), false, 'Missing mail service blocks delivery');
  mailReady = true;
  applications = Array.from({ length: 51 }, (_, i) => ({ id: `page-test-${i}`, email: `page-${i}@example.com`, categories: '["ai"]', applicant_name: '分页测试', reason: '测试申请', status: 'pending', created_at: '2026-10-09 04:00:00', email_verified_at: null }));
  await page.getByRole('button', { name: '刷新列表', exact: true }).click();
  await page.getByRole('heading', { name: 'page-0@example.com', exact: true }).waitFor();
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await page.getByRole('heading', { name: 'page-50@example.com', exact: true }).waitFor();
  assert.equal(await page.locator('.review-application').count(), 1);
  assert.equal(await page.getByRole('button', { name: '下一页', exact: true }).isEnabled(), false);
  await page.getByRole('button', { name: '上一页', exact: true }).click();
  await page.getByRole('heading', { name: 'page-0@example.com', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => String(value).includes('test-review'))), false, 'Review credentials stay out of browser storage');
  await page.getByRole('button', { name: '退出', exact: true }).click();
  assert.equal(await page.getByLabel('管理员审核口令').inputValue(), '');
  await page.goto(base + '/news/subscribe?category=ai', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: /群机器人/ }).check();
  assert.equal(await page.getByLabel('邮箱地址').count(), 0, 'Robot channel has no email requirement');
  assert.equal(await page.getByLabel('成员手机号').count(), 0, 'Applicants cannot configure mentions');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Robot form fits ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `robot-subscribe-${width}.png`), fullPage: true });
  }
  await page.getByLabel('机器人 webhook 地址').fill('https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=example-only-demo');
  await page.getByLabel('群名称 / 申请人称呼').fill('研究交流群');
  await page.getByLabel('申请理由').fill('研究学习');
  await page.locator('input[name=consent]').check();
  await page.getByRole('button', { name: '提交订阅申请' }).click();
  await page.getByRole('status').filter({ hasText: '机器人订阅申请已提交' }).waitFor();
  assert.equal(robotRequests[0].webhook.includes('example-only-demo'), true);
  assert.deepEqual(robotRequests[0].categories, ['ai']);
  assert.equal(robotRequests[0].email, undefined); assert.equal(robotRequests[0].mention_mode, undefined);
  assert.equal(await page.locator('.subscription-recipient strong').innerText(), '研究交流群');
  assert.equal((await page.locator('body').innerText()).includes('example-only-demo'), false, 'Receipt does not expose webhook credential');
  await page.goto(base + '/news/subscriptions/review', { waitUntil: 'networkidle' });
  await page.getByLabel('管理员审核口令').fill('test-review');
  await page.getByRole('button', { name: '进入审核', exact: true }).click();
  await page.getByRole('button', { name: '群机器人', exact: true }).click();
  await page.getByRole('heading', { name: 'imtwo.zdxlz.com · key …demo', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '立刻发送', exact: true }).count(), 0, 'Pending robots cannot send manually');
  await page.getByRole('button', { name: '配置并审核', exact: true }).click();
  await page.getByLabel('提醒方式').selectOption('members');
  await page.getByLabel('成员手机号').fill('13800000000\n13900000000');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Robot review fits ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `robot-review-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题', { exact: true }).selectOption('midnight'); await page.keyboard.press('Escape');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: resolve(output, 'robot-review-midnight.png'), fullPage: true });
  await page.getByRole('button', { name: '通过并启用', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '已通过审核' }).waitFor();
  assert.deepEqual(robotReviews[0].body.mention_mobiles, ['13800000000', '13900000000']);
  await page.getByRole('button', { name: '已通过', exact: true }).click();
  await page.getByText('指定成员：13800000000、13900000000', { exact: true }).waitFor();
  await page.getByRole('button', { name: '立刻发送', exact: true }).waitFor();
  await page.getByRole('button', { name: '打开显示设置' }).click();
  await page.getByLabel('页面主题', { exact: true }).selectOption('paper'); await page.keyboard.press('Escape');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Immediate send controls fit ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `robot-send-${width}.png`), fullPage: true });
  }
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent === '立刻发送');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.getByRole('status').filter({ hasText: '当日日报已发送，共 2 条消息' }).waitFor();
  assert.equal(robotReviews.filter(r => r.action === 'send').length, 2, 'One button confirms each message and completes the digest');
  const firstBatch = robotReviews.filter(r => r.action === 'send');
  assert.equal(firstBatch[0].body.send_id, firstBatch[1].body.send_id, 'All parts of one click share a send id');
  assert.deepEqual(firstBatch.map(r => ({ ...r.body, send_id: undefined })), [{ part: 0, send_id: undefined }, { part: 1, version: 'example-approved-version', date: '2026-10-09', send_id: undefined }]);
  robotApplication.delivery_status = 'uncertain'; robotApplication.delivery_error = 'legacy_delivery'; robotApplication.next_part = 0;
  robotApplication.delivery_message = '今日旧版自动推送结果未确认。后台可立刻发送完整日报。';
  await page.getByRole('button', { name: '刷新列表', exact: true }).click();
  await page.locator('.review-console[aria-busy="false"]').waitFor();
  assert.equal(await page.getByRole('button', { name: '立刻发送', exact: true }).isEnabled(), true);
  assert.equal(await page.getByRole('button', { name: '核对后重试', exact: true }).count(), 0);
  const beforeRepeat = robotReviews.length;
  await page.getByRole('button', { name: '立刻发送', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '当日日报已发送，共 2 条消息' }).waitFor();
  assert.deepEqual(robotReviews.slice(beforeRepeat).map(r => r.body.part), [0, 1], 'Another click resends all boards without recovery confirmation');
  assert.notEqual(robotReviews[beforeRepeat].body.send_id, firstBatch[0].body.send_id, 'Another deliberate click gets a new send id');
  assert.equal(robotApplication.mention_mode, 'members', 'Manual sending preserves approved member configuration');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Repeated manual send fits ${width}`);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `robot-manual-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '配置 @ 成员', exact: true }).click();
  await page.getByLabel('提醒方式').selectOption('none');
  await page.getByRole('button', { name: '保存成员配置', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '成员配置已更新' }).waitFor();
  assert.equal(robotReviews.at(-1).body.mention_mode, 'none');
  await page.getByRole('button', { name: '撤销批准并停止发送', exact: true }).click();
  await page.getByLabel('拒绝理由').fill('管理员停止推送');
  await page.getByRole('button', { name: '确认撤销', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '停止后续推送' }).waitFor();
  await page.getByRole('button', { name: '退出', exact: true }).click();
  assert.equal(await page.getByLabel('管理员审核口令').inputValue(), '');
  console.log('Subscription browser checks passed: visible news/home entries, desktop/mobile form, signed recipient display, invalid links, approval console explicit confirmation, robot channel applications, administrator member configuration and revocation.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
