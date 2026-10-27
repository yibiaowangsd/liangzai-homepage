import test from 'node:test';
import assert from 'node:assert/strict';
test('built dossiers render archived evidence; the local life reader ships no private or invented records', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  async function render(path) {
    const response = await worker.fetch(new Request('https://example.test' + path), { ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    return { status: response.status, html: await response.text() };
  }
  const list = await render('/topics');
  assert.equal(list.status, 200); assert.match(list.html, /技术进展档案/); assert.match(list.html, /UVW-KEM/);
  const topic = await render('/topics/uvw-kem');
  assert.equal(topic.status, 200); assert.match(topic.html, /kem-38-8/); assert.match(topic.html, /2026-09-26/); assert.match(topic.html, /快照之后/);
  assert.equal((await render('/topics/does-not-exist')).status, 404);
  const life = await render('/wo');
  assert.equal(life.status, 200); assert.match(life.html, /选择记录文件夹/); assert.match(life.html, /webkitdirectory/); assert.match(life.html, /本页内存/);
  assert.doesNotMatch(life.html, /合成片段|合成偏好|wo-life-data\/wo\/days/);
});
