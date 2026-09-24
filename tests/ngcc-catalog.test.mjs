import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = JSON.parse(readFileSync(new URL('../public/pqc-practice/ngcc-catalog.json', import.meta.url), 'utf8'));

test('the 2026 candidate catalog has every category and a distinct choice for each submitted instance', () => {
  const counts = { kem: 41, sig: 34, kex: 9, hash: 35 };
  const candidates = catalog.candidates;
  assert.equal(new Set(candidates.map(candidate => candidate.id)).size, 119);
  assert.deepEqual(Object.fromEntries(Object.keys(counts).map(kind => [kind, candidates.filter(item => item.type === kind).length])), counts);
  assert.equal(candidates.reduce((sum, candidate) => sum + candidate.parameters.length, 0), 586);

  for (const candidate of candidates) {
    assert.match(candidate.id, /^(kem|sign|kex|hash)-\d{2}$/);
    assert.equal(new URL(candidate.page).hostname, 'www.niccs.org.cn');
    assert.equal(new URL(candidate.archive).hostname, 'www.niccs.org.cn');
    assert.ok(candidate.parameters.length > 0, `${candidate.id} is missing parameter instances`);
    assert.equal(new Set(candidate.parameters.map(instance => instance.label)).size, candidate.parameters.length,
      `${candidate.id} has indistinguishable parameter labels`);
    for (const instance of candidate.parameters) {
      assert.ok(instance.name && instance.source);
      assert.ok(Object.keys(instance.sizes).length > 0);
      assert.ok(Object.values(instance.sizes).every(value => Number.isSafeInteger(value) && value >= 0));
      assert.ok(Object.values(instance.sizes).some(value => value > 0));
    }
  }
});
