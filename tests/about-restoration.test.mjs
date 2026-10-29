import test from 'node:test';
import assert from 'node:assert/strict';

const { default: worker } = await import('../dist/server/index.js');
const render = path => worker.fetch(new Request('https://example.test' + path), {
  ASSETS: { fetch: async () => new Response('missing', { status: 404 }) },
}, { waitUntil() {}, passThroughOnException() {} });

test('retired batch-workspace bookmarks return to the original laboratory', async () => {
  for (const path of ['/pqc-practice/interop', '/pqc-practice/interop.html']) {
    const response = await render(path);
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location'), 'https://example.test').pathname, '/pqc-practice/index.html');
  }
});

test('the personal card renders its original identity and links without requiring a GPU', async () => {
  const response = await render('/about');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Wang Yibiao 的悬浮个人名片/);
  assert.match(html, /data-identity-card/);
  for (const content of ['Wang Yibiao', '中电信量子集团', '山东大学', '返回 Wang Yibiao 的主页', '访问 Wang Yibiao 的 GitHub']) {
    assert.ok(html.includes(content), content);
  }
  assert.doesNotMatch(html, /金属反射未能启动|0001 2345 6789|pqc-practice\/interop/);
});

test('retained technical and life-reading pages no longer send visitors to the retired lab', async () => {
  for (const path of ['/topics/ml-kem', '/wo']) {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.doesNotMatch(html, /pqc-practice\/interop/);
    if (path.startsWith('/topics/')) assert.match(html, /pqc-practice\//);
  }
});
