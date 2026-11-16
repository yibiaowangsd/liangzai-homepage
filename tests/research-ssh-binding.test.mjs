import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const article=JSON.parse(readFileSync('research/2026-11-16-ssh-binding.json','utf8'));
test('SSH encoding experiment reproduces 26 checks including masked mpint bug',()=>{
 const run=spawnSync('python3',['research/experiments/2026-11-16/ssh_binding.py'],{encoding:'utf8',timeout:10000});
 assert.equal(run.status,0,run.stderr);const result=JSON.parse(run.stdout);
 assert.deepEqual(result,JSON.parse(readFileSync('research/experiments/2026-11-16/results.json','utf8')));
 assert.equal(result.passed,26);assert.ok(Object.values(result.checks).every(Boolean));
 assert.notEqual(result.vectors.key_C_rekey_correct,result.vectors.key_C_rekey_wrong_sid);
});
test('SSH research separates formal status and unexecuted protocol validation',()=>{
 assert.match(article.scope,/Informational/);assert.match(article.status,/真实协议互通待执行/);
 const rows=article.sections.find(s=>s.id==='test-matrix').table.rows;
 assert.equal(rows.length,8);assert.ok(rows.every(r=>r[0].startsWith('待执行')));
 assert.match(article.sources.find(s=>s.id==='10').version,/预印本/);
});
