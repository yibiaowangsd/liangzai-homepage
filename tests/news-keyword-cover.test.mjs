import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import { keywordCover, sourceCover, coverFor } from '../app/news/keyword-cover.ts';
test('publisher hotlinks are replaced by consistent local editorial covers',async()=>{
  for(const category of ['pqc','protocol','standards','security','ai','industry','unknown']){
    const item={title:'ML-KEM TLS',category,cover_image:'https://example.com/third-party.jpg',tags:null};
    assert.equal(sourceCover(item),null);
    assert.match(coverFor(item),/^\/news-covers\/[a-z]+\.svg$/);
    await access(new URL('../public'+keywordCover(item).image,import.meta.url));
  }
});
