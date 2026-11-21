import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { budget, rows } from '../research/experiments/2026-11-21/budget.mjs';

test('PQ-OWE published capture lengths become 802.11 lengths after subtracting metadata', () => {
  assert.deepEqual(budget(rows[0]).mac, [197, 193]);
  assert.deepEqual(budget(rows[2]).mac, [1393, 1293]);
  assert.deepEqual(budget(rows[2]).headroom, [107, 207]);
  assert.deepEqual(budget(rows[3]).headroom, [-281, -277]);
});

test('PQ-OWE incremental serialization reconciles byte and rate accounting', () => {
  assert.deepEqual(rows.map(row => budget(row).delta), [0, 1588, 2296, 3168]);
  const { elementOverhead, airtimeMs } = budget(rows[2]);
  assert.equal(elementOverhead, 24);
  assert.deepEqual(airtimeMs.map(ms => Number(ms.toFixed(4))), [18.368, 3.0613, 0.7653]);
});

test('PQ-OWE checked-in arithmetic is reproducible and bounded to non-RF evidence', () => {
  const report = JSON.parse(readFileSync('research/experiments/2026-11-21/result.json', 'utf8'));
  assert.deepEqual(report.results, rows.map(row => budget(row, report.limit, report.ratesMbps)));
  const entry = JSON.parse(readFileSync('research/2026-11-21-pq-owe-budget.json', 'utf8'));
  assert.match(entry.status, /未做实体无线实测/);
});
