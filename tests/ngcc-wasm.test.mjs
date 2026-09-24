import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NGCC_WASM } from '../public/pqc-practice/ngcc-runtime.js';

const root = new URL('../public/pqc-practice/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('ngcc-catalog.json', root), 'utf8'));

for (const [id, names] of Object.entries(NGCC_WASM)) {
  const candidate = catalog.candidates.find(item => item.id === id);
  assert.ok(candidate, `Missing ${id} in candidate catalog`);
  for (const [index, basename] of names.entries()) {
    test(`${id} ${candidate.parameters[index].name}: real submitted WASM runs a round trip`, async () => {
      const { default: factory } = await import(new URL(`wasm/${basename}.mjs`, root));
      const mod = await factory({ wasmBinary: new Uint8Array(readFileSync(new URL(`wasm/${basename}.wasm`, root))) });
      const sizes = candidate.parameters[index].sizes;
      const expected = [sizes.PublicKeyBytes, sizes.SecretKeyBytes,
        sizes.CiphertextBytes ?? sizes.SignatureBytes];
      assert.deepEqual([mod._lab_public_bytes(), mod._lab_private_bytes(), mod._lab_output_bytes()], expected);
      if (id.startsWith('kem-')) assert.equal(mod._lab_shared_bytes(), sizes.SharedSecretBytes);

      const blocks = [];
      const alloc = length => {
        const pointer = mod._malloc(Math.max(length, 1));
        assert.ok(pointer, 'WASM allocation failed');
        blocks.push([pointer, Math.max(length, 1)]);
        return pointer;
      };
      const seed = alloc(48), pk = alloc(expected[0]), sk = alloc(expected[1]);
      const reseed = byte => {
        mod.HEAPU8.fill(byte, seed, seed + 48);
        assert.equal(mod._lab_seed(seed, 48), 0);
      };
      try {
        reseed(31);
        assert.equal(mod._lab_keypair(pk, sk), 0, 'submitted key generation failed');
        // This pinned keypair comes from the unmodified native ICCS reference
        // library under the same deterministic 48-byte DRNG seed.
        const sha256 = (pointer, length) => createHash('sha256')
          .update(mod.HEAPU8.subarray(pointer, pointer + length)).digest('hex');
        if (id === 'kem-01' && index === 0) {
          assert.equal(sha256(pk, expected[0]), 'e5f31f547e3142ba8bb209ec94c0b6e89c61d02bea4fe5ffa9a0aca8a32c46ac');
          assert.equal(sha256(sk, expected[1]), '3c8c31b89c8a0fa5be2cdcc1361dbc7d7c69b21497519613e2e10bb09414b3a8');
        }
        reseed(72);
        if (id.startsWith('kem-')) {
          const ct = alloc(expected[2]), ss = alloc(sizes.SharedSecretBytes), recovered = alloc(sizes.SharedSecretBytes);
          assert.equal(mod._lab_enc(ct, ss, pk), 0, 'submitted encapsulation failed');
          if (id === 'kem-01' && index === 0) {
            assert.equal(sha256(ct, expected[2]), 'f37142b9d5fb37e2402c70b4e7d5222c75c87aa0f2f9a178fa05e5e7d537ad38');
            assert.equal(sha256(ss, sizes.SharedSecretBytes), '33ffa9b1781f8b4d035185a145e4d5029e0c741d2a395c5dea822028a8be5507');
          }
          assert.equal(mod._lab_dec(recovered, ct, sk), 0, 'submitted decapsulation failed');
          assert.deepEqual(mod.HEAPU8.slice(recovered, recovered + sizes.SharedSecretBytes),
            mod.HEAPU8.slice(ss, ss + sizes.SharedSecretBytes));
          mod.HEAPU8[ct] ^= 1;
          const status = mod._lab_dec(recovered, ct, sk);
          assert.ok(status !== 0 || !mod.HEAPU8.slice(recovered, recovered + sizes.SharedSecretBytes)
            .every((value, offset) => value === mod.HEAPU8[ss + offset]),
          'tampered ciphertext must not recover the original shared secret');
        } else {
          const message = new TextEncoder().encode('NGCC 浏览器测试');
          const msg = alloc(message.length), sig = alloc(expected[2]);
          mod.HEAPU8.set(message, msg);
          const length = mod._lab_sign(sig, msg, message.length, sk);
          assert.ok(length > 0 && length <= expected[2], 'submitted signing failed');
          assert.equal(mod._lab_verify(sig, length, msg, message.length, pk), 0,
            'submitted verification rejected an honest signature');
          mod.HEAPU8[msg] ^= 1;
          assert.notEqual(mod._lab_verify(sig, length, msg, message.length, pk), 0,
            'submitted verification accepted a changed message');
        }
      } finally {
        for (const [pointer, length] of blocks) {
          mod.HEAPU8.fill(0, pointer, pointer + length);
          mod._free(pointer);
        }
      }
    });
  }
}
