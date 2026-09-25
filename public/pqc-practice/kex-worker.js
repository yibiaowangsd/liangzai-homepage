import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';

self.onmessage = async ({ data }) => {
  try {
    const module = NGCC_KEX_WASM[data.id]?.[data.index];
    if (!module) throw new Error('当前参数尚无经过验证的浏览器实现');
    const { default: factory } = await import(`./wasm/${module}.mjs`);
    const mod = await factory({ locateFile: name => new URL(`./wasm/${name}`, import.meta.url).href });
    const bytes = mod._lab_shared_bytes();
    if (bytes < 1 || bytes > 1048576) throw new Error('共享密钥长度异常');
    const seed = mod._malloc(48), output = mod._malloc(bytes);
    if (!seed || !output) throw new Error('WASM 内存不足');
    try {
      const random = crypto.getRandomValues(new Uint8Array(48));
      mod.HEAPU8.set(random, seed); random.fill(0);
      if (mod._lab_seed(seed, 48) !== 0) throw new Error('随机数初始化失败');
      const start = performance.now();
      if (mod._lab_exchange(output) !== 0) throw new Error('协议未能生成一致的共享密钥');
      const ms = performance.now() - start;
      const digest = await crypto.subtle.digest('SHA-256', mod.HEAPU8.slice(output, output + bytes));
      const fingerprint = Array.from(new Uint8Array(digest), item => item.toString(16).padStart(2, '0')).join('');
      postMessage({ fingerprint, bytes, passes: mod._lab_passes(), ms });
    } finally {
      if (seed) { mod.HEAPU8.fill(0, seed, seed + 48); mod._free(seed); }
      if (output) { mod.HEAPU8.fill(0, output, output + bytes); mod._free(output); }
    }
  } catch (error) { postMessage({ error: error?.message || '协议运行失败' }); }
};
