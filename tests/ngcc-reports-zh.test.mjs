import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const read=name=>JSON.parse(readFileSync(new URL(`../public/pqc-practice/${name}`,import.meta.url)));
test('every source finding has Chinese content and its own original-report anchor',()=>{
  const source=read('ngcc-report-index.json'),translated=read('ngcc-reports-zh.json');
  const entries=new Map(translated.findings.map(item=>[item.id,item]));
  assert.equal(entries.size,source.findings.length);
  for(const item of source.findings){
    const summary=entries.get(item.id);assert.ok(summary,`${item.id} missing`);
    for(const key of ['candidateId','severity','scope','status','updated'])assert.equal(summary[key],item[key],`${item.id}: ${key}`);
    assert.match(summary.title,/[\u3400-\u9fff]/);assert.ok(summary.summary.length>=25,`${item.id}: missing substance`);
    const url=new URL(summary.source_url);assert.equal(url.origin,'https://ngcc.dev');
    assert.equal(url.pathname,`/reports/${item.candidateId}.html`);assert.ok(url.hash.startsWith(`#${item.id}-`),`${item.id}: finding anchor missing`);
  }
  assert.equal(translated.findings.filter(r=>r.status==='Withdrawn').length,2);
});
