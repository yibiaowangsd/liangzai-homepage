import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('article places a compact source mark and date caveat with one takeaway before the body', async () => {
  const page = await read('app/news/[slug]/page.tsx');
  const css = await read('app/news/news.css');
  assert.equal((page.match(/className="article-deck"/g) || []).length, 1);
  assert.ok(page.indexOf('className="article-reading-start"') < page.indexOf('<NewsBody content={item.content}'));
  assert.match(page, /日报日期 ·/);
  assert.match(page, /原始发布日期见正文/);
  assert.match(page, /原文编译与「量仔观察」分别呈现/);
  assert.match(css, /\.article-hero-image > \.story-image-frame\s*\{\s*height: 80px/);
  assert.match(css, /font-size: clamp\(28px, 3\.4vw, 40px\)/);
  assert.doesNotMatch(css, /height: clamp\(280px, 34vw, 460px\)/);
});

test('daily toolbar contains date navigation without replacing archive pagination', async () => {
  const page = await read('app/news/page.tsx');
  assert.match(page, /className="news-day-controls" aria-label="本期日期与日刊切换"/);
  assert.match(page, /className="news-category-menu"/);
  assert.match(page, /className="news-pagination" aria-label="新闻按日分页"/);
  assert.match(page, /href=\{makeHref\(Math\.max\(meta\.page - 1, 1\)\)\}/);
  assert.match(page, /href=\{makeHref\(Math\.min\(meta\.page \+ 1, meta\.totalPages\)\)\}/);
});

test('observatory save and share sit above the workbench in a sticky action shelf', async () => {
  const page = await read('app/observatory/Observatory.tsx');
  const css = await read('app/observatory/observatory.css');
  assert.ok(page.indexOf('className="art-actionbar"') < page.indexOf('className="art-workbench"'));
  assert.equal((page.match(/onClick=\{saveImage\}/g) || []).length, 1);
  assert.equal((page.match(/onClick=\{copyLink\}/g) || []).length, 1);
  assert.match(css, /\.art-actionbar\s*\{\s*position: sticky/);
  assert.match(css, /var\(--theme-on-accent\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('audit table scrolling is bounded and keyboard reachable without changing data or exports', async () => {
  const html = await read('public/pqc-practice/audit.html');
  const css = await read('public/pqc-practice/audit-layout.css');
  assert.match(html, /audit-layout\.css/);
  assert.match(html, /class="audit-table-scroll"[^>]*tabindex="0"/);
  assert.match(css, /max-height: min\(640px, 62dvh\)/);
  assert.match(css, /overflow: auto/);
  assert.match(html, /id="audit-export"/);
});
