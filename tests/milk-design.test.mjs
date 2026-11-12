import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('display type is self-hosted and subset; workbench layout files stay on the system stack', async () => {
  const css = await read('public/theme/milk.css');
  assert.match(css, /font-family: "Milk Song";\s*src: url\("\/assets\/fonts\/milk-song-heavy\.woff2"\)/);
  assert.match(css, /font-family: "Milk Latin";\s*src: url\("\/assets\/fonts\/milk-latin-italic\.woff2"\)/);
  assert.match(css, /font-display: swap/);
  assert.doesNotMatch(css, /fonts\.googleapis|fonts\.gstatic/);
  const fonts = await readdir(new URL('../public/assets/fonts/', import.meta.url));
  for (const file of ['milk-song-heavy.woff2', 'milk-latin-italic.woff2', 'OFL.txt']) assert.ok(fonts.includes(file), file);
  const song = await readFile(new URL('../public/assets/fonts/milk-song-heavy.woff2', import.meta.url));
  assert.ok(song.length < 400 * 1024, `subset stays small (${song.length} bytes)`);
  // Layout files keep the system stack; the milk skin lives in separate files.
  for (const file of ['app/news/news.css', 'public/pqc-practice/studio.css', 'public/pqc-practice/styles.css'])
    assert.doesNotMatch(await read(file), /Milk Song|Milk Latin|--milk-/, file);
});

test('every Naiwa pose the pages reference ships with matching dimensions', async () => {
  const shipped = await readdir(new URL('../public/assets/naiwa/', import.meta.url));
  const sources = ['app/QuantumHome.tsx', 'app/milk/NaiwaAsks.tsx', 'app/experience/SiteChrome.tsx', 'app/about/page.tsx', 'app/archive/page.tsx', 'app/storybook/StoryBook.tsx',
    'app/news/page.tsx', 'app/news/subscribe/page.tsx', 'app/research/page.tsx', 'app/wo/page.tsx', 'public/pqc-practice/index.html', 'public/pqc-practice/audit.html'];
  const used = new Set();
  for (const file of sources) for (const match of (await read(file)).matchAll(/\/assets\/naiwa\/([a-z]+)\.webp/g)) used.add(match[1]);
  assert.ok(used.size >= 10, [...used].join(','));
  for (const pose of used) assert.ok(shipped.includes(`${pose}.webp`), pose);
  const script = await read('scripts/prepare-naiwa.mjs');
  for (const pose of used) assert.match(script, new RegExp(`\\b${pose}: \\[\\d+, \\d+\\]`), pose);
});

test('bottle gauge and ambient motion respect reduced motion and stay out of working pages', async () => {
  const gauge = await read('app/milk/BottleGauge.tsx');
  assert.match(gauge, /const routes = new Set\(\["\/", "\/about", "\/archive"\]\)/);
  assert.match(gauge, /prefers-reduced-motion: reduce/);
  assert.match(gauge, /cancelAnimationFrame/);
  assert.match(gauge, /aria-label="回到页面顶部，再来一瓶"/);
  const css = await read('public/theme/milk.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.milk-surface svg \{ animation: none; \} \}/);
  assert.match(css, /\[data-motion="paused"\] \.milk-surface svg \{ animation: none; \}/);
  assert.match(await read('app/milk/home.css'), /@media \(prefers-reduced-motion: reduce\)/);
});

test('new pages call the yellow character 奶蛙 while the recorded story keeps 奶龙', async () => {
  for (const file of ['app/QuantumHome.tsx', 'app/about/page.tsx', 'app/archive/page.tsx', 'app/models/page.tsx', 'app/experience/SiteChrome.tsx']) {
    const source = await read(file);
    assert.match(source, /奶蛙/, file);
    assert.doesNotMatch(source, /奶娃/, file);
  }
  const story = await read('app/storybook/storyData.ts');
  assert.match(story, /奶龙/);
  assert.doesNotMatch(story, /奶蛙/);
});

test('literal page headings omit sentence-ending full stops but preserve body prose', async () => {
  for (const item of await readdir(new URL('../app/', import.meta.url), { recursive: true })) {
    if (!item.endsWith('.tsx')) continue;
    const source = await read('app/' + item);
    for (const heading of source.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
      assert.doesNotMatch(heading[1], /。/, item);
    }
  }
  const home = await read('app/QuantumHome.tsx');
  assert.match(home, /关注标准、网络安全、AI 与 NGCC 公钥征集的新进展。/);
  assert.match(home, /验证一次密钥封装/);
});

test('all laboratory transports have contained opaque surfaces and no escaping wires', async () => {
  const css = await read('public/pqc-practice/studio.css');
  assert.match(css, /\.channel, \.kex-channel \{[^}]*background: var\(--theme-soft\)/s);
  assert.match(css, /\.channel \.route, \.channel \.route \+ \.route, \.kex-channel \.route \{[^}]*background: var\(--lab-surface\)/s);
  assert.match(css, /\.channel \.wire, \.kex-channel \.wire \{[^}]*margin: 0 4px 14px/s);
  assert.doesNotMatch(css, /margin-inline: -/);
  assert.match(css, /\.channel \.packet-data, \.kex-channel pre \{ max-width: 100%; overflow-wrap: anywhere;/);
  assert.match(await read('public/pqc-practice/styles.css'), /\.packet-data\{[^}]*max-height:155px;overflow:auto/);
});

test('every work page opens with the shared intro and the one masthead/footer language', async () => {
  const intro = await read('app/milk/PageIntro.tsx');
  assert.match(intro, /className="milk-intro"/);
  assert.match(intro, /data-source=\{dynamicTitle \? "dynamic" : undefined\}/);
  for (const file of ['app/news/page.tsx', 'app/news/weekly/page.tsx', 'app/topics/page.tsx', 'app/topics/[slug]/page.tsx', 'app/research/page.tsx', 'app/research/[slug]/page.tsx', 'app/wo/page.tsx'])
    assert.match(await read(file), /<PageIntro\b/, file);
  // Titles that come from data must not depend on the subset display font.
  for (const file of ['app/topics/[slug]/page.tsx', 'app/research/[slug]/page.tsx']) assert.match(await read(file), /dynamicTitle/, file);
  const chrome = await read('app/experience/SiteChrome.tsx');
  assert.match(chrome, /data-size=\{storyRoutes\.has\(path\) \? undefined : "compact"\}/);
  assert.match(chrome, /path === "\/storybook" \? "night"/);
  const layout = await read('app/layout.tsx');
  assert.match(layout, /public\/theme\/milk\.css/);
  assert.doesNotMatch(layout, /scenes\.css|app\/milk\/milk\.css/);
  for (const page of ['index', 'audit']) {
    const html = await read(`public/pqc-practice/${page}.html`);
    assert.ok(html.indexOf('/theme/milk.css') > html.indexOf('/theme/site-theme.css'), `${page}: milk loads after the theme layer`);
    assert.match(html, /lab-milk\.css/);
    assert.match(html, /<footer class="milk-footer" data-size="compact">/);
    assert.doesNotMatch(html, /practice-footer|>LIANGZAI</);
    assert.match(html, /<a href="\/research">深度研究<\/a>/);
  }
});

test('weekly summary no longer sits in the subscription banner grid', async () => {
  const page = await read('app/news/weekly/page.tsx');
  assert.doesNotMatch(page, /news-subscription-banner/);
  assert.match(page, /className="weekly-summary"/);
  assert.match(page, /content\.split\(\/\\n\\s\*\\n\/\)/);
});
