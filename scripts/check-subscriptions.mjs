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
    assert.equal(request.headers().authorization, 'Bearer test-review');
    if (request.method() === 'POST') { approved = true; await route.fulfill({ headers: { 'Access-Control-Allow-Origin': base }, contentType: 'application/json', body: JSON.stringify({ ok: true, message: '已通过审核，等待邮箱确认。' }) }); return; }
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': base }, contentType: 'application/json', body: JSON.stringify({ mail_ready: true, total: approved ? 0 : 1, page: 1, data: approved ? [] : [{ id: 'test-application', email: 'reader@example.com', categories: '["ai"]', applicant_name: '读者', reason: '研究学习', status: 'pending', created_at: '2026-10-09 08:00:00' }] }) });
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
    await page.screenshot({ path: resolve(output, `news-entry-${width}.png`), fullPage: false });
    const response = await page.goto(base + '/news/subscribe?category=ai', { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: '提交订阅申请' }).waitFor();
    assert.equal(await page.locator('.subscription-categories input:checked').count(), 1);
    assert.equal(await page.locator('input[name=categories][value=ai]').isChecked(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No horizontal overflow at ${width}`);
    await page.screenshot({ path: resolve(output, `subscribe-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '打开设置与目录' }).click();
  await page.getByLabel('页面主题').selectOption('midnight');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'midnight');
  const colors = await page.locator('.subscription-primary').evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
  assert.equal(colors.foreground, 'rgb(16, 24, 32)', 'Night theme keeps dark text on the light accent button');
  assert.equal(colors.background, 'rgb(159, 180, 255)');
  assert.equal(await page.locator('.subscription-categories strong').first().evaluate(element => getComputedStyle(element).color), 'rgb(242, 245, 247)', 'Night theme keeps section labels readable');
  assert.equal(await page.locator('.subscription-field-label').evaluate(element => getComputedStyle(element).color), 'rgb(242, 245, 247)', 'Night theme keeps the name label readable');
  await page.screenshot({ path: resolve(output, 'subscribe-midnight.png'), fullPage: true });
  await page.getByRole('button', { name: '打开设置与目录' }).click();
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
  await page.getByLabel('管理员审核口令').fill('test-review');
  await page.getByRole('button', { name: '进入审核' }).click();
  await page.getByRole('heading', { name: 'reader@example.com' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Review page fits mobile');
  await page.screenshot({ path: resolve(output, 'review-390.png'), fullPage: true });
  await page.getByRole('button', { name: '通过申请' }).click();
  await page.getByRole('status').filter({ hasText: '已通过审核' }).waitFor();
  assert.equal(approved, true);
  await page.getByRole('button', { name: '退出', exact: true }).click();
  assert.equal(await page.getByLabel('管理员审核口令').inputValue(), '');
  console.log('Subscription browser checks passed: visible news/home entries, desktop/mobile form, signed recipient display, invalid links, approval console and explicit confirmation.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
