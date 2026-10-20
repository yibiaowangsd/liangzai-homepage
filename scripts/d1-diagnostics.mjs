// Read-only production evidence. Never exports subscriber rows, tokens or bodies.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { getNewsSearch, parseNewsSearch } from '../news-worker/news-search.js';
import { editionDatesSql } from '../news-worker/news-queries.js';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const output = process.env.D1_REPORT_DIR || 'outputs/d1';
const sampleDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const report = { captured_at: new Date().toISOString(), commit: process.env.GITHUB_SHA, probes: [], queries: {}, unavailable: [] };
await mkdir(output, { recursive: true });
async function api(path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok || data.success === false || data.errors?.length) throw new Error(JSON.stringify(data.errors || { status: response.status }));
  return data.result ?? data;
}
async function attempt(label, fn) {
  try { return await fn(); } catch (error) { report.unavailable.push({ label, reason: error.message }); return null; }
}
const paths = ['/api/health', '/api/news/featured?limit=8', '/api/news/editions?page=1&pageSize=1', '/api/news/editions?page=2', '/api/news/search?q=AWS', '/api/news/search?q=tongsuo', '/api/subscriptions', '/api/robot-subscriptions'];
// Repeat a few URLs to verify actual cache hits without artificial load.
paths.push('/api/news/featured?limit=8', '/api/news/editions?page=1&pageSize=1', '/api/news/search?q=AWS', '/api/news/search?q=tongsuo');
// Sequential, small fixed sample; no load test against the free quota.
for (const path of paths) {
  await attempt(path, async () => {
    const start = performance.now();
    const response = await fetch(`https://api.wangyibiao.com${path}`, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'curl/8.5.0' } });
    const body = await response.text();
    let data; try { data = JSON.parse(body); } catch { /* WAF response */ }
    report.probes.push({ path, status: response.status, elapsed_ms: Math.round(performance.now() - start),
      cache: response.headers.get('X-News-Cache'), rows_read: response.headers.get('X-News-Rows-Read'),
      server_timing: response.headers.get('Server-Timing'), date: response.headers.get('Date'),
      health: path === '/api/health' ? data : undefined,
      meta: data?.meta, count: Array.isArray(data?.data) ? data.data.length : undefined,
      error: data?.error, message: data?.message, sample: !data ? body.slice(0, 100) : undefined });
  });
}
if (!account || !token) report.unavailable.push({ label: 'Cloudflare metrics', reason: 'Cloudflare credentials not configured' });
else {
  const databases = await attempt('database list', () => api(`/accounts/${account}/d1/database`));
  const database = databases?.find(row => row.name === 'liangzai-news-prod');
  if (database) {
    const query = (sql, params = []) => api(`/accounts/${account}/d1/database/${database.uuid}/query`, { sql, params });
    report.schema = await attempt('schema', () => query("SELECT name, type, sql FROM sqlite_master WHERE tbl_name IN ('news','news_editions') ORDER BY type, name"));
    report.inventory = await attempt('news inventory', () => query("SELECT status, count(*) AS articles, min(published_at) AS oldest, max(published_at) AS newest FROM news GROUP BY status"));
    const probes = {
      edition_dates: [editionDatesSql(null, true), []],
      category_dates: [editionDatesSql('pqc', true), ['pqc']],
      edition_rows: ["SELECT id, slug, title, summary, category, tags, source_name, source_url, cover_image, published_at FROM news WHERE status = 'published' AND date(published_at, '+8 hours') IN (?) ORDER BY published_at DESC, id DESC", [sampleDate]],
      digest_rows: ["SELECT slug, title, summary, category, source_name, source_url, published_at, status FROM news WHERE status = 'published' AND date(published_at, '+8 hours') = ? ORDER BY published_at DESC, id DESC", [sampleDate]],
    };
    for (const term of ['AWS', 'tongsuo']) {
      const capture = { prepare(sql) { return { bind(...params) { probes[`search_${term}`] = [sql, params]; return this; }, async all() { return { results: [] }; } }; } };
      await getNewsSearch({ DB: capture }, parseNewsSearch(new URLSearchParams({ q: term })));
    }
    for (const [label, [sql, params]] of Object.entries(probes)) {
      report.queries[label] = await attempt(label, async () => {
        const plan = await query('EXPLAIN QUERY PLAN ' + sql, params);
        const result = await query(sql, params);
        return { plan: plan.map(row => row.results), executions: result.map(row => ({ meta: row.meta, returned: row.results?.length })) };
      });
    }
    for (const sort of ['reads', 'count']) {
      await attempt(`insights_${sort}`, async () => {
        const child = spawnSync('npx', ['--yes', 'wrangler@4.92.0', 'd1', 'insights', database.name, '--time-period=1d', '--sort-type=sum', `--sort-by=${sort}`, '--limit=10', '--json'], { encoding: 'utf8', timeout: 60000, maxBuffer: 2e6 });
        if (child.status !== 0) throw new Error((child.stderr || child.stdout).slice(-1200));
        const start = child.stdout.indexOf('[');
        report[`insights_${sort}`] = JSON.parse(child.stdout.slice(start));
      });
    }
  }
  await attempt('daily D1 analytics', async () => {
    const data = await api('/graphql', { query: `query($account: string!, $start: Date!, $end: Date!) { viewer { accounts(filter: { accountTag: $account }) { d1AnalyticsAdaptiveGroups(limit: 100, filter: {date_geq: $start, date_leq: $end}, orderBy: [date_DESC]) { dimensions { date databaseId } sum { rowsRead rowsWritten readQueries writeQueries } } } } }`,
      variables: { account, start: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) } });
    report.daily_d1 = data.data?.viewer?.accounts;
  });
  await attempt('Worker request volume', async () => {
    const data = await api('/graphql', { query: `query($account: string!, $start: Time!, $end: Time!) { viewer { accounts(filter: {accountTag: $account}) { workersInvocationsAdaptive(limit: 100, filter: {datetime_geq: $start, datetime_leq: $end, scriptName: "liangzai-news-api"}) { dimensions { scriptName } sum { requests errors subrequests } } } } }`,
      variables: { account, start: new Date(Date.now() - 86400000).toISOString(), end: new Date().toISOString() } });
    report.worker_requests = data.data?.viewer?.accounts;
  });
  await attempt('HTTP request sources', async () => {
    const zones = await api('/zones?name=wangyibiao.com');
    const zone = zones.find(row => row.name === 'wangyibiao.com');
    if (!zone) throw new Error('Zone is not accessible to the existing token');
    const data = await api('/graphql', { query: `query($zone: string!, $start: Time!, $end: Time!) { viewer { zones(filter: {zoneTag: $zone}) { httpRequestsAdaptiveGroups(limit: 20, filter: {datetime_geq: $start, datetime_leq: $end, clientRequestHTTPHost: "api.wangyibiao.com"}, orderBy: [count_DESC]) { count dimensions { clientRequestPath userAgent edgeResponseStatus } } } } }`,
      variables: { zone: zone.id, start: new Date(Date.now() - 86400000).toISOString(), end: new Date().toISOString() } });
    report.http_sources = data.data?.viewer?.zones;
  });
  await attempt('Worker read telemetry', async () => {
    // Aggregate public-news logs only; never export raw requests or headers.
    const timeframe = { from: Date.now() - 3600000, to: Date.now() };
    const keys = await api(`/accounts/${account}/workers/observability/telemetry/keys`, { from: timeframe.from, to: timeframe.to, limit: 1000 });
    const keyRows = Array.isArray(keys) ? keys : keys.keys || [];
    report.telemetry_keys = keyRows.filter(row => /(^|\.)(event|route|cache|rows_read|elapsed_ms)$/.test(row.key)).map(({ key, type }) => ({ key, type }));
    await attempt('Worker invocation sources', async () => {
      // Only aggregate paths, user agents and statuses. Do not export IPs,
      // full URLs, request headers, subscription tokens or individual events.
      const known = new Set(keyRows.map(row => row.key));
      const dimensions = ['$workers.event.path', '$workers.event.request.headers.user-agent', '$workers.event.response.status'];
      if (!dimensions.every(key => known.has(key)) || !known.has('$workers.scriptName')) throw new Error('Invocation source fields are not indexed yet');
      const data = await api(`/accounts/${account}/workers/observability/telemetry/query`, {
        queryId: crypto.randomUUID(), view: 'calculations', timeframe, chartType: 'aggregate', dry: true,
        parameters: { filters: [
          { key: '$workers.scriptName', operation: 'eq', type: 'string', value: 'liangzai-news-api' },
          { key: '$metadata.type', operation: 'eq', type: 'string', value: 'cf-worker-event' },
        ], groupBys: dimensions.map(value => ({ value, type: value.endsWith('.status') ? 'number' : 'string' })), calculations: [{ operator: 'count' }], limit: 40 },
      });
      report.invocation_sources = data.calculations?.map(({ calculation, aggregates }) => ({ calculation, aggregates }));
    });
    const field = name => {
      const entry = keyRows.find(row => row.key === name || row.key.endsWith('.' + name));
      if (!entry) throw new Error(`No indexed telemetry field for ${name} yet`);
      return entry.key;
    };
    const data = await api(`/accounts/${account}/workers/observability/telemetry/query`, {
      queryId: crypto.randomUUID(), view: 'calculations',
      timeframe, chartType: 'aggregate', dry: true,
      parameters: {
        filters: [{ key: field('event'), operation: 'eq', type: 'string', value: 'news_read' }],
        groupBys: [{ type: 'string', value: field('route') }, { type: 'string', value: field('cache') }],
        calculations: [{ operator: 'count' }, { operator: 'sum', key: field('rows_read'), keyType: 'number' }, { operator: 'avg', key: field('elapsed_ms'), keyType: 'number' }], limit: 100 },
    });
    report.read_telemetry = { calculations: data.calculations?.map(({ calculation, aggregates }) => ({ calculation, aggregates })) };
  });
}
const expected = process.env.EXPECTED_NEWS_SHA;
report.verification = {
  public_endpoints_ok: report.probes.length === paths.length && report.probes.every(row => row.status === 200),
  cache_hit_observed: report.probes.some(row => row.cache === 'HIT' && row.rows_read === '0'),
  release_matches: expected ? report.probes.find(row => row.path === '/api/health')?.health?.news_release === expected : null,
};
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (expected && (!report.verification.public_endpoints_ok || !report.verification.release_matches)) process.exitCode = 1;
