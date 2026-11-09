import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
const entries = readdirSync('research').filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(`research/${name}`, 'utf8')));
test('research entries have unique routes and auditable evidence', () => {
  assert.ok(entries.length);
  assert.equal(new Set(entries.map(e => e.slug)).size, entries.length);
  for (const e of entries) {
    assert.match(e.slug, /^[a-z0-9-]+$/);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const k of ['title','subtitle','question','status','scope']) assert.ok(e[k]?.length > 5, k);
    assert.ok(e.process.length >= 3);
    assert.ok(e.sections.length >= 6);
    const ids = e.sections.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => !['question','process','sources','revisions'].includes(id)));
    assert.ok(e.sources.length >= 3);
    const sourceIds = new Set(e.sources.map(s => s.id));
    assert.equal(sourceIds.size, e.sources.length);
    for (const [, id] of JSON.stringify(e.sections.map(section => ({ ...section, code: undefined }))).matchAll(/\[(S?\d+)\]/g)) assert.ok(sourceIds.has(id), `unresolved citation ${id}`);
    for (const s of e.sources) { assert.equal(new URL(s.url).protocol, 'https:'); assert.ok(s.version && s.note); }
    for (const s of e.sections) if (s.table) for (const row of s.table.rows) assert.equal(row.length, s.table.headers.length);
    assert.ok(e.revisions.length);
  }
});
test('first notebook never presents planned tests as completed measurements', () => {
  const e = entries.find(e => e.slug === 'tls-hybrid-binding-and-downgrade');
  assert.match(e.status, /实测待执行/);
  const matrix = e.sections.find(s => s.id === 'test-matrix');
  assert.equal(matrix.table.rows.length, 12);
  assert.ok(matrix.table.rows.every(row => row[0].includes('待执行')));
});
test('built research routes render evidence and reject unknown slugs', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  async function render(path) {
    const response = await worker.fetch(new Request('https://example.test' + path), { ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    return { status: response.status, html: await response.text() };
  }
  const list = await render('/research');
  assert.equal(list.status, 200); assert.match(list.html, /把它研究透/);
  for (const entry of entries) {
    const page = await render(`/research/${entry.slug}`);
    assert.equal(page.status, 200);
    assert.ok(page.html.includes(entry.title));
    assert.ok(list.html.includes(entry.title));
  }
  const article = await render('/research/tls-hybrid-binding-and-downgrade');
  assert.equal(article.status, 200); assert.match(article.html, /实测待执行/); assert.match(article.html, /RFC 10024/); assert.match(article.html, /T12/); assert.match(article.html, /不含封装字段/);
  assert.equal((await render('/research/does-not-exist')).status, 404);
});

test('IKE notebook preserves erratum status and unexecuted test boundaries', () => {
  const e = entries.find(e => e.slug === 'ikev2-hybrid-key-epochs-and-fragmentation');
  assert.match(e.status, /未执行/);
  assert.match(JSON.stringify(e.sections), /Held for Document Update/);
  const matrix = e.sections.find(s => s.id === 'negative-tests');
  assert.equal(matrix.table.rows.length, 7);
  assert.match(matrix.title, /待执行/);
});
