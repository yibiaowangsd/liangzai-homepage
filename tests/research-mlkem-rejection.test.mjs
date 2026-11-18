import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const entry = JSON.parse(readFileSync('research/2026-11-18-mlkem-rejection.json', 'utf8'));
const results = JSON.parse(readFileSync('research/experiments/2026-11-18/results.json', 'utf8'));
test('ML-KEM notebook preserves evidence scope and all parameter sets', () => {
  assert.equal(results.total, 24);
  assert.equal(results.passed, 24);
  assert.match(results.openssl, /OpenSSL 3\.5\.7/);
  for (const parameter of [512, 768, 1024]) {
    const checks = results.checks.filter(c => c.parameter === parameter);
    assert.equal(checks.length, 8);
    assert.ok(checks.every(c => c.pass));
  }
  assert.match(entry.status, /真实协议与侧信道测试待执行/);
  assert.match(entry.sources.find(s => s.id === '2').version, /研究组 Internet-Draft -00/);
  assert.equal(entry.sections.find(s => s.id === 'actual-tests').table.rows.length, 8);
  assert.match(entry.sections.find(s => s.id === 'next-tests').title, /全部待执行/);
  assert.ok(entry.sections.find(s => s.id === 'contract').table.rows.some(row => row[0] === '解封装调用成功，且输出长度符合约定'));
});
