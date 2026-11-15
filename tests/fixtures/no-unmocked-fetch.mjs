import assert from 'node:assert/strict';
import { after } from 'node:test';
import { createUnexpectedFetchGuard } from './unexpected-fetch.mjs';

// Loaded before each test file by npm test. Explicit fetch mocks replace this
// default; neither this guard nor the mocks retain a real-fetch fallback.
const guard = createUnexpectedFetchGuard();
globalThis.fetch = guard.fetch;
after(() => {
  // A top-level after-hook error is not counted in every Node harness version.
  // Preserve a nonzero process result as well as the useful assertion report.
  if (guard.attempts.length) process.exitCode = 1;
  assert.deepEqual(guard.attempts, [], 'Every application fetch needs an explicit test fixture');
});
