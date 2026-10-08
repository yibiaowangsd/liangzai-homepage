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
const routes = ['/', '/pqc-practice/index.html', '/pqc-practice/audit.html', '/news', `/news/${items[0].slug}`, '/about', '/models', '/storybook', '/archive', '/pqc-arsenal', '/notes', '/notes/ml-kem-materials'];
const contentSelectors = {
  '/': '.portal-tools, .portal-news',
  '/pqc-practice/index.html': '.practice-layout',
  '/pqc-practice/audit.html': '.audit-table-scroll',
  '/news': '.edition, .news-pagination, .news-method-note',
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
  const engines = { chromium, firefox, webkit };
  const requested = process.env.LAYOUT_BROWSERS?.split(',') || Object.keys(engines);
  for (const name of requested) {
    assert.ok(engines[name], 'Unknown browser: ' + name);
    const engine = engines[name];
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      await context.route('https://api.wangyibiao.com/api/news/**', async route => {
        const response = newsResponse(route.request().url());
        await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      });
      const page = await context.newPage();
      for (const path of process.env.LAYOUT_INTERACTIONS_ONLY === '1' ? [] : routes) {
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
              const identity = document.querySelector('[data-identity-card]');
              return {
                width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
                brand: rect(header.querySelector('.brand')), actions: rect(header.querySelector('.chrome-actions')),
                nav: getComputedStyle(nav).display === 'none' ? null : rect(nav),
                retiredLinks: document.querySelectorAll('a[href="/observatory"]').length,
                identity: identity ? { ...rect(identity), canonicalWidth: identity.offsetWidth, canonicalHeight: identity.offsetHeight } : null,
                editionNote: document.querySelector('.news-edition-note') ? rect(document.querySelector('.news-edition-note')) : null,
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
            assert.ok(layout.brand.right + 2 <= layout.actions.left || layout.brand.bottom <= layout.actions.top + 1, 'header controls overlap brand');
            assert.ok(layout.actions.right <= layout.width + 1, 'header controls leave viewport');
            if (layout.nav) {
              assert.ok(layout.brand.right + 2 <= layout.nav.left || layout.brand.bottom <= layout.nav.top + 1, 'navigation overlaps brand');
              assert.ok(layout.nav.right + 2 <= layout.actions.left || layout.actions.bottom <= layout.nav.top + 1, 'navigation overlaps controls');
            }
            assert.equal(layout.retiredLinks, 0, 'retired destination appears in navigation');
            if (path.startsWith('/news/')) {
              assert.ok(layout.content[0].width <= 928, 'article line length grows without a reading limit');
              assert.ok(layout.content[0].width >= Math.min(240, layout.width - 40), 'article reading column is too narrow');
            }
            if (viewport.width >= 1280 && !path.startsWith('/news/') && path !== '/pqc-arsenal' && !path.startsWith('/notes')) {
              assert.ok(layout.content.length > 0, 'page content is missing');
              for (const block of layout.content) {
                const maxInset = layout.width * .055;
                assert.ok(block.left <= maxInset && block.right >= layout.width - maxInset,
                  `content stays too narrow: ${block.name}, ${Math.round(block.width)}/${layout.width}, edges ${Math.round(block.left)}/${Math.round(layout.width - block.right)}`);
              }
              assert.ok(layout.brand.left <= layout.width * .055 && layout.actions.right >= layout.width * .945, 'masthead stays in a narrow central column');
              if (layout.home) assert.ok(layout.heroInset <= layout.width * .055, 'home copy has oversized side gutters');
            }
            if (layout.home) {
              assert.ok(layout.home.size >= 35 && layout.home.size <= 128, `home title size ${layout.home.size}`);
              assert.ok(layout.home.actions.bottom + 12 <= layout.home.foot.top, 'hero footer overlaps actions');
              assert.ok(layout.home.foot.bottom <= layout.home.hero.bottom + 1, 'hero clips its footer');
              if (layout.editionNote) assert.ok(layout.editionNote.top >= layout.home.hero.bottom - 1, 'news prompt floats over the cinematic hero');
            }
            if (layout.identity) {
              assert.equal(layout.identity.canonicalWidth, 460, 'identity card changes its canonical width');
              assert.equal(layout.identity.canonicalHeight, 356, 'identity card changes its canonical height');
              if (viewport.width >= 600) assert.ok(Math.abs(layout.identity.width - 460) < 1, 'desktop identity card grows or shrinks');
              assert.ok(layout.identity.left >= -1 && layout.identity.right <= layout.width + 1, 'identity card leaves the screen');
            }
            if (viewport.width === 320 || viewport.width === 1440) {
              const slug = path === '/' ? 'home' : path.replaceAll('/', '-').replace(/^-/, '');
              await page.screenshot({ path: `${output}/${name}-${slug}-${viewport.width}.png` });
              if (path === '/') {
                // A full-page screenshot must contain loaded art, including the
                // scenes beyond the viewport that intentionally use lazy images.
                for (const artwork of await page.locator('.portal-home img[loading="lazy"]').all()) await artwork.scrollIntoViewIfNeeded();
                await page.waitForFunction(() => [...document.querySelectorAll('.portal-home img[loading="lazy"]')].every(img => img.complete && img.naturalWidth > 0));
                await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                await page.screenshot({ path: `${output}/${name}-home-full-${viewport.width}.jpg`, fullPage: true, type: 'jpeg', quality: 75 });
              }
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
        await page.getByRole('button', { name: '打开设置与目录', exact: true }).click();
        const menu = page.locator('dialog[open]');
        await menu.waitFor();
        assert.equal(await menu.locator('a[href="/observatory"]').count(), 0);
        await page.keyboard.press('Escape');
        await menu.waitFor({ state: 'hidden' });
      }
      assert.deepEqual(failures, [], failures.join('\n'));
      await page.setViewportSize({ width: 320, height: 568 });
      // Native selectors and the React selector use the same two palettes.
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: '打开设置与目录', exact: true }).click();
      for (const theme of ['paper', 'midnight']) {
        await page.locator('dialog[open]').getByLabel('页面主题', { exact: true }).selectOption(theme);
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      }
      // The redesign must preserve the entrance, navigation and real page controls.
      await page.locator('dialog[open]').getByLabel('页面主题', { exact: true }).selectOption('paper');
      await page.keyboard.press('Escape');
      // Every directory entry must reach its own page and release native modality.
      for (const href of ['/models', '/storybook', '/archive', '/pqc-arsenal', '/pqc-practice', '/news', '/about', '/']) {
        await page.getByRole('button', { name: '打开设置与目录', exact: true }).click();
        await page.locator(`dialog[open] a[href="${href}"]`).click();
        await page.waitForFunction(href => location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') === href.replace(/\/$/, ''), href);
        await page.locator('#main-content').waitFor();
        assert.equal(await page.locator('dialog[open]').count(), 0, `${name} ${href}: directory stays open after navigation`);
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', `${name} ${href}: scroll lock survives navigation`);
      }
      assert.equal(await page.locator('.cinema-entrance').count(), 0, 'homepage has no blocking intro');
      await page.getByRole('button', { name: '运行 ML-KEM 实验' }).click();
      await page.getByRole('status').filter({ hasText: '验证通过' }).waitFor();
      assert.equal(await page.locator('.handshake-steps [data-complete="true"]').count(), 3);
      const firstKey = await page.locator('.handshake-preview code').textContent();
      await page.getByRole('button', { name: '再运行一次' }).click();
      await page.getByRole('status').filter({ hasText: '验证通过' }).waitFor();
      assert.notEqual(await page.locator('.handshake-preview code').textContent(), firstKey, 'repeated runs generate fresh random keys');
      await page.route('**/pqc-practice/worker.js', route => route.abort());
      await page.getByRole('button', { name: '再运行一次' }).click();
      await page.getByRole('button', { name: '重试实验' }).waitFor();
      await page.unroute('**/pqc-practice/worker.js');
      await page.getByRole('button', { name: '重试实验' }).click();
      await page.getByRole('status').filter({ hasText: '验证通过' }).waitFor();
      await page.screenshot({ path: output + '/' + name + '-home-experiment-320.png', fullPage: true });
      await page.locator('.portal-actions a[href="#selected"]').click();
      await page.waitForFunction(() => location.hash === '#selected');
      assert.ok(await page.locator('#selected').isVisible());
      await page.goto(base + '/pqc-arsenal', { waitUntil: 'networkidle' });
      await page.getByRole('searchbox').fill('ML-KEM');
      assert.equal(await page.locator('.algorithm-directory-grid article').count(), 1);
      await page.goto(base + '/storybook', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: '下一页', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.reader-pagination b')?.textContent === '02');
      await page.goto(base + '/models', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: '侧面', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '侧面', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.goto(base + '/observatory?form=wave', { waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).pathname, '/');
      await context.close();
      const plainContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      try {
        const plainPage = await plainContext.newPage();
        await plainPage.goto(base, { waitUntil: 'load' });
        assert.equal(await plainPage.locator('.portal-project-card').count(), 3);
        assert.ok(await plainPage.locator('.portal-signal-card').count() > 0);
        await plainPage.locator('noscript .handshake-note').waitFor({ state: 'visible' });
        await plainPage.goto(base + '/notes/ml-kem-materials', { waitUntil: 'load' });
        assert.ok(await plainPage.locator('#abstract').isVisible());
      } finally { await plainContext.close(); }
      // Run with motion enabled: reduced-motion-only checks miss capture interception.
      const animatedContext = await browser.newContext({ reducedMotion: 'no-preference' });
      try {
        await animatedContext.route('https://api.wangyibiao.com/api/news/**', async route => {
          const response = newsResponse(route.request().url());
          await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
        });
        // A deterministic image actor exercises transitions even without a GPU.
        await animatedContext.route('**/*.glb', route => route.abort());
        const animatedPage = await animatedContext.newPage();
        const homeRequests = [];
        animatedPage.on('request', request => homeRequests.push(request.url()));
        await animatedPage.goto(base, { waitUntil: 'networkidle' });
        assert.ok(!homeRequests.some(url => url.includes('/wasm/') || url.includes('vault-entrance')), 'homepage loads no crypto module or retired hero image before interaction');
        await animatedPage.getByRole('button', { name: '运行 ML-KEM 实验' }).click();
        await animatedPage.getByRole('status').filter({ hasText: '验证通过' }).waitFor();
        assert.ok(homeRequests.some(url => url.endsWith('.wasm')), 'experiment loads actual WASM on demand');

        for (const entry of ['settings', 'search', 'laboratory']) {
          await animatedPage.goto(base + (entry === 'laboratory' ? '/pqc-practice/index.html' : '/news'), { waitUntil: 'networkidle' });
          await animatedPage.waitForFunction(() => document.querySelector('.experience')?.dataset.motion === 'active' || !document.querySelector('.experience'));
          if (entry === 'search') {
            await animatedPage.getByRole('button', { name: '搜索全站，快捷键 Ctrl 或 Command 加 K', exact: true }).click();
            await animatedPage.locator('.jump-results a[href="/about"]').click();
          } else {
            await animatedPage.getByRole('button', { name: '打开设置与目录', exact: true }).click();
            await animatedPage.locator('dialog[open] a[href="/about"]').click();
          }
          await animatedPage.waitForFunction(() => !document.querySelector('dialog[open]'), undefined, { timeout: 1500 });
          await animatedPage.waitForURL('**/about', { timeout: 10000 });
          await animatedPage.locator('.about-push').waitFor({ state: 'hidden', timeout: 10000 });
          await animatedPage.locator('#main-content h1').waitFor();
          assert.notEqual(await animatedPage.evaluate(() => document.body.style.overflow), 'hidden', `${name} ${entry}: transition restores directory scroll lock`);
          assert.equal(await animatedPage.evaluate(() => !!document.querySelector('.experience')?.inert), false, `${name} ${entry}: destination stays inert`);
          await animatedPage.getByRole('button', { name: '打开设置与目录', exact: true }).click();
          await animatedPage.locator('dialog[open]').waitFor();
          await animatedPage.keyboard.press('Escape');
          await animatedPage.locator('dialog[open]').waitFor({ state: 'hidden' });
        }
      } finally {
        await animatedContext.close();
      }
      console.log(`${name}: requested layouts, directory, themes, real KEM runs and failure recovery, no-JS content, on-demand WASM, chapter anchors and page controls checked`);
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  globalThis.fetch = nativeFetch;
}
console.log(checked ? `${checked} viewport/route/engine combinations passed` : 'Interaction-only checks passed; viewport grid was explicitly skipped.');
assert.deepEqual(failures, [], failures.join('\n'));
