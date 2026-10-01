import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { sha256Bytes, fingerprintBytes, missingBrowserFeatures, copyText } from '../public/pqc-practice/browser-compat.js';

// Compare the HTTP path against an independent SHA-256 implementation,
// including both padding boundaries and a large submitted-protocol material.
test('HTTP fingerprint SHA-256 equals Node for byte data and padding boundaries', async () => {
  for (const size of [0, 1, 55, 56, 63, 64, 65, 127, 128, 129, 4096, 1048576]) {
    const bytes = randomBytes(size);
    const before = Buffer.from(bytes);
    assert.equal(Buffer.from(sha256Bytes(bytes)).toString('hex'), createHash('sha256').update(bytes).digest('hex'));
    assert.deepEqual(bytes, before, 'fingerprinting must not mutate caller material');
  }
  assert.equal(Buffer.from(await fingerprintBytes(new TextEncoder().encode('abc'))).toString('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('HTTP feature checks allow crypto RNG without subtle, but require strong random numbers', () => {
  const features = { crypto: { getRandomValues() {} }, WebAssembly: {}, Worker() {} };
  assert.deepEqual(missingBrowserFeatures(features), []);
  assert.deepEqual(missingBrowserFeatures({ ...features, crypto: {} }), ['密码学随机数']);
});
test('clipboard denial falls back, restores focus, and removes temporary material', async () => {
  let removed = false, restored = false, selected = false;
  const field = { style: {}, setAttribute() {}, focus() {}, select() {}, setSelectionRange(a, b) { selected = a === 0 && b === 3; }, remove() { removed = true; } };
  const doc = { activeElement: { focus() { restored = true; } }, createElement() { return field; }, body: { append() {} }, execCommand() { return true; } };
  await copyText('abc', doc, { clipboard: { async writeText() { throw new Error('permission denied'); } } });
  assert.ok(selected && removed && restored);
});
