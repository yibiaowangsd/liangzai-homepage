import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('article introduces the observation and collapses a short source synopsis', async () => {
 const page = await read('app/news/[slug]/page.tsx');
 assert.ok(page.indexOf('className="article-observation"') < page.indexOf('className="article-source-excerpt"'));
 assert.match(page, /<details className="article-source-excerpt">/);
 assert.match(page, /日报日期 ·/);
 assert.match(page, /阅读原文/);
 assert.doesNotMatch(page, /article-hero-image|NewsBody content=\{item.content\}/);
});
test('news keeps day pagination and a category selector with tag context', async () => {
 const page = await read('app/news/page.tsx');
 assert.match(page, /className="news-category-menu"/);
 assert.match(page, /className="news-pagination" aria-label="新闻按日分页"/);
 assert.match(page, /className="news-tags" aria-label="标签筛选"/);
 assert.match(page, /newsListingHref\(\{page, category, tag\}\)/);
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
