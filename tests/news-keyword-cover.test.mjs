import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import { keywordCover, sourceCover, coverFor } from '../app/news/keyword-cover.ts';
const story=(title,extra={})=>({title,category:'pqc',cover_image:null,tags:null,...extra});
test('keyword covers follow the subject, not just its broad category',()=>{
  assert.match(coverFor(story('Falcon FPGA 完整实现')),/compute-v2/);
  assert.match(coverFor(story('TLS 混合 ML-KEM 协议')),/connection-v2/);
  assert.match(coverFor(story('ML-KEM 密钥封装')),/ml-kem-studio/);
  assert.match(coverFor(story('SM3 增量哈希')),/slh-dsa-studio/);
  assert.match(coverFor(story('智能体模型更新')),/compute-v2/);
  assert.match(keywordCover(story('未知标题',{tags:'["ML-DSA"]'})).keyword,/SIGNATURE/);
});
test('real source images remain, old placeholders and invalid URLs fall back',()=>{
  const source='https://example.com/news-covers/pqc.svg';
  assert.equal(coverFor(story('ML-KEM',{cover_image:source})),source);
  for(const cover_image of [null,'','  ','/news-covers/pqc.svg','https://wangyibiao.com/news-covers/security.svg','javascript:alert(1)','//other.example/cover']){
    assert.equal(sourceCover(story('ML-KEM',{cover_image})),null);
    assert.match(coverFor(story('ML-KEM',{cover_image})),/ml-kem-studio/);
  }
});
test('every keyword and category fallback references a bundled asset',async()=>{
  const samples=['FPGA','TLS','ML-KEM','Falcon','SM3','ML-DSA','AI','漏洞','NIST','Cloudflare','未知'];
  for(const title of samples)await access(new URL('../public'+keywordCover(story(title)).image,import.meta.url));
  for(const category of ['pqc','protocol','standards','security','ai','industry','unknown'])await access(new URL('../public'+keywordCover(story('',{category})).image,import.meta.url));
});
