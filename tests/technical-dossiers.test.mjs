import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildTopicIndex } from '../scripts/generate-topics.mjs';
import { canonicalSource, topicsForStory, unreadEvents } from '../news/topics.js';
import { readTracking } from '../app/topics/tracking.ts';
const reports = { reviewed_utc: '2026-09-26', source_updated_utc: '2026-09-25 16:35:53', findings: [] };
const story = (slug, title, source_url, extra = {}) => ({ slug, title, summary: title, content: '', source_url, source_name: 'Primary source', status: 'published', category: 'pqc', ...extra });

test('topic associations retain AIGIS+ and TLS boundaries without inferring security claims', () => {
  assert.deepEqual(topicsForStory({ title: 'Aigis-Enc+ 修订' }).map(x => x.slug), ['aigis-plus']);
  assert.equal(topicsForStory({ title: 'Aigis-Enc old implementation' }).length, 0);
  assert.equal(topicsForStory({ title: 'TLCP certificate' }).length, 0);
  assert.equal(topicsForStory({ title: '模型训练隔离测试', summary: '微虚拟机红队结果', content: '附带说明出网采用TLS代理。' }).length, 0);
  assert.equal(topicsForStory({ title: 'TLS漏洞修复', summary: '传统TLS部署中的安全更新' }).length, 0);
  assert.deepEqual(topicsForStory({ title: 'X25519MLKEM768 部署' }).map(x => x.slug), ['ml-kem', 'tls']);
  assert.deepEqual(topicsForStory({ title: 'UVW-KEM-128 kem-38-8' }).map(x => x.slug), ['uvw-kem']);
});
test('archive groups repeat coverage by primary source while preserving distinct report anchors', () => {
  const index = buildTopicIndex([
    { date: '2026-10-01', items: [story('first', 'ML-KEM finding', 'https://example.org/report?utm_source=a#one'), story('other', 'ML-KEM second finding', 'https://example.org/report#two')] },
    { date: '2026-10-03', items: [story('revision', 'ML-KEM finding revised', 'https://example.org/report#one'), story('draft', 'ML-KEM unpublished', 'https://example.org/draft', { status: 'draft' })] },
  ], reports);
  const topic = index.topics.find(x => x.slug === 'ml-kem');
  assert.equal(topic.events.length, 2);
  assert.equal(topic.events[0].revisions.length, 2);
  assert.deepEqual(topic.events[0].editionDates, ['2026-10-01', '2026-10-03']);
  assert.equal(topic.events[0].firstDate, '2026-10-01');
  assert.equal(topic.events[0].slug, 'revision');
  assert.equal(canonicalSource('javascript:alert(1)'), '');
});
test('an edit to an old-dated story becomes unread even when its date is unchanged', () => {
  const make = title => buildTopicIndex([{ date: '2026-10-01', items: [story('same', title, 'https://example.org/paper')] }], reports).topics[0].events;
  const old = make('ML-KEM draft'), seen = { [old[0].id]: old[0].version };
  assert.equal(unreadEvents(old, seen).length, 0);
  const next = make('ML-KEM revised');
  assert.equal(next[0].id, old[0].id);
  assert.equal(unreadEvents(next, seen).length, 1);
});
test('the current UVW dossier keeps the newer report beside the dated laboratory snapshot', async () => {
  const data = JSON.parse(await readFile(new URL('../app/topics/topic-index.json', import.meta.url), 'utf8'));
  const uvw = data.topics.find(x => x.slug === 'uvw-kem');
  assert.ok(uvw.events.some(event => /kem-38-8/.test(event.summary)));
  assert.equal(uvw.reportSnapshot.reviewed, '2026-09-26');
  assert.ok(uvw.reportSnapshot.findings.every(item => item.candidateId === 'kem-38'));
  assert.ok(uvw.events.some(event => event.date > uvw.reportSnapshot.sourceUpdated.slice(0, 10)));
});
test('corrupt local tracking cannot turn content into read state or crash the page', () => {
  assert.deepEqual(readTracking('not json'), {});
  assert.deepEqual(readTracking('[]'), {});
  assert.deepEqual(readTracking('{"ml-kem":{"followed":true,"seen":{"bad":"wrong"}}}'), { 'ml-kem': { followed: true, seen: {} } });
});
