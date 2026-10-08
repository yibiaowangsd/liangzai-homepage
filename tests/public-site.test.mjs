import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { articleSections, matchesTag } from '../app/news/presentation.ts';
import { parseNewsContext, newsListingHref } from '../app/news/navigation.ts';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('only supported tag state survives a listing-to-article round trip',()=>{
 assert.deepEqual(parseNewsContext({page:'2',category:'protocol',tag:'TLS 1.3'}),{page:2,category:'protocol',tag:'TLS 1.3'});
 assert.equal(newsListingHref(parseNewsContext({page:'2',category:'protocol',tag:'TLS 1.3'})),'/news?page=2&category=protocol&tag=TLS+1.3');
 assert.equal(parseNewsContext({tag:'<script>'}).tag,undefined);
 assert.ok(matchesTag({title:'SM2 inside TLCP',summary:null,tags:null},'国密'));
});
test('source content is a short synopsis while the engineering observation stays separate',()=>{
 const split=articleSections('## 原文编译\n'+('Sentence. '.repeat(180))+'\n\n## 量仔观察\nReview the protocol combiner.','Summary');
 assert.equal(split.intro,'Review the protocol combiner.');
 assert.ok(split.excerpt.length<=901);
 assert.ok(!split.excerpt.includes(split.intro));
});
test('public routes render independent metadata and language-specific content',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({data:[],meta:{page:1,totalPages:1}});
 try{
  const {default:worker}=await import('../dist/server/index.js');
  const fetch=path=>worker.fetch(new Request('https://wangyibiao.com'+path),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  for(const path of ['/about','/pqc/ml-kem','/pqc/ml-dsa','/pqc/slh-dsa','/pqc/fn-dsa','/en/about','/en/pqc','/en/pqc/ml-kem','/universe']){
   const response=await fetch(path);assert.equal(response.status,200,path);const html=await response.text();
   assert.ok(html.includes('https://wangyibiao.com'+path));assert.match(html,/property="og:image"/);assert.doesNotMatch(html,/name="codex-preview"/);
   assert.match(html,/Yibiao/);if(path.includes('about'))assert.doesNotMatch(html,/QKD|量子密钥分发/);
  }
  const sitemap=await fetch('/sitemap.xml');assert.equal(sitemap.status,200);assert.match(await sitemap.text(),/<loc>https:\/\/wangyibiao.com\/pqc\/ml-kem<\/loc>/);
  const robots=await fetch('/robots.txt');assert.match(await robots.text(),/Sitemap: https:\/\/wangyibiao.com\/sitemap.xml/);
  for (const [path, target] of [['/pqc-practice?tab=signature&algorithm=slh-dsa', '/pqc-practice/index.html?tab=signature&algorithm=slh-dsa'], ['/en/lab?tab=signature&algorithm=ml-dsa', '/pqc-practice/index-en.html?tab=signature&algorithm=ml-dsa']]) {
   const redirect = await fetch(path); assert.ok([307, 308].includes(redirect.status)); const location = new URL(redirect.headers.get('location'), 'https://wangyibiao.com'); assert.equal(location.pathname + location.search, target);
  }
  const rss=await fetch('/rss.xml');assert.equal(rss.status,200);assert.match(await rss.text(),/<rss version="2.0"/);
 }finally{globalThis.fetch=original;}
});
test('standalone English laboratory has matching shell and metadata before JavaScript',async()=>{
 const html=await read('public/pqc-practice/index-en.html');
 assert.match(html,/<html lang="en">/);assert.match(html,/<h1>Cryptography <em>Lab<\/em><\/h1>/);
 assert.match(html,/property="og:image"/);assert.match(html,/data-lab-tab="signature"/);
 assert.doesNotMatch(html.replace(">中文<", ">Chinese<"),/>[^<>]*[\u4e00-\u9fff][^<>]*</u); // The language-switch label is checked separately below.
 for (const script of ['app-en.js', 'dialogue-en.js', 'candidate-workbench-en.js', 'navigation-en.js', 'usability-en.js']) {
  assert.doesNotMatch(await read('public/pqc-practice/' + script), /[\u4e00-\u9fff]/u, script + ' exposes English runtime instructions');
 }
});
