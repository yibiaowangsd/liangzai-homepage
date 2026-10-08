import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { signalSummary, selectHomeSignals } from '../app/site/home-signals.ts';
import { notes } from '../app/notes/notes.ts';

// Vinext captures the original fetch during module evaluation. Install one
// dispatcher before importing the Worker so each case controls that same fetch.
const nativeFetch = globalThis.fetch;
let respond = async () => Response.json({ data: [] });
globalThis.fetch = (...args) => respond(...args);
const { default: worker } = await import('../dist/server/index.js');
after(() => { globalThis.fetch = nativeFetch; });
const get = path => worker.fetch(new Request('https://wangyibiao.com' + path), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });

test('home excerpts stay short in HTML without breaking unicode or including the full abstract', () => {
  assert.equal(signalSummary('第一句。第二句包含更多细节。'), '第一句。');
  assert.equal(signalSummary(null), '阅读原始来源与完整编译。');
  assert.equal(Array.from(signalSummary('😀'.repeat(100))).length, 64);
  assert.ok(signalSummary('😀'.repeat(100)).endsWith('…'));
  assert.equal(signalSummary('ML-KEM at 1.25 ms。Details'), 'ML-KEM at 1.25 ms。');
  assert.deepEqual(selectHomeSignals(undefined), []);
  assert.deepEqual(selectHomeSignals([null, {category:'pqc'}, {category:'ai',title:'Not core',slug:'ai'}]), []);
});

test('homepage remains useful without the news API, including empty and malformed responses', async () => {
  for (const payload of [null, {data:[]}, {data:null}, {data:[{category:'ai',title:'Other',slug:'other'}]}]) {
    let calls = 0;
    respond = async () => {
      calls++;
      if (payload === null) throw new Error('offline');
      return Response.json(payload);
    };
    const response = await get('/');
    assert.equal(response.status,200);
    const html = await response.text();
    assert.ok(calls > 0, 'the upstream request must use this case’s fixture');
    assert.match(html, /显示构建快照/);
    assert.equal((html.match(/class="portal-signal-card"/g)||[]).length,3);
    assert.match(html,/AI 辅助选编/);
    assert.match(html,/<time dateTime="2026-/);
    const jsonld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.equal(JSON.parse(jsonld[1])['@type'],'Person');
    for (const excerpt of html.matchAll(/<p class="portal-signal-summary">(.*?)<\/p>/gs)) assert.ok(Array.from(excerpt[1]).length <= 64);
    assert.doesNotMatch(html,/正在读取最新简报|vault-entrance-v2/);
  }
});

test('every selected work note resolves, includes an English abstract and enters the sitemap', async () => {
  respond = async () => Response.json({data:[]});
  for(const note of notes) {
    const response=await get('/notes/'+note.slug); assert.equal(response.status,200);
    const html=await response.text(); assert.ok(html.includes(note.title)); assert.match(html,/id="abstract" lang="en"/); assert.match(html,/复现与来源/);
  }
  assert.equal((await get('/notes/not-a-note')).status,404);
  const sitemap=await (await get('/sitemap.xml')).text();
  for(const note of notes) assert.ok(sitemap.includes('/notes/'+note.slug));
});
