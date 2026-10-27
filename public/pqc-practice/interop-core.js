import { ngccModule } from './ngcc-runtime.js';

export const TESTPACK_FORMAT = 'liangzai-pqc-testpack';
const encode = new TextEncoder();
export const toHex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
export const hexValue = bytes => ({ encoding: 'hex', value: toHex(bytes) });
export function runtimeName(suite) {
  if (suite.library === 'ngcc') return ngccModule(suite.family, suite.variant);
  if (suite.family === 'slhdsa') return `slh${suite.hash}${suite.variant}`;
  return `${suite.family}${suite.variant}${suite.hash}`;
}
export async function fingerprint(value) {
  if (!globalThis.crypto?.subtle) throw new Error('当前页面无法校验 SHA-256，请通过 HTTPS 打开此功能。');
  const bytes = value instanceof Uint8Array ? value : encode.encode(JSON.stringify(value));
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}
export function decodeValue(input, label = '输入') {
  if (!input || typeof input.value !== 'string') throw new Error(`${label}需要 encoding 和 value`);
  if (input.encoding === 'utf8') return encode.encode(input.value);
  if (input.encoding === 'hex') {
    const value = input.value.replace(/\s/g, '');
    if (!/^(?:[a-f\d]{2})*$/i.test(value)) throw new Error(`${label}不是完整的 HEX 字节`);
    return Uint8Array.from(value.match(/../g) || [], pair => parseInt(pair, 16));
  }
  if (input.encoding === 'base64') {
    const value = input.value.replace(/\s/g, '');
    if (!/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(value)) throw new Error(`${label}不是标准 Base64`);
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }
  throw new Error(`${label}的编码必须为 hex、base64 或 utf8`);
}
export function validatePack(value) {
  if (!value || value.format !== TESTPACK_FORMAT || value.schemaVersion !== 1 || !Array.isArray(value.cases) || !value.cases.length || value.cases.length > 100) throw new Error('需要 v1 测试包，包含 1 至 100 个用例。');
  const ids = new Set();
  for (const row of value.cases) {
    if (typeof row.id !== 'string' || !row.id.trim() || row.id.length > 120 || ids.has(row.id)) throw new Error('每个用例需要不重复的 id（最多120字符）。');
    ids.add(row.id);
    const suite = row.suite;
    if (!suite || typeof suite.family !== 'string' || typeof suite.variant !== 'string' || !['nist', 'ngcc'].includes(suite.library)) throw new Error(`${row.id} 缺少准确的算法和参数。`);
    if (suite.library === 'ngcc' && (!/^(kem|sign)-\d\d$/.test(suite.family) || !ngccModule(suite.family, suite.variant))) throw new Error(`${row.id} 的候选参数尚未接入。`);
    if (!['decapsulate', 'verify'].includes(row.operation)) throw new Error(`${row.id} 仅支持 decapsulate 或 verify。`);
    if (!row.inputs || !row.expected) throw new Error(`${row.id} 缺少 inputs 或 expected。`);
    if (row.operation === 'verify' && typeof row.expected.valid !== 'boolean') throw new Error(`${row.id} 需要 expected.valid 布尔值。`);
    if (row.operation === 'decapsulate') {
      decodeValue(row.expected.sharedSecret, '预期共享密钥');
      if (row.expected.matches !== undefined && typeof row.expected.matches !== 'boolean') throw new Error(`${row.id} 的 expected.matches 必须是布尔值。`);
    }
  }
  return value;
}

export async function runPack(pack, invoke, { onResult = () => {}, signal } = {}) {
  validatePack(pack);
  const results = [];
  for (const row of pack.cases) {
    if (signal?.aborted) throw new DOMException('已停止本次复验', 'AbortError');
    const item = { id: row.id, suite: { library: row.suite.library, family: row.suite.family, variant: row.suite.variant, hash: row.suite.hash || '' }, runtime: runtimeName(row.suite), operation: row.operation, caseFingerprint: await fingerprint(row), status: 'error', ms: null };
    try {
      const described = await invoke('describe', row.suite);
      const kind = row.operation === 'verify' ? 'sig' : 'kem';
      if (described.kind !== kind) throw new Error('操作与算法类别不匹配。');
      const inputs = row.operation === 'verify' ? {
        publicKey: decodeValue(row.inputs.publicKey, '公钥'), message: decodeValue(row.inputs.message, '消息'), signature: decodeValue(row.inputs.signature, '签名'),
      } : { privateKey: decodeValue(row.inputs.privateKey, '私钥'), ciphertext: decodeValue(row.inputs.ciphertext, '密文'),
        ...(row.inputs.publicKey ? { publicKey: decodeValue(row.inputs.publicKey, '公钥') } : {}) };
      if (row.operation === 'verify' && inputs.message.length > 65536) throw new Error('消息不能超过64KiB。');
      const actual = await invoke(row.operation, row.suite, inputs);
      item.ms = actual.ms;
      if (row.operation === 'verify') {
        item.expected = row.expected.valid;
        item.actual = actual.valid;
        item.status = actual.valid === row.expected.valid ? 'passed' : 'failed';
      } else {
        const expected = decodeValue(row.expected.sharedSecret, '预期共享密钥');
        const match = expected.length === actual.sharedSecret.length && expected.every((value, i) => value === actual.sharedSecret[i]);
        item.expected = row.expected.matches !== false;
        item.actual = match;
        item.resultFingerprint = await fingerprint(actual.sharedSecret);
        item.expectedFingerprint = await fingerprint(expected);
        item.status = match === item.expected ? 'passed' : 'failed';
        actual.sharedSecret.fill(0); expected.fill(0);
      }
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      // Never copy an implementation's error payload, which could include input bytes.
      item.error = '输入、参数或算法执行失败；请核对测试包和所选实现。';
    }
    results.push(item);
    onResult(item, results.length, pack.cases.length);
  }
  return { format: 'liangzai-pqc-result', schemaVersion: 1, createdAt: new Date().toISOString(), implementation: '本站 PQMagic / NGCC 提交源码 WASM，具体模块见 suite',
    scope: '功能复验；同源示例不构成独立实现互通、安全认证或性能基准', total: results.length,
    passed: results.filter(item => item.status === 'passed').length, failed: results.filter(item => item.status === 'failed').length, errors: results.filter(item => item.status === 'error').length, results };
}

export async function createExample(suite, invoke) {
  const { kind } = await invoke('describe', suite);
  const keypair = await invoke('generate', suite);
  try {
    if (kind === 'kem') {
      const value = await invoke('encapsulate', suite, { publicKey: keypair.publicKey });
      const changed = value.ciphertext.slice(); changed[0] ^= 1;
      return { format: TESTPACK_FORMAT, schemaVersion: 1, producer: '本站生成的临时测试密钥；用于熟悉格式，不是独立互通证据', cases: [
        { id: 'valid-decapsulation', suite, operation: 'decapsulate', inputs: { privateKey: hexValue(keypair.privateKey), ciphertext: hexValue(value.ciphertext) }, expected: { sharedSecret: hexValue(value.sharedSecret), matches: true } },
        { id: 'changed-ciphertext', suite, operation: 'decapsulate', inputs: { privateKey: hexValue(keypair.privateKey), ciphertext: hexValue(changed) }, expected: { sharedSecret: hexValue(value.sharedSecret), matches: false } },
      ] };
    }
    const message = encode.encode('量仔 · 原生实现与浏览器复验');
    const value = await invoke('sign', suite, { privateKey: keypair.privateKey.slice(), message });
    const inputs = { publicKey: hexValue(keypair.publicKey), message: hexValue(message), signature: hexValue(value.signature) };
    const changed = message.slice(); changed[0] ^= 1;
    return { format: TESTPACK_FORMAT, schemaVersion: 1, producer: '本站生成的临时测试材料；用于熟悉格式，不是独立互通证据', cases: [
      { id: 'valid-signature', suite, operation: 'verify', inputs, expected: { valid: true } },
      { id: 'changed-message', suite, operation: 'verify', inputs: { ...inputs, message: hexValue(changed) }, expected: { valid: false } },
    ] };
  } finally { keypair.privateKey.fill(0); }
}
