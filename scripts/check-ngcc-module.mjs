// Invoked in a separate process with a hard timeout for each generated module.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [file, id, indexText, vectorFile] = process.argv.slice(2);
const index = Number(indexText);
if (!file || !id || !Number.isSafeInteger(index)) throw new Error('module path, candidate ID and index required');
const catalog = JSON.parse(readFileSync(new URL('../public/pqc-practice/ngcc-catalog.json', import.meta.url)));
const candidate = catalog.candidates.find(item => item.id === id);
const parameter = candidate?.parameters[index];
assert.ok(parameter, 'candidate parameter not found');
const wasm = file.replace(/\.mjs$/, '.wasm');
assert.notEqual(wasm, file, 'expected .mjs path');
const { default: factory } = await import(pathToFileURL(file).href);
const mod = await factory({ wasmBinary: new Uint8Array(readFileSync(wasm)) });
const blocks = [];
function alloc(bytes) {
  assert.ok(bytes >= 0 && bytes <= 32 * 1024 * 1024, 'unexpected buffer size');
  const count = Math.max(bytes, 1), pointer = mod._malloc(count);
  assert.ok(pointer, 'WASM allocation failed');
  blocks.push([pointer, count]);
  return pointer;
}
function seed(value) {
  const pointer = alloc(48);
  mod.HEAPU8.fill(value, pointer, pointer + 48);
  assert.equal(mod._lab_seed(pointer, 48), 0);
}
try {
  const sizes = parameter.sizes;
  if (candidate.type === 'hash') {
    assert.equal(mod._lab_digest_bytes(), sizes.DigestBytes);
    const known = vectorFile
      ? JSON.parse(readFileSync(vectorFile))[String(index)]
      : id === 'hash-01'
      ? JSON.parse(readFileSync(new URL('../tests/fixtures/ngcc-hash01.json', import.meta.url)))[parameter.name]
      : undefined;
    const digests = [];
    for (const [label, value] of [['empty', ''], ['abc', 'abc'], ['abc-bang', 'abc!']]) {
      const bytes = new TextEncoder().encode(value), message = alloc(bytes.length), output = alloc(sizes.DigestBytes);
      mod.HEAPU8.set(bytes, message);
      assert.equal(mod._lab_hash(message, bytes.length, output), 0, `${label}: CryptHash failed`);
      const digest = mod.HEAPU8.slice(output, output + sizes.DigestBytes);
      assert.equal(digest.length, sizes.DigestBytes);
      const sha = createHash('sha256').update(digest).digest('hex');
      if (known) assert.equal(sha, known[label], `${label}: differs from native reference`);
      digests.push(sha);
    }
    assert.equal(new Set(digests).size, 3, 'distinct messages should have distinct digests');
  } else if (candidate.type === 'kex') {
    assert.deepEqual([mod._lab_public_bytes(), mod._lab_private_bytes(), mod._lab_shared_bytes(),
      mod._lab_state_a_bytes(), mod._lab_state_b_bytes(), mod._lab_total_bytes(), mod._lab_passes()],
    [sizes.PublicKeyBytes, sizes.SecretKeyBytes, sizes.SharedSecretBytes, sizes.InitiatorStateBytes,
      sizes.ResponderStateBytes, sizes.TotalMessageBytes, sizes.Passes], 'protocol metadata differs from catalog');
    const secret = alloc(sizes.SharedSecretBytes);
    seed(31);
    assert.equal(mod._lab_exchange(secret), 0, 'full reference protocol failed to agree on a secret');
    const first = mod.HEAPU8.slice(secret, secret + sizes.SharedSecretBytes);
    seed(72);
    assert.equal(mod._lab_exchange(secret), 0, 'second reference protocol failed to agree on a secret');
    assert.notDeepEqual(first, mod.HEAPU8.slice(secret, secret + sizes.SharedSecretBytes),
      'independent seeds generated the same shared secret');
    seed(31);
    assert.equal(mod._lab_session_start(),0,'session initialization failed');
    assert.equal(mod._lab_session_pass(2),-1,'out-of-order pass accepted');
    assert.equal(mod._lab_session_derive(0),-1,'premature derivation accepted');
    for(let slot=0;slot<6;slot++)assert.ok(mod._lab_session_bytes(slot)>=0,'initial material missing');
    let traffic=0;
    for(let pass=1;pass<=sizes.Passes;pass++){
      assert.equal(mod._lab_session_pass(pass),0,`pass ${pass} failed`);
      const bytes=mod._lab_session_bytes(5+pass);
      assert.ok(bytes>=0&&bytes<=sizes.TotalMessageBytes,'invalid message size');
      assert.ok(mod._lab_session_data(5+pass),'message pointer missing');traffic+=bytes;
      assert.equal(mod._lab_session_pass(pass),-1,'replayed step accepted');
    }
    assert.equal(traffic,sizes.TotalMessageBytes,'actual transcript size differs');
    assert.equal(mod._lab_session_derive(0),0);assert.equal(mod._lab_session_match(),0);
    assert.equal(mod._lab_session_derive(1),0);assert.equal(mod._lab_session_match(),1);
    for(const slot of [10,11]){
      const ptr=mod._lab_session_data(slot),len=mod._lab_session_bytes(slot);
      assert.deepEqual(mod.HEAPU8.slice(ptr,ptr+len),first,'stepwise output differs from same-seed complete protocol');
    }
    mod._lab_session_reset();assert.equal(mod._lab_session_bytes(0),-1);assert.equal(mod._lab_session_data(0),0);
    assert.equal(mod._lab_session_pass(1),-1,'closed session accepted a pass');
  } else {
    const pkSize = mod._lab_public_bytes(), skSize = mod._lab_private_bytes(),
      outSize = mod._lab_output_bytes();
    assert.deepEqual([pkSize, skSize, outSize], [sizes.PublicKeyBytes, sizes.SecretKeyBytes,
      sizes.CiphertextBytes ?? sizes.SignatureBytes], 'metadata differs from catalog');
    const pk = alloc(pkSize), sk = alloc(skSize);
    seed(31);
    assert.equal(mod._lab_keypair(pk, sk), 0, 'key generation failed');
    seed(72);
    if (candidate.type === 'kem') {
      assert.equal(mod._lab_shared_bytes(), sizes.SharedSecretBytes);
      const ct = alloc(outSize), ss = alloc(sizes.SharedSecretBytes), recovered = alloc(sizes.SharedSecretBytes);
      assert.equal(mod._lab_enc(ct, ss, pk), 0, 'encapsulation failed');
      assert.equal(mod._lab_dec(recovered, ct, sk), 0, 'decapsulation failed');
      assert.deepEqual(mod.HEAPU8.slice(ss, ss + sizes.SharedSecretBytes),
        mod.HEAPU8.slice(recovered, recovered + sizes.SharedSecretBytes));
      mod.HEAPU8[ct] ^= 1;
      const status = mod._lab_dec(recovered, ct, sk);
      assert.ok(status !== 0 || !mod.HEAPU8.slice(recovered, recovered + sizes.SharedSecretBytes)
        .every((value, offset) => value === mod.HEAPU8[ss + offset]), 'tampered ciphertext retained original secret');
    } else if (candidate.type === 'sig') {
      const bytes = new TextEncoder().encode('NGCC submitted implementation'),
        msg = alloc(bytes.length), sig = alloc(outSize);
      mod.HEAPU8.set(bytes, msg);
      const length = mod._lab_sign(sig, msg, bytes.length, sk);
      assert.ok(length > 0 && length <= outSize, 'sign failed');
      assert.equal(mod._lab_verify(sig, length, msg, bytes.length, pk), 0, 'verify failed');
      mod.HEAPU8[msg] ^= 1;
      assert.notEqual(mod._lab_verify(sig, length, msg, bytes.length, pk), 0, 'changed message accepted');
    } else throw new Error('unknown candidate type');
  }
  console.log(`VERIFIED ${id} ${parameter.label}`);
} finally {
  for (const [pointer, length] of blocks) {
    mod.HEAPU8.fill(0, pointer, pointer + length);
    mod._free(pointer);
  }
}
