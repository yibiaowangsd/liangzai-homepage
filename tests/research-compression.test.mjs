import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
test('certificate compression synthetic checks reproduce and expose expansion',()=>{
 const run=spawnSync('python3',['research/experiments/2026-11-17/compression.py'],{encoding:'utf8',timeout:10000});
 assert.equal(run.status,0,run.stderr); const r=JSON.parse(run.stdout);
 const saved=JSON.parse(readFileSync('research/experiments/2026-11-17/results.json','utf8'));
 assert.deepEqual(r.checks,saved.checks); assert.equal(r.passed,16);
 assert.ok(r.samples.find(s=>s.name==='hash-derived-8192').net_saved_bytes<0);
 assert.ok(r.samples.every(s=>s.body_bytes===8201));
});
test('compression notebook distinguishes synthetic evidence and pending TLS tests',()=>{
 const e=JSON.parse(readFileSync('research/2026-11-17-certificate-compression.json','utf8'));
 assert.match(e.status,/真实证书及 TLS 互通待执行/);
 assert.ok(e.sections.find(s=>s.id==='test-matrix').table.rows.every(r=>r[0]==='待执行'));
 assert.match(e.sources.find(s=>s.id==='6').note,/不能/);
});
