import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';

const loaded = new Map();
async function load(module) {
  if (!loaded.has(module)) {
    loaded.set(module, import(`./wasm/${module}.mjs`).then(({ default: factory }) => factory({
      locateFile: name => new URL(`./wasm/${name}`, import.meta.url).href,
    })));
  }
  return loaded.get(module);
}
self.onmessage = async ({ data }) => {
  const { id, index, message } = data;
  try {
    const module = NGCC_HASH_WASM[id]?.[index];
    if (!module) throw new Error('当前参数尚无经过验证的 WASM');
    if (!(message instanceof Uint8Array) || message.length > 1048576) throw new Error('消息超过 1 MiB');
    const mod = await load(module);
    const length = mod._lab_digest_bytes();
    if (length < 1 || length > 4096) throw new Error('摘要长度异常');
    const input = mod._malloc(Math.max(1, message.length));
    if (!input) throw new Error('WASM 内存不足');
    const output = mod._malloc(length);
    if (!output) { mod._free(input); throw new Error('WASM 内存不足'); }
    try {
      mod.HEAPU8.set(message, input);
      const start = performance.now();
      if (mod._lab_hash(input, message.length, output) !== 0) throw new Error('参考实现返回计算失败');
      const bytes = mod.HEAPU8.slice(output, output + length);
      const digest = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
      postMessage({ digest, bytes: length, ms: performance.now() - start });
    } finally {
      mod.HEAPU8.fill(0, input, input + Math.max(1, message.length));
      mod.HEAPU8.fill(0, output, output + length);
      mod._free(input); mod._free(output);
    }
  } catch (error) { postMessage({ error: error?.message || '计算失败' }); }
};
