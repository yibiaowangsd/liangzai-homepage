import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBaseline } from '../research/experiments/2026-11-22/exporter-baseline.mjs';

const expected = {
  infoOut: '0758200eb868f263cf3555dccd396dd8dec29d3750d599be42d5a41a5a37c896f294ac1820',
  keyOut: 'b744cb7d8a87cc0447c3350e165b250dab12ec453325abb922b30307e5c368f0',
  infoExporter: '0a401820',
  exporter: '2aaec8fc4ab3bc3295def6b551051a2fa561424db301fa84f642f5578a6df51a',
  secret: '1e1c6beac3a8a1cac435de7e2f9ae7ff',
  salt: 'ce7ab844c0106d73',
};
for (const [field, expectedHex] of Object.entries(expected)) {
  test(`RFC 9529 classical fixture: ${field}`, () => assert.equal(verifyBaseline()[field], expectedHex));
}
