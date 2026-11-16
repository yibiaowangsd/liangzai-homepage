import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { baselineRow, defaultMachine, defaultVersion, libraryVersions, speedRows } from '../app/tracking/benchmark.ts';

const fixtures = new URL('../app/tracking/data/', import.meta.url);
const catalog = Object.assign({}, ...await Promise.all(
  (await readdir(fixtures)).map(async file => JSON.parse(await readFile(new URL(file, fixtures), 'utf8'))),
));
const bench = JSON.parse(await readFile(new URL('../public/assets/tracking/benchmarks-2026-11-09.json', import.meta.url), 'utf8'));

function flatten(nodes) {
  return nodes.flatMap(node => typeof node === 'string' ? [] : [node, ...flatten(node.children)]);
}

test('catalog links target registered pages and existing sections', () => {
  const pages = new Map(Object.entries(catalog).map(([path, page]) => [path, flatten([...page.nodes, ...(page.meta ?? [])])]));
  const generatedAnchors = new Map([['performance', new Set(['method'])]]);
  for (const [path, page] of Object.entries(catalog)) {
    if (page.benchmark) generatedAnchors.set(path, new Set(['perf']));
  }
  const base = 'https://example.test/tracking';
  for (const [path, nodes] of pages) {
    for (const node of nodes) {
      if (!node.href?.match(/^(#|\/tracking)/)) continue;
      const href = new URL(node.href, base + (path ? '/' + path : ''));
      const linkedPath = href.pathname.slice('/tracking'.length).replace(/^\//, '');
      const section = decodeURIComponent(href.hash.slice(1));
      assert.ok(pages.has(linkedPath), linkedPath);
      assert.ok(!section || pages.get(linkedPath).some(target => target.id === section)
        || generatedAnchors.get(linkedPath)?.has(section), path + ' → ' + node.href);
    }
  }
});

test('benchmark rows preserve measured values and resolve compatible baselines', () => {
  assert.equal(bench.schema_version, 1);
  assert.equal(new Set(bench.results.map(row => row.slice(0, 4).join('/'))).size, bench.results.length);
  assert.ok(bench.results.length > 10_000);
  for (const [machine, library, algorithm, operation, rate] of bench.results) {
    assert.ok(bench.machines[machine] && bench.libraries[library] && bench.algorithms[algorithm] && bench.operations[operation]);
    assert.ok(Number.isFinite(rate) && rate > 0);
  }

  const machine = defaultMachine(bench);
  const rows = speedRows(bench, machine);
  assert.match(bench.machines[machine].key, /8255c/);
  const library = defaultVersion(bench, libraryVersions(bench, machine).get('liboqs'));
  const mlKem512 = bench.algorithms.findIndex(algorithm => algorithm.parameters === 'ML-KEM-512');
  const measurement = rows.find(row => row.library === library && row.algorithm === mlKem512);
  assert.equal(Math.round(measurement.values.keygen), 114732);
  const x25519 = bench.algorithms.findIndex(algorithm => algorithm.parameters === 'X25519');
  const baseline = baselineRow(bench, rows, x25519);
  assert.ok(baseline.values.encaps > 0);
  assert.equal(bench.libraries[baseline.library].name, 'openssl');
});

test('production routes render the catalog, selected filters and search', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  async function render(path) {
    const response = await worker.fetch(new Request('https://example.test' + path), {
      ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    }, { waitUntil() {}, passThroughOnException() {} });
    return { status: response.status, text: await response.text() };
  }
  for (const path of Object.keys(catalog)) {
    const route = '/tracking' + (path ? '/' + path : '');
    const page = await render(route);
    assert.equal(page.status, 200, route);
    assert.ok(page.text.includes('<h1'), route);
  }

  const products = await render('/tracking/products?scene=ssh');
  assert.match(products.text, /id="directory-panel-ssh"/);
  assert.doesNotMatch(products.text, /id="directory-panel-tls"/);
  const policies = await render('/tracking/policies?region=cn');
  assert.match(policies.text, /id="cn-title"/);
  assert.doesNotMatch(policies.text, /id="timeline-section"|id="hk-title"/);
  const search = await render('/tracking/search?q=RFC%209954');
  assert.match(search.text, /href="\/tracking\/protocols\/tls"/);
  assert.equal((await render('/tracking/protocols/unknown')).status, 404);
});
