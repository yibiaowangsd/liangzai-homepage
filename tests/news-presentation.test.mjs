import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSummary, sourceDate } from '../app/news/presentation.ts';

test('source dates are independent of the publication/edition timestamp',()=>{
 const item={slug:'example',published_at:'2026-10-08T08:00:00+08:00',content:'原始来源日期：2025年2月23日。'};
 assert.equal(sourceDate(item,{}),'2025-02-23');
 assert.equal(sourceDate({...item,content:''},{}),null);
 assert.equal(sourceDate({...item,content:''},{example:'2026-09-03'}),'2026-09-03');
 assert.equal(cleanSummary('9月3日研究回顾：本文比较三种实现。'),'本文比较三种实现。');
});
