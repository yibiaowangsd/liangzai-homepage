import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runPack, createExample, decodeValue, validatePack, hexValue, runtimeName } from '../public/pqc-practice/interop-core.js';
const suite = { library: 'nist', family: 'mlkem', variant: '768', hash: 'shake' };
const pack = row => ({ format: 'liangzai-pqc-testpack', schemaVersion: 1, cases: [row] });
const decap = { id: 'case', suite, operation: 'decapsulate', inputs: { privateKey: hexValue(Uint8Array.of(1, 2)), ciphertext: hexValue(Uint8Array.of(3, 4)) }, expected: { sharedSecret: hexValue(Uint8Array.of(5, 6)), matches: true } };

test('testpack encodings and identifiers are explicit and validated', () => {
  assert.deepEqual(decodeValue({ encoding: 'base64', value: 'AQI=' }), Uint8Array.of(1, 2));
  assert.deepEqual(decodeValue({ encoding: 'hex', value: '' }), new Uint8Array());
  assert.throws(() => decodeValue({ encoding: 'hex', value: '0' }));
  assert.throws(() => decodeValue({ encoding: 'base64', value: '!!!!' }));
  assert.throws(() => validatePack({ ...pack(decap), cases: [decap, decap] }), /不重复/);
  assert.throws(() => validatePack(pack({ ...decap, expected: { ...decap.expected, matches: 'false' } })));
});
test('negative expectations require a real outcome; execution errors never count as passes', async () => {
  const negative = pack({ ...decap, expected: { ...decap.expected, matches: false } });
  const actual = await runPack(negative, async type => type === 'describe' ? { kind: 'kem' } : { sharedSecret: Uint8Array.of(7, 8), ms: 1 });
  assert.equal(actual.passed, 1);
  const error = await runPack(negative, async type => { if (type === 'describe') return { kind: 'kem' }; throw new Error('secret payload'); });
  assert.equal(error.passed, 0); assert.equal(error.errors, 1);
  assert.ok(!JSON.stringify(error).includes('secret payload'));
  assert.equal(error.results[0].ms, null);
});
test('exported reports include case fingerprints while excluding raw key material and input values', async () => {
  const result = await runPack(pack(decap), async type => type === 'describe' ? { kind: 'kem' } : { sharedSecret: Uint8Array.of(5, 6), ms: 0.5 });
  assert.equal(result.passed, 1);
  assert.match(result.results[0].caseFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(result.results[0].runtime, 'mlkem768shake');
  assert.doesNotMatch(JSON.stringify(result), /privateKey|ciphertext|sharedSecret|"inputs"|"value"/);
  await assert.rejects(runPack(pack(decap), async () => ({}), { signal: AbortSignal.abort() }), { name: 'AbortError' });
});

async function nativeWasm(suite) {
  const name = runtimeName(suite), root = new URL('../public/pqc-practice/wasm/', import.meta.url);
  const { default: factory } = await import(new URL(name + '.mjs', root));
  const mod = await factory({ wasmBinary: new Uint8Array(await readFile(new URL(name + '.wasm', root))) });
  const sizes = { pk: mod._lab_public_bytes(), sk: mod._lab_private_bytes(), out: mod._lab_output_bytes(), ss: mod._lab_shared_bytes?.() || 32 };
  const kind = suite.family.startsWith('mlkem') || suite.family.startsWith('kem-') ? 'kem' : 'sig';
  return async (type, _suite, inputs = {}) => {
    if (type === 'describe') return { kind, sizes };
    const blocks = [];
    const alloc = size => { const p = mod._malloc(Math.max(size, 1)); blocks.push([p, Math.max(size, 1)]); return p; };
    const put = bytes => { const p = alloc(bytes.length); mod.HEAPU8.set(bytes, p); return p; };
    const get = (p, size) => mod.HEAPU8.slice(p, p + size);
    try {
      if (suite.library === 'ngcc') { const seed = put(crypto.getRandomValues(new Uint8Array(48))); assert.equal(mod._lab_seed(seed, 48), 0); }
      if (type === 'generate') { const pk = alloc(sizes.pk), sk = alloc(sizes.sk); assert.equal(mod._lab_keypair(pk, sk), 0); return { publicKey: get(pk, sizes.pk), privateKey: get(sk, sizes.sk), ms: 0 }; }
      if (type === 'encapsulate') { const pk = put(inputs.publicKey), ct = alloc(sizes.out), ss = alloc(sizes.ss); assert.equal(mod._lab_enc(ct, ss, pk), 0); return { ciphertext: get(ct, sizes.out), sharedSecret: get(ss, sizes.ss), ms: 0 }; }
      if (type === 'decapsulate') { const sk = put(inputs.privateKey), ct = put(inputs.ciphertext), ss = alloc(sizes.ss); assert.equal(mod._lab_dec(ss, ct, sk), 0); return { sharedSecret: get(ss, sizes.ss), ms: 0 }; }
      if (type === 'sign') { const sk = put(inputs.privateKey), msg = put(inputs.message), sig = alloc(sizes.out); const length = mod._lab_sign(sig, msg, inputs.message.length, sk); assert.ok(length > 0 && length <= sizes.out); return { signature: get(sig, length), ms: 0 }; }
      if (type === 'verify') { const pk = put(inputs.publicKey), msg = put(inputs.message), sig = alloc(sizes.out); mod.HEAPU8.fill(0, sig, sig + sizes.out); mod.HEAPU8.set(inputs.signature, sig); return { valid: mod._lab_verify(sig, inputs.signature.length, msg, inputs.message.length, pk) === 0, ms: 0 }; }
      throw new Error('Unknown action');
    } finally { for (const [p, size] of blocks) { mod.HEAPU8.fill(0, p, p + size); mod._free(p); } }
  };
}
for (const selected of [suite, { library: 'nist', family: 'mldsa', variant: '44', hash: 'shake' }, { library: 'ngcc', family: 'kem-01', variant: '0', hash: 'shake' }, { library: 'ngcc', family: 'sign-01', variant: '0', hash: 'shake' }]) {
  test(`real ${selected.family} WASM generates and replays positive and tampered testpack cases`, async () => {
    const invoke = await nativeWasm(selected);
    const sample = await createExample(selected, invoke);
    const report = await runPack(sample, invoke);
    assert.equal(report.total, 2); assert.equal(report.passed, 2); assert.equal(report.errors, 0);
  });
}
