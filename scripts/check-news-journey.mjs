import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { chromium, firefox, webkit } from 'playwright';
import { expect } from 'playwright/test';
import newsWorker from '../news-worker/index.js';

// Real production UI, real WASM operations, and real archive SQL against an
// in-memory fixture. No accounts, messages or production database writes.
const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../news-worker/migrations/0005_news_editions.sql', import.meta.url), 'utf8'));
db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT,
  content TEXT, category TEXT, tags TEXT, source_name TEXT, source_url TEXT,
  cover_image TEXT, published_at TEXT, status TEXT)`);
const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stories = [
  ['first-algorithm', '算法实现验证', 'pqc', '2026-10-10', '实现正文'],
  ['tls-practice', 'TLS 部署实践', 'protocol', '2026-10-10', '协议正文'],
  ['aws-practice', 'AWS 抗量子部署', 'protocol', '2026-10-10', 'AWS 部署正文'],
  ['ai-practice', 'AI 开发工具进展', 'ai', '2026-10-10', '开发正文'],
  ['old-body-match', '早期边缘代理实现', 'protocol', '2026-10-09', '原始来源日期：2026-10-08。AWS TLS 内容仅出现在正文。'],
];
stories.forEach(([slug, title, category, date, content], index) => insert.run(index + 1, slug, title, '用于核验连续阅读与文章搜索的摘要。', content + '\n\n## 量仔观察\n\n本站分析。', category, '[]', '测试来源', null, '/news-covers/' + category + '.svg', date + 'T08:00:00+08:00', 'published'));
const newsEnv = { DB: { prepare(sql) {
  const statement = db.prepare(sql);
  let args = [];
  return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; } };
} } };
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  return url.startsWith('https://api.wangyibiao.com/api/news') ? newsWorker.fetch(new Request(input, init), newsEnv) : nativeFetch(input, init);
};
const { default: worker } = await import('../dist/server/index.js');
const clientRoot = resolve('dist/client');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
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
  } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const output = resolve('outputs/news-journey');
await mkdir(output, { recursive: true });

try {
  const engines = process.env.NEWS_JOURNEY_ENGINES?.split(',') || ['chromium', 'firefox', 'webkit'];
  for (const engine of engines) {
    const browserType = { chromium, firefox, webkit }[engine];
    assert.ok(browserType, `Unsupported engine: ${engine}`);
    const browser = await browserType.launch(engine === 'chromium' && process.env.NEWS_JOURNEY_CHROMIUM_PATH ? { executablePath: process.env.NEWS_JOURNEY_CHROMIUM_PATH } : {});
    try {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.route('https://api.wangyibiao.com/api/news**', async route => {
          const url = new URL(route.request().url());
          const response = url.searchParams.get('q') === 'search-outage' ? new Response('{}', { status: 503 }) : await newsWorker.fetch(new Request(url), newsEnv);
          await route.fulfill({ status: response.status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await response.text() });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        const goto = path => page.goto(base + path, { waitUntil: 'networkidle' });
        await goto('/news?date=2026-10-10');
        assert.doesNotMatch(await page.locator('.news-day-controls').innerText(), /条|第 .*期/);

        await goto('/news/tls-practice?date=2026-10-10&category=protocol');
        const reading = page.getByRole('navigation', { name: '本期连续阅读' });
        await expect(reading.getByRole('link', { name: /返回本期/ })).toHaveAttribute('href', '/news?date=2026-10-10&category=protocol');
        await reading.getByRole('link', { name: /下一篇/ }).click();
        await expect(page.locator('.article-header h1')).toHaveText('AWS 抗量子部署');
        await expect(reading.getByRole('link', { name: /下一篇/ })).toHaveCount(0);
        await reading.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        await page.screenshot({ path: resolve(output, `${engine}-${width}-article.png`) });
        await page.waitForLoadState('networkidle');

        await page.locator('.jump-trigger').click();
        const dialog = page.getByRole('dialog', { name: '搜索全站' });
        await dialog.getByRole('searchbox').fill('AWS');
        await expect(dialog.locator('.jump-result-count')).toHaveText('2 篇新闻 · 0 个栏目');
        await expect(dialog.getByRole('link', { name: /早期边缘代理实现/ })).toBeVisible();
        await page.screenshot({ path: resolve(output, `${engine}-${width}-search.png`) });
        await dialog.getByRole('searchbox').fill('search-outage');
        await expect(dialog.locator('.jump-result-count')).toContainText('新闻搜索暂时不可用');
        await dialog.getByRole('searchbox').fill('AWS');
        await expect(dialog.getByRole('link', { name: /早期边缘代理实现/ })).toBeVisible();
        await dialog.getByRole('link', { name: /早期边缘代理实现/ }).click();
        await expect(page.locator('.article-header h1')).toHaveText('早期边缘代理实现');
        assert.equal(new URL(page.url()).searchParams.get('date'), '2026-10-09');
        await page.getByRole('navigation', { name: '本期连续阅读' }).getByRole('link', { name: /返回本期/ }).click();
        await expect(page.locator('.news-day-controls .news-date-trigger')).toContainText('2026年10月9日');
        await page.waitForLoadState('networkidle');

        await goto('/pqc-practice/index.html');
        await expect(page.locator('#kem-generate')).toBeEnabled({ timeout: 30000 });
        await page.locator('#kem-generate').click();
        await expect(page.locator('#kem-send-public')).toBeEnabled();
        await page.locator('#kem-send-public').click();
        await expect(page.locator('#kem-encapsulate')).toBeEnabled();
        await page.locator('#kem-encapsulate').click();
        await expect(page.locator('#kem-send-cipher')).toBeEnabled();
        await page.locator('#kem-send-cipher').click();
        await expect(page.locator('#kem-decapsulate')).toBeEnabled();
        await page.locator('#kem-decapsulate').click();
        await expect(page.locator('#message')).toContainText('验证通过');
        const ciphertext = await page.locator('#kem-bob-cipher').inputValue();
        await page.locator('#kem-bob-cipher').fill('00');
        await expect(page.locator('#kem-decapsulate')).toBeDisabled();
        await expect(page.locator('#manual-summary')).toContainText('等待');
        await expect(page.locator('#message')).not.toContainText('验证通过');
        await expect(page.locator('#message')).not.toHaveClass(/success|error/);
        await page.locator('#kem-bob-cipher').fill(ciphertext);
        await expect(page.locator('#kem-decapsulate')).toBeEnabled();
        await expect(page.locator('#message')).not.toContainText('验证通过');
        await page.locator('#kem-decapsulate').click();
        await expect(page.locator('#message')).toContainText('验证通过');

        await goto('/pqc-arsenal');
        await page.getByRole('link', { name: '进入实验室选择 ML-DSA', exact: true }).click();
        await page.waitForURL(url => url.pathname === '/pqc-practice/index.html' && url.searchParams.get('algorithm') === 'ml-dsa');
        await expect(page.locator('#family')).toHaveValue('mldsa');
        await expect(page.locator('#variant')).toHaveValue('65');
        await expect(page.locator('#sig-generate')).toBeEnabled({ timeout: 30000 });
        await page.locator('#sig-generate').click();
        await expect(page.locator('#sig-send-public')).toBeEnabled();
        await page.locator('#sig-send-public').click();
        await expect(page.locator('#sign-button')).toBeEnabled();
        await page.locator('#sign-button').click();
        await expect(page.locator('#sig-send-result')).toBeEnabled();
        await page.locator('#sig-send-result').click();
        await expect(page.locator('#verify-button')).toBeEnabled();
        await page.locator('#verify-button').click();
        await expect(page.locator('#message')).toContainText('验证通过');
        await page.locator('#verify-message').fill('消息已修改');
        await expect(page.locator('#signature-verdict-title')).toHaveText('等待验证');
        await expect(page.locator('#message')).not.toContainText('验证通过');
        await page.locator('#verify-button').click();
        await expect(page.locator('#message')).toContainText('验证失败');
        await page.locator('#verify-signature').fill('00');
        await expect(page.locator('#verify-button')).toBeDisabled();
        await expect(page.locator('#message')).not.toContainText('验证失败');

        await page.locator('.jump-trigger').click();
        const labSearch = page.getByRole('dialog', { name: '搜索全站' });
        await labSearch.getByRole('searchbox').fill('AWS');
        await expect(labSearch.locator('.practice-search-status')).toHaveText('2 篇新闻 · 0 个栏目');
        await labSearch.getByRole('link', { name: /AWS 抗量子部署/ }).click();
        await expect(page.locator('.article-header h1')).toHaveText('AWS 抗量子部署');
        await page.waitForLoadState('networkidle');

        for (const [algorithm, family, variant] of [['slh-dsa', 'slhdsa', '128f'], ['__proto__', 'mlkem', '768']]) {
          await goto('/pqc-practice/index.html?algorithm=' + algorithm);
          await expect(page.locator('#family')).toHaveValue(family);
          await expect(page.locator('#variant')).toHaveValue(variant);
        }
        assert.deepEqual(errors, [], `${engine} ${width} has no application errors`);
        await context.close();
        console.log(`News, search, algorithm links and real WASM flows passed: ${engine} ${width}px`);
      }
    } finally { await browser.close(); }
  }
} finally {
  globalThis.fetch = nativeFetch;
  await new Promise(resolve => server.close(resolve));
  db.close();
}
