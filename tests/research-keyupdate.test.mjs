import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const article = JSON.parse(readFileSync('research/2026-11-15-tls-keyupdate-recovery.json','utf8'));
test('keyupdate experiment reruns all 16 checks and matches committed output',()=>{
 const run=spawnSync('python3',['research/experiments/2026-11-15/keyupdate.py'],{encoding:'utf8',timeout:10000});
 assert.equal(run.status,0,run.stderr);
 const actual=JSON.parse(run.stdout), expected=JSON.parse(readFileSync('research/experiments/2026-11-15/results.json','utf8'));
 delete actual.python;delete expected.python;
 assert.deepEqual(actual,expected);assert.equal(actual.passed,16);
 assert.equal(actual.generations.length,8);
});
test('recovery article keeps draft and experiment claims bounded',()=>{
 assert.match(article.scope,/RFC 9846/);
 assert.match(article.status,/协议实测待执行/);
 assert.equal(article.sections.find(s=>s.id==='test-matrix').table.rows.length,12);
 assert.ok(article.sections.find(s=>s.id==='test-matrix').table.rows.every(r=>r[0].includes('待执行')));
 assert.match(article.sources.find(s=>s.id==='2').version,/非 RFC/);
});
test('built recovery route is registered and exposes evidence',async()=>{
 const {default:worker}=await import('../dist/server/index.js');
 const response=await worker.fetch(new Request('https://example.test/research/'+article.slug),{ASSETS:{fetch:async()=>new Response('missing',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);const html=await response.text();
 assert.match(html,/16 项/);assert.match(html,/协议实测待执行/);assert.match(html,/T12/);
 assert.match(html,/draft-ietf-tls-extended-key-update-14/);
});
