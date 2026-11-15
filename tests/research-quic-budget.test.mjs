import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const article = JSON.parse(readFileSync('research/2026-11-14-quic-pqc-flight-budget.json','utf8'));
const result = JSON.parse(readFileSync('research/experiments/2026-11-14/budget-results.json','utf8'));
test('QUIC budget model remains arithmetic, with auditable assumptions', () => {
  assert.equal(result.kind, 'arithmetic_model_not_protocol_measurement');
  assert.equal(result.rows.length,9);
  for (const r of result.rows) {
    assert.equal(r.unvalidated_budget_bytes,3*r.received_udp_payload_bytes);
    assert.equal(r.shortfall_bytes,Math.max(0,r.server_target_wire_bytes-r.unvalidated_budget_bytes));
  }
  assert.equal(result.mldsa65_two_cert_plus_cv_plus_hybrid_share_lower_bound_bytes,14951);
  const matrix=article.sections.find(s=>s.id==='experiment-matrix');
  assert.equal(matrix.table.rows.length,10);
  assert.ok(matrix.table.rows.every(r=>r[0].startsWith('待执行')));
  assert.match(article.status,/协议实测待执行/);
});
test('new QUIC research and listing render without a production fetch', async () => {
  const {default:worker}=await import('../dist/server/index.js');
  for (const path of ['/research','/research/'+article.slug]) {
    const response=await worker.fetch(new Request('https://example.test'+path),{ASSETS:{fetch:async()=>new Response('missing',{status:404})}},{waitUntil(){},passThroughOnException(){}});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.ok(html.includes(article.title));
    if(path!='/research') {
      assert.match(html,/14951/);
      assert.match(html,/待执行 Q10/);
      assert.match(html,/source-9/);
    }
  }
});
