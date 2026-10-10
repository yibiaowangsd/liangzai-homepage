import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import worker from '../news-worker/index.js';
import { newsEditionDate, searchPublishedNews } from '../public/assets/news-search.js';

test('article search covers the entire published archive and ranks relevant titles first', async t => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT,
    content TEXT, category TEXT, tags TEXT, source_name TEXT, published_at TEXT, status TEXT)`);
  const insert = db.prepare('INSERT INTO news VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 105; i++) insert.run(i + 1, `latest-${i}`, '普通新闻', null, '无关正文', 'security', null, null, '2026-10-10T00:00:00Z', 'published');
  insert.run(200, 'aws-title', 'AWS 部署进展', '标题命中', '云服务发布', 'migration', '[]', 'Amazon', '2026-10-09T00:00:00Z', 'published');
  insert.run(201, 'aws-summary', '边缘部署进展', 'AWS 混合部署', '正文', 'protocol', '[]', '发布方', '2026-10-10T00:00:00Z', 'published');
  insert.run(202, 'aws-body-old', '早期协议实现', null, '早期 AWS TLS 抗量子迁移实践，仅正文包含关键词', 'protocol', '["ML-KEM"]', '工程团队', '2026-08-01T00:00:00Z', 'published');
  insert.run(203, 'percent', '100%_实现', '字面字符', '正文', 'pqc', '[]', '发布方', '2026-10-10T00:00:00Z', 'published');
  insert.run(204, 'draft', 'AWS 未发布材料', 'AWS', '私有草稿正文', 'ai', '[]', '草稿', '2026-10-10T00:00:00Z', 'draft');
  const env = { DB: { prepare(sql) {
    const statement = db.prepare(sql);
    let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; } };
  } } };
  async function request(query) {
    return worker.fetch(new Request('https://api.wangyibiao.com/api/news/search?' + query, { headers: { Origin: 'https://wangyibiao.com' } }), env);
  }
  try {
    await t.test('AWS finds title, summary and older body-only matches beyond the first 100 articles', async () => {
      const response = await request('q=aws');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://wangyibiao.com');
      const payload = await response.json();
      assert.deepEqual(payload.data.map(item => item.slug), ['aws-title', 'aws-summary', 'aws-body-old']);
      assert.equal(payload.meta.total, 3);
      for (const item of payload.data) assert.equal('content' in item, false, 'Search responses stay small and contain no full bodies');
    });
    await t.test('multiple terms, Chinese text, tags and fullwidth input remain searchable', async () => {
      for (const query of ['AWS TLS', '抗量子迁移', 'ML-KEM']) {
        const payload = await (await request('q=' + encodeURIComponent(query))).json();
        assert.deepEqual(payload.data.map(item => item.slug), ['aws-body-old']);
      }
      const payload = await (await request('q=' + encodeURIComponent('  ＡＷＳ  '))).json();
      assert.equal(payload.meta.total, 3);
    });
    await t.test('a limited result retains the total match count; drafts never appear', async () => {
      const payload = await (await request('q=AWS&limit=1')).json();
      assert.equal(payload.data.length, 1);
      assert.equal(payload.meta.total, 3);
      assert.equal(payload.meta.limit, 1);
      assert.equal((await (await request('q=未发布材料')).json()).meta.total, 0);
      assert.equal((await (await request('q=新闻&limit=100')).json()).data.length, 20);
    });
    await t.test('wildcards and SQL fragments are literal and cannot broaden the result', async () => {
      assert.equal((await (await request('q=' + encodeURIComponent('%_'))).json()).meta.total, 1);
      const payload = await (await request('q=' + encodeURIComponent("' OR 1=1 --"))).json();
      assert.equal(payload.meta.total, 0);
    });
    await t.test('empty queries are empty; malformed and excessive query parameters are rejected', async () => {
      assert.equal((await (await request('q=')).json()).meta.total, 0);
      for (const query of ['q=AWS&q=TLS', 'q=' + 'a'.repeat(121), 'q=' + encodeURIComponent(Array(13).fill('a').join(' ')), 'q=AWS&limit=0', 'q=AWS&limit=1.5', 'q=AWS&limit=1&limit=2']) {
        assert.equal((await request(query)).status, 400, query);
      }
    });
  } finally { db.close(); }
});

test('search results open the article with a stable Beijing edition date', async () => {
  let request;
  const payload = await searchPublishedNews(' ＡＷＳ ', { fetcher: async (url, init) => {
    request = { url, init };
    return Response.json({ data: [{ slug: 'aws-story', title: 'AWS 新闻', summary: '内容', category: 'protocol', published_at: '2026-10-09T16:30:00Z', source_name: 'AWS' }], meta: { total: 1 } });
  } });
  assert.equal(request.url.searchParams.get('q'), 'AWS');
  assert.equal(request.init.cache, 'no-store');
  assert.equal(payload.results[0].href, '/news/aws-story?date=2026-10-10');
  assert.equal(newsEditionDate('2026-10-10T00:30:00+08:00'), '2026-10-10');
  assert.equal(newsEditionDate('invalid'), '');
});

test('search failures remain failures instead of becoming an empty successful search', async () => {
  await assert.rejects(searchPublishedNews('AWS', { fetcher: async () => new Response(null, { status: 503 }) }));
  await assert.rejects(searchPublishedNews('AWS', { fetcher: async () => Response.json({ data: null }) }));
  assert.deepEqual(await searchPublishedNews('  ', { fetcher: async () => { throw new Error('Should not request'); } }), { results: [], total: 0 });
});
