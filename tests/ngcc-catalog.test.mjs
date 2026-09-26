import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NGCC_REPORTS } from '../public/pqc-practice/ngcc-reports.js';
import { NGCC_KEX_WASM } from '../public/pqc-practice/ngcc-kex-runtime.js';

const catalog = JSON.parse(readFileSync(new URL('../public/pqc-practice/ngcc-catalog.json', import.meta.url), 'utf8'));
const reports = JSON.parse(readFileSync(new URL('../public/pqc-practice/ngcc-report-index.json', import.meta.url), 'utf8'));

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
    assert.ok(Array.isArray(candidate.team) && candidate.team.length > 0, `${candidate.id} is missing its submitters`);
    assert.ok(candidate.team.every(person => typeof person === 'string' && person.trim()), `${candidate.id} has an invalid submitter`);
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

test('the report snapshot covers all published findings and never counts withdrawn records as active', () => {
  const candidates = new Set(catalog.candidates.map(item => item.id));
  const ids = new Set(reports.findings.map(item => item.id));
  const active = reports.findings.filter(item => item.status !== 'Withdrawn');
  assert.equal(ids.size, reports.findings.length);
  assert.equal(active.length, reports.active_findings);
  assert.equal(reports.findings.length - active.length, reports.withdrawn_records);
  assert.equal(new Set(active.map(item => item.candidateId)).size, reports.reported_candidates);
  for (const item of reports.findings) {
    assert.ok(candidates.has(item.candidateId), `missing ${item.candidateId}`);
    assert.ok(item.id.startsWith(`${item.candidateId}-`));
    assert.ok(/^20\d\d-\d\d-\d\d$/.test(item.updated));
  }
  for (const note of Object.values(NGCC_REPORTS).flat()) assert.ok(ids.has(note.id), `${note.id} lost its source`);
});

test('runnable key exchanges expose a valid number of protocol rounds and message sizes', () => {
  for (const candidate of catalog.candidates.filter(item => item.type === 'kex')) {
    candidate.parameters.forEach((parameter, index) => {
      if (!NGCC_KEX_WASM[candidate.id]?.[index]) return;
      assert.ok([2, 4].includes(parameter.sizes.Passes), `${candidate.id} ${index}`);
      assert.ok(parameter.sizes.TotalMessageBytes > 0);
      assert.ok(parameter.sizes.InitiatorStateBytes > 0);
      assert.ok(parameter.sizes.ResponderStateBytes > 0);
    });
  }
});
