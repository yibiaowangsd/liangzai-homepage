import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('React and both standalone laboratory documents load the shared system font stack', async () => {
  const css=await read('public/assets/site-typography.css');
  assert.match(css,/--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial/);
  assert.match(css,/"PingFang SC", "Microsoft YaHei"/);
  assert.match(css,/--font-mono: ui-monospace/);
  assert.match(await read('app/layout.tsx'),/site-typography\.css/);
  for (const name of ['index','audit']) assert.match(await read(`public/pqc-practice/${name}.html`),/site-typography\.css/);
  assert.doesNotMatch(await read('public/pqc-practice/styles.css'),/@font-face|PQC Sans/);
  for(const file of ['app/studio/system.css','app/news/news.css','app/storybook/StoryBook.module.css','app/globals.css']) {
    const source=await read(file);assert.doesNotMatch(source,/Noto Serif|Source Han Serif|IBM Plex|SF Pro Display|"Inter"/,file);
  }
});

test('utility page headings stay compact across desktop and mobile', async () => {
  for(const file of ['public/pqc-practice/studio.css','app/models/models.css']) {
    assert.match(await read(file),/font-size: clamp\(28px, 2\.5vw, 36px\)/);
  }
  assert.match(await read('app/observatory/observatory.css'),/font-size: clamp\(28px, 3vw, 40px\)/);
  assert.doesNotMatch(await read('app/observatory/observatory.css'),/font-size: 11vw/);
  const lab=await read('public/pqc-practice/studio.css');
  assert.match(lab,/\.page-heading \{\s*padding: 22px 0 20px/);
  assert.doesNotMatch(lab,/font-size: (48px|clamp\(42px,5\.8vw,82px\))/);
  for(const file of ['app/archive/dossier.css','app/about/profile.module.css','app/pqc-arsenal/cinematic-arsenal.css']) {
    assert.match(await read(file),/font-size: clamp\(36px, 4\.5vw, 64px\)/);
    assert.doesNotMatch(await read(file),/font-size: (29|23|24)vw/);
  }
});

test('push preserves the body background and closes the native lab directory before capture',async()=>{
  assert.match(await read('app/experience/about-push.ts'),/page\.style\.background = getComputedStyle\(document\.body\)\.background/);
  assert.match(await read('app/experience/about-push-static.ts'),/liangzai:close-directory/);
  assert.match(await read('public/pqc-practice/navigation.js'),/liangzai:close-directory/);
});
