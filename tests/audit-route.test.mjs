import test from 'node:test';
import assert from 'node:assert/strict';
test('production clean audit route streams the static asset and retains query parameters',async()=>{
 const {default:worker}=await import('../dist/server/index.js');
 for(const path of ['/pqc-practice/audit?candidate=kem-01','/pqc-practice/audit/?candidate=kem-01']){
  const response=await worker.fetch(new Request('https://wangyibiao.com'+path),{ASSETS:{fetch:async request=>{const url=new URL(request.url);assert.equal(url.pathname,'/pqc-practice/audit.html');assert.equal(url.searchParams.get('candidate'),'kem-01');return new Response('<title>接入记录</title>',{headers:{'content-type':'text/html'}});}}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);assert.match(await response.text(),/接入记录/);
 }
});
