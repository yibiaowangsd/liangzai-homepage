import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('laboratory responds to usable workspace width instead of prematurely stacking desktop sessions', async () => {
  const css = await read('public/pqc-practice/studio.css');
  assert.match(css, /container-name: laboratory/);
  assert.match(css, /@container laboratory \(min-width: 800px\)/);
  assert.match(css, /@container laboratory \(max-width: 799px\)/);
  assert.match(css, /\.dialogue \{ grid-template-columns: minmax\(0, 1fr\) 220px minmax\(0, 1fr\)/);
  const dialogue = await read('public/pqc-practice/dialogue.js');
  assert.doesNotMatch(dialogue, /中间通道/);
});

test('both laboratory entrypoints request updated styles and updated dialogue is versioned', async () => {
  for (const page of ['index.html', 'audit.html']) {
    assert.match(await read('public/pqc-practice/' + page), /studio\.css\?v=20261003-transport/);
  }
  assert.match(await read('public/pqc-practice/app.js'), /dialogue\.js\?v=20261002-usability/);
});

test('gallery presents honest fallback instructions and keyboard accessible zoom controls', async () => {
  const component = await read('app/models/ModelGallery.tsx');
  assert.match(component, /照片预览 · 使用下方按钮切换视角/);
  assert.match(component, /aria-label="放大模型"/);
  assert.match(component, /aria-label="缩小模型"/);
  assert.doesNotMatch(component, /role="img" tabIndex=/);
  assert.match(await read('app/models/models.css'), /height: clamp\(300px, calc\(100dvh - 405px\), 620px\)/);
  assert.doesNotMatch(await read('app/models/page.tsx'), /拖动旋转，滚轮或双指缩放/);
});
