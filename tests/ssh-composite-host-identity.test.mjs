import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const vectors = JSON.parse(readFileSync(new URL('../research/experiments/2026-11-24/public-key-vectors.json', import.meta.url), 'utf8'));
const expected = new Map([
  ['ssh-mldsa44-ed25519', [1371, 1344, '2eb99bdc32f68032042d5e9865fac1b6a90496ffe7f5f1099c46822fa2287928']],
  ['ssh-mldsa87-p384', [2717, 2693, 'db7feec102ec9bad805f2a068069c5a324ab928e9bca04ce20c4742c9b893cdd']],
]);
const sha256 = data => createHash('sha256').update(data).digest('hex');

test('exactly the two draft SSHFP examples are present', () => {
  assert.deepEqual(vectors.map(v => v.name), [...expected.keys()]);
});

for (const v of vectors) {
  test(`${v.name} fingerprints the complete SSH blob, not the raw public-key field`, () => {
    const wire = Buffer.from(v.blobHex, 'hex');
    assert.equal(wire.toString('hex'), v.blobHex);
    const typeLen = wire.readUInt32BE(0);
    assert.equal(wire.subarray(4, 4 + typeLen).toString('ascii'), v.name);
    const rawLen = wire.readUInt32BE(4 + typeLen);
    const raw = wire.subarray(8 + typeLen);
    assert.equal(raw.length, rawLen);
    const [wireBytes, rawBytes, hash] = expected.get(v.name);
    assert.equal(wire.length, wireBytes);
    assert.equal(rawLen, rawBytes);
    assert.equal(v.wireBytes, wireBytes);
    assert.equal(v.rawBytes, rawBytes);
    if (v.name.endsWith('p384')) {
      assert.equal(raw.readUInt32BE(2592), 97);
      assert.equal(raw[2596], 4);
    }
    assert.equal(sha256(wire), hash);
    assert.equal(v.wireSha256, hash);
    assert.equal(sha256(raw), v.rawSha256);
    assert.notEqual(v.rawSha256, hash);
  });
}
