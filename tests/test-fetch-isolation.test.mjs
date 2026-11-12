import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createUnexpectedFetchGuard } from './fixtures/unexpected-fetch.mjs';

test('missing fetch fixtures reject without a transport and remain visible after a catch', async () => {
  const guard = createUnexpectedFetchGuard();
  await assert.rejects(guard.fetch('https://example.test/api/news'), /Unmocked fetch/);
  await guard.fetch(new Request('https://example.test/api/send?token=fixture-only', { method: 'POST' })).catch(() => {});
  await assert.rejects(guard.fetch(new URL('https://example.test/api/item'), { method: 'DELETE' }), /Unmocked fetch/);
  assert.deepEqual(guard.attempts, [
    'GET https://example.test/api/news',
    'POST https://example.test/api/send',
    'DELETE https://example.test/api/item',
  ]);
});

test('the preload hook fails even when application code catches an unexpected fetch', () => {
  const preload = new URL('./fixtures/no-unmocked-fetch.mjs', import.meta.url).href;
  // Run an independent harness, rather than inheriting the parent's internal
  // IPC reporter without its supervising test process.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, ['--import', preload, '--input-type=module', '-e', `
    import test from 'node:test';
    test('synthetic caught request', async () => {
      await fetch('https://example.test/fixture-only').catch(() => {});
    });
  `], { env, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1, child.stderr || child.stdout);
  assert.match(child.stdout, /Every application fetch needs an explicit test fixture/);
  assert.match(child.stdout, /GET https:\/\/example\.test\/fixture-only/);
});
