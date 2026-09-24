const SLH_LEVELS = ['128f', '128s', '192f', '192s', '256f', '256s'];
const SUITES = {
  mlkem: { kind: 'kem', hashes: ['sm3', 'shake'], variants: () => ['512', '768', '1024'], module: (value, hash) => `mlkem${value}${hash}` },
  aigisenc: { kind: 'kem', hashes: ['sm3', 'shake'], variants: () => ['1', '2', '3', '4'], module: (value, hash) => `aigisenc${value}${hash}` },
  mldsa: { kind: 'sig', hashes: ['sm3', 'shake'], variants: () => ['44', '65', '87'], module: (value, hash) => `mldsa${value}${hash}` },
  aigissig: { kind: 'sig', hashes: ['sm3', 'shake'], variants: () => ['1', '2', '3'], module: (value, hash) => `aigissig${value}${hash}` },
  slhdsa: { kind: 'sig', hashes: ['sm3', 'sha2', 'shake'], variants: hash => hash === 'sm3' ? SLH_LEVELS.slice(0, 2) : SLH_LEVELS, module: (value, hash) => `slh${hash}${value}` },
};
const loaded = new Map();
const equal = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const suiteFor = (family, variant, hash) => {
  const suite = SUITES[family];
  if (!suite?.hashes.includes(hash) || !suite.variants(hash).includes(variant)) throw new Error('不支持所选算法、哈希或参数集');
  return { ...suite, family, variant, hash, module: suite.module(variant, hash) };
};
async function load(suite) {
  if (!loaded.has(suite.module)) {
    loaded.set(suite.module, import(`./wasm/${suite.module}.mjs`).then(({ default: factory }) => factory({
      locateFile: name => new URL(`./wasm/${name}`, import.meta.url).href,
    })));
  }
  const mod = await loaded.get(suite.module);
  return { mod, sizes: { pk: mod._lab_public_bytes(), sk: mod._lab_private_bytes(), out: mod._lab_output_bytes() } };
}
function arena(mod) {
  const blocks = [];
  return {
    alloc(length) {
      const pointer = mod._malloc(Math.max(1, length));
      if (!pointer) throw new Error('WASM 内存分配失败');
      blocks.push([pointer, Math.max(1, length)]);
      return pointer;
    },
    put(pointer, bytes) { mod.HEAPU8.set(bytes, pointer); },
    get(pointer, length) { return Uint8Array.from(mod.HEAPU8.subarray(pointer, pointer + length)); },
    close() { for (const [pointer, length] of blocks) { mod.HEAPU8.fill(0, pointer, pointer + length); mod._free(pointer); } },
  };
}
function exact(value, size, name) {
  if (!(value instanceof Uint8Array) || value.length !== size) throw new Error(`${name}应为 ${size} 字节`);
}
async function generate(suite) {
  const { mod, sizes } = await load(suite), a = arena(mod);
  try {
    const pk = a.alloc(sizes.pk), sk = a.alloc(sizes.sk);
    const start = performance.now();
    if (mod._lab_keypair(pk, sk) !== 0) throw new Error('密钥生成失败');
    const ms = performance.now() - start;
    return { publicKey: a.get(pk, sizes.pk), privateKey: a.get(sk, sizes.sk), ms };
  } finally { a.close(); }
}
async function encapsulate(suite, publicKey) {
  const { mod, sizes } = await load(suite);
  exact(publicKey, sizes.pk, '公钥');
  const a = arena(mod);
  try {
    const pk = a.alloc(sizes.pk), ct = a.alloc(sizes.out), ss = a.alloc(32);
    a.put(pk, publicKey);
    const start = performance.now();
    if (mod._lab_enc(ct, ss, pk) !== 0) throw new Error('封装失败');
    const ms = performance.now() - start;
    return { ciphertext: a.get(ct, sizes.out), sharedSecret: a.get(ss, 32), ms };
  } finally { a.close(); }
}
async function decapsulate(suite, privateKey, ciphertext, publicKey) {
  const { mod, sizes } = await load(suite);
  exact(privateKey, sizes.sk, '私钥');
  exact(ciphertext, sizes.out, '密文');
  if (publicKey) exact(publicKey, sizes.pk, '公钥');
  const embedded = sizes.sk - sizes.pk - 64;
  const pairMatches = publicKey ? equal(privateKey.subarray(embedded, embedded + sizes.pk), publicKey) : null;
  const a = arena(mod);
  try {
    const sk = a.alloc(sizes.sk), ct = a.alloc(sizes.out), ss = a.alloc(32);
    a.put(sk, privateKey); a.put(ct, ciphertext);
    const start = performance.now();
    if (mod._lab_dec(ss, ct, sk) !== 0) throw new Error('解封装失败');
    const ms = performance.now() - start;
    return { sharedSecret: a.get(ss, 32), pairMatches, ms };
  } finally { a.close(); privateKey.fill(0); }
}
async function sign(suite, privateKey, message) {
  const { mod, sizes } = await load(suite);
  exact(privateKey, sizes.sk, '私钥');
  if (!(message instanceof Uint8Array) || message.length > 65536) throw new Error('消息不能超过 64 KiB');
  const a = arena(mod);
  try {
    const sk = a.alloc(sizes.sk), msg = a.alloc(message.length), sig = a.alloc(sizes.out);
    a.put(sk, privateKey); a.put(msg, message);
    const start = performance.now();
    const length = mod._lab_sign(sig, msg, message.length, sk);
    if (length <= 0 || length > sizes.out) throw new Error('签名失败');
    const ms = performance.now() - start;
    return { signature: a.get(sig, length), ms };
  } finally { a.close(); privateKey.fill(0); }
}
async function verify(suite, publicKey, message, signature) {
  const { mod, sizes } = await load(suite);
  exact(publicKey, sizes.pk, '公钥');
  if (!(message instanceof Uint8Array) || message.length > 65536) throw new Error('消息不能超过 64 KiB');
  if (!(signature instanceof Uint8Array) || signature.length !== sizes.out) throw new Error(`签名应为 ${sizes.out} 字节`);
  const a = arena(mod);
  try {
    const pk = a.alloc(sizes.pk), msg = a.alloc(message.length), sig = a.alloc(signature.length);
    a.put(pk, publicKey); a.put(msg, message); a.put(sig, signature);
    const start = performance.now();
    const status = mod._lab_verify(sig, signature.length, msg, message.length, pk);
    const ms = performance.now() - start;
    return { valid: status === 0, ms };
  } finally { a.close(); }
}
self.onmessage = async ({ data }) => {
  const { type, requestId, family, variant, hash } = data;
  try {
    if (type === 'init') {
      await load(suiteFor('mlkem', '768', 'shake'));
      postMessage({ type: 'ready' });
      return;
    }
    const suite = suiteFor(family, variant, hash);
    let result;
    if (type === 'describe') {
      const { sizes } = await load(suite);
      result = { sizes, kind: suite.kind };
    } else if (type === 'generate') result = await generate(suite);
    else if (type === 'encapsulate' && suite.kind === 'kem') result = await encapsulate(suite, data.publicKey);
    else if (type === 'decapsulate' && suite.kind === 'kem') result = await decapsulate(suite, data.privateKey, data.ciphertext, data.publicKey);
    else if (type === 'sign' && suite.kind === 'sig') result = await sign(suite, data.privateKey, data.message);
    else if (type === 'verify' && suite.kind === 'sig') result = await verify(suite, data.publicKey, data.message, data.signature);
    else throw new Error('此算法不支持所选操作');
    postMessage({ type: 'result', requestId, result });
    if (type === 'generate') result.privateKey.fill(0);
  } catch (error) { postMessage({ type: 'error', requestId, message: error?.message || '运行失败' }); }
};
