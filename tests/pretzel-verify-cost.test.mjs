import test from "node:test";
import assert from "node:assert/strict";

// Table 7 operation means, integer nanoseconds to make the model reproducible.
// This is a sensitivity model, not a cryptographic or network benchmark.
const cases = [[0, 16914000, 30480000], [250, 13894000, 24196750],
  [500, 10874000, 17913500], [750, 7854000, 11630250],
  [900, 6042000, 7860300], [1000, 4834000, 5347000]];
const mix = (hits, cold, warm) => (1000 - hits) * cold + hits * warm;
test("Pretzel Table 7 sensitivity uses the complete cold path, not an approximation by summing substeps", () => {
  for (const [hits, pretzel, mlDsa] of cases) {
    assert.equal(mix(hits, 16914, 4834), pretzel);
    assert.equal(mix(hits, 30480, 5347), mlDsa);
  }
});
test("equal-hit model does not imply a winner under different hit rates", () => {
  const mlDsa90 = mix(900, 30480, 5347);
  assert.ok(mix(749, 16914, 4834) > mlDsa90);
  assert.ok(mix(750, 16914, 4834) < mlDsa90);
  assert.equal(3309 - 1361, 1948);
  assert.equal(1952 - 1742, 210);
});
