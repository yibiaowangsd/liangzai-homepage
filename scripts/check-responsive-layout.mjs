import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

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
const viewports = [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 430, height: 932 }, { width: 640, height: 360 },
  { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1180, height: 757 }, { width: 1280, height: 720 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3440, height: 1440 }, { width: 3840, height: 2160 },
];
const routes = ['/', '/pqc-practice/index.html', '/pqc-practice/audit.html', '/news', `/news/${items[0].slug}`, '/about', '/models', '/storybook', '/archive', '/pqc-arsenal'];
const contentSelectors = {
  '/': '.portal-quickstart, .portal-tools, .portal-news, .portal-world',
  '/pqc-practice/index.html': '.practice-layout',
  '/pqc-practice/audit.html': '.audit-table-scroll',
  '/news': '.front-page, .edition, .news-pagination, .news-method-note',
  [`/news/${items[0].slug}`]: '.article-shell',
  '/models': '.model-gallery',
  '/storybook': '.reader-stage',
  '/archive': '.dossier-character-hero',
  '/pqc-arsenal': '.algorithm-directory',
};
const output = resolve('outputs/responsive');
await mkdir(output, { recursive: true });
const failures = [];
let checked = 0;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      await context.route('https://api.wangyibiao.com/api/news/**', async route => {
        const response = newsResponse(route.request().url());
        await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      });
      const page = await context.newPage();
      for (const path of routes) {
        await page.setViewportSize({ width: 1440, height: 900 });
        const response = await page.goto(base + path, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, `${name} ${path} loads`);
        await page.locator('header.site-chrome').waitFor();
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const label = `${name} ${path} ${viewport.width}×${viewport.height}`;
          try {
            const layout = await page.evaluate(selector => {
              const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
              const header = document.querySelector('.site-chrome');
              const nav = header.querySelector('.desktop-nav');
              const homeTitle = document.querySelector('#home-title');
              return {
                width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
                brand: rect(header.querySelector('.brand')), actions: rect(header.querySelector('.chrome-actions')),
                nav: getComputedStyle(nav).display === 'none' ? null : rect(nav),
                retiredLinks: document.querySelectorAll('a[href="/observatory"]').length,
                content: [...document.querySelectorAll(selector)].map(el => {
                  const r = el.getBoundingClientRect();
                  const style = getComputedStyle(el);
                  const left = r.left + parseFloat(style.paddingLeft);
                  const right = r.right - parseFloat(style.paddingRight);
                  return { name: el.className, left, right, width: right - left };
                }),
                heroInset: homeTitle ? parseFloat(getComputedStyle(document.querySelector('.portal-hero-copy')).paddingLeft) : null,
                home: homeTitle ? { size: parseFloat(getComputedStyle(homeTitle).fontSize), actions: rect(document.querySelector('.portal-actions')), foot: rect(document.querySelector('.portal-hero-foot')), hero: rect(document.querySelector('.portal-hero')) } : null,
              };
            }, contentSelectors[path] || 'main');
            assert.ok(layout.scroll <= layout.width + 1, `horizontal overflow: ${layout.scroll}/${layout.width}`);
            assert.ok(layout.brand.right + 2 <= layout.actions.left, 'header controls overlap brand');
            assert.ok(layout.actions.right <= layout.width + 1, 'header controls leave viewport');
            if (layout.nav) {
              assert.ok(layout.brand.right + 2 <= layout.nav.left, 'navigation overlaps brand');
              assert.ok(layout.nav.right + 2 <= layout.actions.left, 'navigation overlaps controls');
            }
            assert.equal(layout.retiredLinks, 0, 'retired destination appears in navigation');
            if (viewport.width >= 1280) {
              assert.ok(layout.content.length > 0, 'page content is missing');
              for (const block of layout.content) {
                assert.ok(block.left <= 49 && block.right >= layout.width - 49,
                  `content stays too narrow: ${block.name}, ${Math.round(block.width)}/${layout.width}, edges ${Math.round(block.left)}/${Math.round(layout.width - block.right)}`);
              }
              assert.ok(layout.brand.left <= 49 && layout.actions.right >= layout.width - 49, 'masthead stays in a narrow central column');
              if (layout.home) assert.ok(layout.heroInset <= 49, 'home copy has oversized side gutters');
            }
            if (layout.home) {
              assert.ok(layout.home.size >= 52 && layout.home.size <= 112, `home title size ${layout.home.size}`);
              assert.ok(layout.home.actions.bottom + 12 <= layout.home.foot.top, 'hero footer overlaps actions');
              assert.ok(layout.home.foot.bottom <= layout.home.hero.bottom + 1, 'hero clips its footer');
            }
            if (viewport.width === 320 || viewport.width === 1440) {
              const slug = path === '/' ? 'home' : path.replaceAll('/', '-').replace(/^-/, '');
              await page.screenshot({ path: `${output}/${name}-${slug}-${viewport.width}.png` });
            }
            if (viewport.width === 3840 && ['/', '/pqc-practice/index.html', '/news'].includes(path)) {
              const slug = path === '/' ? 'home' : path.replaceAll('/', '-').replace(/^-/, '');
              await page.screenshot({ path: `${output}/${name}-${slug}-3840.jpg`, type: 'jpeg', quality: 80 });
              console.log(`${label}: content widths ${layout.content.map(block => Math.round(block.width)).join(', ')}`);
            }
            checked++;
          } catch (error) {
            const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')]
              .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1; })
              .slice(0, 10).map(el => ({ tag: el.tagName, id: el.id, class: el.className, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width, position: getComputedStyle(el).position })));
            const slug = path === '/' ? 'home' : path.replaceAll('/', '-').replace(/^-/, '');
            await page.screenshot({ path: `${output}/failed-${name}-${slug}-${viewport.width}.png` });
            failures.push(`${label}: ${error.message}; overflow=${JSON.stringify(overflow)}`);
          }
        }
        await page.setViewportSize({ width: 320, height: 568 });
        await page.getByRole('button', { name: '打开全站目录', exact: true }).click();
        const menu = page.locator('dialog[open]');
        await menu.waitFor();
        assert.equal(await menu.locator('a[href="/observatory"]').count(), 0);
        await page.keyboard.press('Escape');
        await menu.waitFor({ state: 'hidden' });
      }
      // Native selectors and the React selector use the same four palettes.
      await page.goto(base, { waitUntil: 'networkidle' });
      for (const theme of ['paper', 'midnight', 'mist', 'sand']) {
        await page.getByLabel('页面主题', { exact: true }).selectOption(theme);
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      }
      await page.goto(base + '/observatory?form=wave', { waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).pathname, '/');
      await context.close();
      console.log(`${name}: responsive routes, directory, themes and retired URL checked`);
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  globalThis.fetch = nativeFetch;
}
console.log(`${checked} viewport/route/engine combinations passed`);
assert.deepEqual(failures, [], failures.join('\n'));
