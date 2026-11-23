import { test } from "node:test";
import assert from "node:assert/strict";
import { allStars, boardAfter, dailyShare, dateKey, decodeProgress, masks, puzzleFor, remainingMoves, size } from "../app/daily-play/puzzle.ts";

test("Beijing date changes at 16:00 UTC", () => {
  assert.equal(dateKey(Date.UTC(2026, 10, 23, 15, 59, 59)), "2026-11-23");
  assert.equal(dateKey(Date.UTC(2026, 10, 23, 16)), "2026-11-24");
});

test("toggle masks follow real neighbors and have full rank over GF(2)", () => {
  assert.equal(masks[3], 0b10001100);
  assert.equal(masks[0], 0b10011);
  const basis = new Map();
  for (let v of masks) {
    while (v) {
      const bit = 31 - Math.clz32(v);
      if (!basis.has(bit)) { basis.set(bit, v); break; }
      v ^= basis.get(bit);
    }
  }
  assert.equal(basis.size, size);
});

test("same daily seed always gives the same unique minimum action set", () => {
  assert.deepEqual(puzzleFor("2026-11-23", 8), puzzleFor("2026-11-23", 8));
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const date = dateKey(Date.UTC(2026, 10, 23 + i));
    const optimum = 6 + Number(date.slice(-2)) % 3;
    const { solution, start } = puzzleFor(date, optimum);
    assert.equal(solution.length, new Set(solution).size);
    assert.equal(boardAfter(start, solution), allStars);
    assert.notEqual(boardAfter(start, solution.slice(1)), allStars);
    seen.add(start);
  }
  assert.ok(seen.size > 55);
});

test("repeated presses cancel in hints, corrupted progress is ignored, share reveals no solution", () => {
  assert.deepEqual(remainingMoves([2, 5], [2, 1, 1, 9]), [5, 9]);
  assert.deepEqual(decodeProgress('{"moves":[0,19],"hints":1}'), { moves: [0, 19], hints: 1 });
  assert.deepEqual(decodeProgress('{"moves":[20],"hints":1}'), { moves: [], hints: 0 });
  assert.deepEqual(decodeProgress('corrupted'), { moves: [], hints: 0 });
  const share = dailyShare("2026-11-23", 8, 8, 0);
  assert.equal(share, "量仔 · 星阵点灯 2026-11-23\n✦ 完美点亮 · 8 步 · 提示 0 次\nhttps://wangyibiao.com/daily-play");
});
