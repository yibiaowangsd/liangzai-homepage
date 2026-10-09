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
  '/': '.portal-tools, .portal-news, .portal-world',
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
              const identity = document.querySelector('[data-identity-card]');
              const settingsButton = header.querySelector('.menu-toggle');
              const footer = document.querySelector('.studio-footer');
              const center = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
              return {
                width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
                brand: rect(header.querySelector('.brand')), actions: rect(header.querySelector('.chrome-actions')),
                settingsText: rect(settingsButton.querySelector('span')), settingsIcon: rect(settingsButton.querySelector('.settings-chevron')),
                nav: getComputedStyle(nav).display === 'none' ? null : rect(nav),
                retiredLinks: document.querySelectorAll('a[href="/observatory"]').length,
                footerCenters: footer ? [
                  ...[...footer.querySelectorAll('.footer-groups > div')].flatMap(group => [...group.children].map(child => center(child) - center(group))),
                  ...[...footer.querySelector('.studio-footer-bottom').children].map(child => center(child) - center(footer)),
                ] : [],
                identity: identity ? { ...rect(identity), canonicalWidth: identity.offsetWidth, canonicalHeight: identity.offsetHeight, content: [...identity.querySelectorAll('h2,p,dt,dd,a')].map(rect) } : null,
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
            assert.ok(Math.abs((layout.settingsText.top + layout.settingsText.bottom) / 2 - (layout.settingsIcon.top + layout.settingsIcon.bottom) / 2) < 1, 'settings label and chevron are not vertically aligned');
            if (layout.nav) {
              assert.ok(layout.brand.right + 2 <= layout.nav.left, 'navigation overlaps brand');
              assert.ok(layout.nav.right + 2 <= layout.actions.left, 'navigation overlaps controls');
            }
            assert.equal(layout.retiredLinks, 0, 'retired destination appears in navigation');
            assert.ok(layout.footerCenters.every(offset => Math.abs(offset) < 1), `footer text is off-center: ${layout.footerCenters.join(', ')}`);
            if (path.startsWith('/news/')) {
              assert.ok(layout.content[0].width <= 928, 'article line length grows without a reading limit');
              assert.ok(layout.content[0].width >= Math.min(240, layout.width - 40), 'article reading column is too narrow');
            }
            if (viewport.width >= 1280 && !path.startsWith('/news/')) {
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
              assert.equal(layout.identity.canonicalHeight, 292, 'identity card changes its canonical height');
              if (viewport.width >= 600) assert.ok(Math.abs(layout.identity.width - 460) < 1, 'desktop identity card grows or shrinks');
              assert.ok(layout.identity.left >= -1 && layout.identity.right <= layout.width + 1, 'identity card leaves the screen');
              assert.ok(layout.identity.content.every(text => text.left >= layout.identity.left && text.right <= layout.identity.right && text.top >= layout.identity.top && text.bottom <= layout.identity.bottom), 'identity card clips its text or links');
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
        await page.getByRole('button', { name: '打开显示设置', exact: true }).click();
        const settings = page.locator('.site-settings-panel');
        await settings.waitFor();
        assert.equal(await settings.locator('a, nav').count(), 0, 'settings must not offer navigation');
        assert.equal(await page.locator('dialog[open]').count(), 0, 'settings should not open a modal');
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'settings should not lock scrolling');
        const settingsBounds = await settings.boundingBox();
        assert.ok(settingsBounds.x >= 0 && settingsBounds.x + settingsBounds.width <= 321, 'settings leave the narrow viewport');
        await page.keyboard.press('Escape');
        await settings.waitFor({ state: 'hidden' });
        assert.equal(await page.getByRole('button', { name: '打开显示设置', exact: true }).evaluate(button => button === document.activeElement), true, 'Escape restores settings focus');
        await page.keyboard.press('ArrowDown');
        await settings.waitFor();
        assert.equal(await settings.getByLabel('页面主题', { exact: true }).evaluate(select => select === document.activeElement), true, 'ArrowDown focuses the first setting');
        await page.locator('.brand').click();
        await settings.waitFor({ state: 'hidden' });
      }
      // Native selectors and the React selector use the same two palettes.
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: '打开显示设置', exact: true }).click();
      for (const theme of ['paper', 'midnight']) {
        await page.getByLabel('页面主题', { exact: true }).selectOption(theme);
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      }
      // The redesign must preserve the entrance, navigation and real page controls.
      await page.getByLabel('页面主题', { exact: true }).selectOption('paper');
      await page.keyboard.press('Escape');
      // Navigation stays available through independent search and releases modality.
      for (const href of ['/models', '/storybook', '/archive', '/pqc-arsenal', '/pqc-practice', '/news', '/about', '/']) {
        await page.locator('.jump-trigger').click();
        await page.locator(`dialog[open] a[href="${href}"]`).click();
        await page.waitForFunction(href => location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') === href.replace(/\/$/, ''), href);
        await page.locator('#main-content').waitFor();
        assert.equal(await page.locator('dialog[open]').count(), 0, `${name} ${href}: search stays open after navigation`);
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', `${name} ${href}: scroll lock survives navigation`);
      }
      await page.getByRole('button', { name: '播放序幕', exact: true }).click();
      await page.locator('.cinema-entrance[open]').waitFor();
      await page.keyboard.press('Space');
      await page.locator('.cinema-entrance[open]').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), '播放序幕', 'replay restores keyboard focus');
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'intro leaves the page locked');
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
        await animatedPage.setViewportSize({ width: 1440, height: 900 });
        for (const entry of ['settings', 'search', 'laboratory']) {
          await animatedPage.goto(base + (entry === 'laboratory' ? '/pqc-practice/index.html' : '/news'), { waitUntil: 'networkidle' });
          await animatedPage.waitForFunction(() => document.querySelector('.experience')?.dataset.motion === 'active' || !document.querySelector('.experience'));
          if (entry === 'search') {
            await animatedPage.getByRole('button', { name: '搜索全站，快捷键 Ctrl 或 Command 加 K', exact: true }).click();
            await animatedPage.locator('.jump-results a[href="/about"]').click();
          } else {
            await animatedPage.getByRole('button', { name: '打开显示设置', exact: true }).click();
            await animatedPage.locator('.desktop-nav a[href="/about"]').click();
          }
          await animatedPage.locator('.site-settings-panel').waitFor({ state: 'hidden', timeout: 1500 });
          await animatedPage.waitForFunction(() => !document.querySelector('dialog[open]'), undefined, { timeout: 1500 });
          await animatedPage.waitForURL('**/about', { timeout: 10000 });
          await animatedPage.locator('.about-push').waitFor({ state: 'hidden', timeout: 10000 });
          await animatedPage.locator('#main-content h1').waitFor();
          assert.notEqual(await animatedPage.evaluate(() => document.body.style.overflow), 'hidden', `${name} ${entry}: transition restores directory scroll lock`);
          assert.equal(await animatedPage.evaluate(() => !!document.querySelector('.experience')?.inert), false, `${name} ${entry}: destination stays inert`);
          await animatedPage.getByRole('button', { name: '打开显示设置', exact: true }).click();
          await animatedPage.locator('.site-settings-panel').waitFor();
          await animatedPage.keyboard.press('Escape');
          await animatedPage.locator('.site-settings-panel').waitFor({ state: 'hidden' });
        }
      } finally {
        await animatedContext.close();
      }
      console.log(`${name}: responsive routes, centered footer, settings dropdown, search, themes, intro, chapter anchors, catalog, story and model controls checked`);
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
