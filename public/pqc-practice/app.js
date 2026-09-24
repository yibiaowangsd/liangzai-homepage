import { renderDialogue, animateTransfer, resetTransfers } from './dialogue.js';
const $ = selector => document.querySelector(selector);
const VARIANTS = {
  mlkem: ['512', '768', '1024'],
  aigisenc: ['1', '2', '3', '4'],
  mldsa: ['44', '65', '87'],
  slhdsa: ['128f', '128s', '192f', '192s', '256f', '256s'],
  aigissig: ['1', '2', '3'],
};
const HASHES = { mlkem: ['sm3', 'shake'], aigisenc: ['sm3', 'shake'], mldsa: ['sm3', 'shake'], slhdsa: ['sm3', 'sha2', 'shake'], aigissig: ['sm3', 'shake'] };
const DEFAULT_HASH = { mlkem: 'shake', aigisenc: 'sm3', mldsa: 'shake', slhdsa: 'sha2', aigissig: 'sm3' };
const DEFAULT_VARIANT = { mlkem: '768', aigisenc: '2', mldsa: '65', slhdsa: '128f', aigissig: '2' };
const NAMES = { mlkem: 'ML-KEM', aigisenc: 'Aigis-enc', mldsa: 'ML-DSA', slhdsa: 'SLH-DSA', aigissig: 'Aigis-sig' };
const CATEGORIES = { kem: '密钥封装 · 41 项', sig: '数字签名 · 34 项', kex: '密钥交换 · 9 项', hash: '哈希算法 · 35 项' };
const FACTS = {
  PublicKeyBytes: '公钥', SecretKeyBytes: '私钥', CiphertextBytes: '密文', SharedSecretBytes: '共享密钥',
  SignatureBytes: '签名', Passes: '交互轮数', InitiatorStateBytes: '发起方状态',
  ResponderStateBytes: '响应方状态', TotalMessageBytes: '总消息', DigestBits: '摘要位数', DigestBytes: '摘要长度',
};
const FIELD_SIZES = {
  'kem-public': 'pk', 'kem-private': 'sk', 'kem-alice-public': 'pk', 'kem-cipher': 'out', 'kem-bob-cipher': 'out',
  'sig-public': 'pk', 'sig-private': 'sk', 'signature': 'out', 'sig-verifier-public': 'pk', 'verify-signature': 'out',
};
const name = () => `${NAMES[$('#family').value]}-${$('#variant').value.toUpperCase()} · ${$('#hash').value.toUpperCase()}`;
const isKem = () => ['mlkem', 'aigisenc'].includes($('#family').value);
const isNgcc = () => $('#library').value === 'ngcc';
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const equal = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const elapsed = value => value == null ? '—' : `${value.toFixed(2)} ms`;
let worker, ready = false, busy = false, active = null, serial = 0, resetSerial = 0, sizes = null;
let catalog = null, catalogPromise = null, pqmagicFamily = 'mlkem';
let aliceSecret = null, keyTime = null, actionTime = null;
let flowOutcome = null;

function refresh() { renderDialogue({ kem: isKem(), sizes, busy, ready: ready && !isNgcc(), outcome: flowOutcome, decode: decodeInput }); }
function status(value, kind = '') { $('#message').textContent = value; $('#message').className = `message ${kind}`; refresh(); }
function runtime(value, kind = '') { $('#runtime').className = `runtime ${kind}`; $('#runtime').lastElementChild.textContent = value; }
function setBusy(value) {
  busy = value;
  document.querySelectorAll('[data-work]').forEach(control => { control.disabled = value || !ready || !sizes || isNgcc(); });
  document.querySelectorAll('select, [data-field], [data-import], [data-copy], .message-input').forEach(control => { control.disabled = value; });
  $('#clear-all').disabled = value;
  refresh();
}
function request(type, payload = {}) {
  if (isNgcc() || !ready || busy || active) throw new Error('当前算法没有可运行的浏览器实现');
  const requestId = ++serial;
  return new Promise((resolve, reject) => {
    active = { requestId, resolve, reject };
    try { worker.postMessage({ type, requestId, family: $('#family').value, variant: $('#variant').value, hash: $('#hash').value, ...payload }); }
    catch (error) { active = null; reject(error); }
  });
}
function startWorker() {
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        ready = true;
        if (!isNgcc()) { runtime('本地运行', 'ready'); configureVariant(); }
      } else if (data.type === 'error' && !ready && !active) {
        runtime('加载失败', 'error'); status(data.message, 'error');
      } else if ((data.type === 'result' || data.type === 'error') && data.requestId === active?.requestId) {
        const pending = active;
        active = null;
        data.type === 'error' ? pending.reject(new Error(data.message)) : pending.resolve(data.result);
      }
    };
    worker.onerror = event => {
      ready = false;
      const pending = active; active = null;
      pending?.reject(new Error(event.message || '工作线程失败'));
      runtime('WASM 加载失败', 'error');
      status(event.message || 'WASM 工作线程失败', 'error');
      setBusy(false);
    };
    worker.postMessage({ type: 'init' });
  } catch (error) { runtime('浏览器环境不可用', 'error'); status(error.message, 'error'); }
}
function decodeInput(input, expected, label) {
  const raw = input.trim();
  if (!raw) throw new Error(`${label}为空`);
  if (/-----BEGIN\s/i.test(raw)) throw new Error(`${label}需为原始字节，不支持 PEM / DER`);
  const compact = raw.replace(/\b0x/gi, '').replace(/[\s:,]/g, '');
  const candidates = [];
  if (/^[\da-f]+$/i.test(compact) && compact.length % 2 === 0) candidates.push(Uint8Array.from(compact.match(/../g), pair => parseInt(pair, 16)));
  const base64 = raw.replace(/\s/g, '');
  if (/^[A-Za-z\d+/]*={0,2}$/.test(base64) && base64.length % 4 !== 1) {
    try { candidates.push(Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), char => char.charCodeAt(0))); }
    catch { /* Not Base64. */ }
  }
  const match = candidates.find(bytes => bytes.length === expected);
  if (match) return match;
  if (candidates.length) throw new Error(`${label}长度应为 ${expected} 字节，当前为 ${candidates.map(bytes => bytes.length).join(' 或 ')} 字节`);
  throw new Error(`${label}格式无效：请使用 HEX 或 Base64`);
}
function read(id) {
  const input = $(`#${id}`);
  try {
    const bytes = decodeInput(input.value, sizes[FIELD_SIZES[id]], input.labels?.[0]?.textContent || '输入');
    input.removeAttribute('aria-invalid');
    return bytes;
  } catch (error) { input.setAttribute('aria-invalid', 'true'); input.focus(); throw error; }
}
function write(id, bytes) { $(`#${id}`).value = hex(bytes); $(`#${id}`).removeAttribute('aria-invalid'); }
function result(label = '等待双方操作') {
  flowOutcome = null;
  $('#manual-result').classList.remove('pass', 'fail');
  $('#manual-summary').textContent = label;
  $('#fact-one').textContent = '待检查'; $('#fact-one').className = '';
  $('#fact-two').textContent = '待比较'; $('#fact-two').className = '';
  $('#fact-time').textContent = '—';
  refresh();
}
function resetKem() {
  aliceSecret?.fill(0); aliceSecret = null; actionTime = null;
  $('#kem-cipher').value = ''; $('#kem-alice-secret').textContent = '等待封装';
  $('#kem-bob-cipher').value = '';
  $('#kem-bob-secret').textContent = '等待解封装'; result();
}
function resetSig() { actionTime = null; $('#signature').value = ''; $('#verify-signature').value = ''; $('#verify-message').value = ''; result(); }
function resetFields({ blankMessage = false } = {}) {
  resetSerial++;
  resetTransfers();
  document.querySelectorAll('[data-field]').forEach(input => { input.value = ''; input.removeAttribute('aria-invalid'); });
  document.querySelectorAll('[data-import]').forEach(input => { input.value = ''; });
  $('#sign-message').value = blankMessage ? '' : '这是一条测试消息。'; $('#verify-message').value = '';
  keyTime = null; resetKem(); resetSig();
}
function showSizes() {
  for (const [id, key] of Object.entries(FIELD_SIZES)) $(`#size-${id}`).textContent = `${sizes[key]} B`;
  $('#kem-flow').classList.toggle('hidden', !isKem());
  $('#sig-flow').classList.toggle('hidden', isKem());
  $('#flow-title').textContent = isKem() ? '密钥交换' : '签名验证';
  $('#fact-one-label').textContent = isKem() ? '公私钥对应关系' : '签名状态';
  $('#fact-two-label').textContent = isKem() ? '共享密钥逐字节比较' : '签名验证结果';
}
async function configureVariant() {
  if (isNgcc() || !ready) return;
  sizes = null; resetFields();
  try {
    const pending = request('describe');
    setBusy(true);
    const description = await pending;
    sizes = description.sizes;
    showSizes();
    status('请使用与当前算法、参数和哈希配套的密钥。');
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
}
async function operation(type, payload, onSuccess) {
  if (isNgcc() || !ready || busy || !sizes) return;
  try {
    const pending = request(type, payload);
    setBusy(true);
    status(`正在执行 ${name()} ${({ generate: '密钥生成', encapsulate: '封装', decapsulate: '解封装', sign: '签名', verify: '验签' })[type]}…`);
    onSuccess(await pending);
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
}
function attempt(callback) { try { callback(); } catch (error) { status(error.message, 'error'); } }

function configureVariants(preferDefault = false) {
  const family = $('#family').value;
  const variants = family === 'slhdsa' && $('#hash').value === 'sm3' ? VARIANTS.slhdsa.slice(0, 2) : VARIANTS[family];
  const previous = $('#variant').value;
  const selected = !preferDefault && variants.includes(previous) ? previous : DEFAULT_VARIANT[family];
  $('#variant').replaceChildren(...variants.map(variant => {
    const option = new Option(`${NAMES[family]}-${variant.toUpperCase()}`, variant);
    option.selected = variant === selected;
    return option;
  }));
}
async function loadCatalog() {
  if (!catalogPromise) catalogPromise = fetch('./ngcc-catalog.json').then(async response => {
    if (!response.ok) throw new Error(`无法载入候选目录（HTTP ${response.status}）`);
    const data = await response.json();
    if (!Array.isArray(data.candidates) || data.candidates.length !== 119) throw new Error('征集目录数据不完整');
    return data.candidates;
  }).catch(error => { catalogPromise = null; throw error; });
  catalog = await catalogPromise;
}
function configureCatalogParameters() {
  const candidate = catalog.find(item => item.id === $('#family').value);
  $('#variant').replaceChildren(...candidate.parameters.map((item, index) => new Option(item.label, String(index))));
}
function showCatalog() {
  const candidate = catalog?.find(item => item.id === $('#family').value);
  const parameter = candidate?.parameters[Number($('#variant').value)];
  if (!candidate || !parameter) return;
  sizes = null; resetFields();
  $('#flow-title').textContent = '2026 国内征集算法';
  $('#catalog-name').textContent = candidate.name;
  $('#catalog-id').textContent = candidate.id;
  $('#catalog-type').textContent = CATEGORIES[candidate.type].split(' · ')[0];
  $('#catalog-facts').replaceChildren(...Object.entries(parameter.sizes).map(([key, value]) => {
    const box = document.createElement('div'), label = document.createElement('dt'), size = document.createElement('dd');
    label.textContent = FACTS[key];
    size.textContent = `${value.toLocaleString('zh-CN')} ${key === 'Passes' ? '轮' : key === 'DigestBits' ? 'bit' : 'B'}`;
    box.append(label, size); return box;
  }));
  $('#catalog-path').textContent = parameter.source;
  $('#catalog-official').href = candidate.page;
  $('#catalog-archive').href = candidate.archive;
  runtime('候选资料 · 未接入验证');
  status(`${candidate.name} / ${parameter.label}：可查阅参数；暂无可运行的浏览器实现。`);
  setBusy(false);
}
async function switchLibrary() {
  sizes = null; resetFields();
  const directory = isNgcc();
  $('#catalog-detail').classList.toggle('hidden', !directory);
  $('#hash-field').classList.toggle('hidden', directory);
  $('#clear-all').classList.toggle('hidden', directory);
  for (const selector of ['.journey', '#kem-flow', '#sig-flow', '#manual-result']) {
    $(selector).classList.toggle('hidden', directory);
  }
  if (directory) {
    $('#family').replaceChildren(new Option('正在加载征集目录…', ''));
    $('#variant').replaceChildren();
    runtime('候选资料 · 加载中');
    status('正在加载 2026 年征集算法与参数…');
    try {
      if (!catalog) await loadCatalog();
      if (!isNgcc()) return;
      $('#family').replaceChildren(...Object.entries(CATEGORIES).map(([type, title]) => {
        const group = document.createElement('optgroup'); group.label = title;
        group.append(...catalog.filter(item => item.type === type).map(item => new Option(`${item.name} (${item.id})`, item.id)));
        return group;
      }));
      configureCatalogParameters(); showCatalog();
    } catch (error) { status(error.message, 'error'); runtime('候选目录加载失败', 'error'); }
  } else {
    $('#family').replaceChildren(...[
      ['密钥封装', ['mlkem', 'aigisenc']], ['数字签名', ['mldsa', 'slhdsa', 'aigissig']],
    ].map(([label, names]) => {
      const group = document.createElement('optgroup'); group.label = label;
      group.append(...names.map(value => new Option(NAMES[value], value)));
      return group;
    }));
    $('#family').value = pqmagicFamily;
    $('#family').dispatchEvent(new Event('change'));
    runtime(ready ? '本地运行' : '正在加载…', ready ? 'ready' : '');
  }
}
$('#library').addEventListener('change', switchLibrary);
$('#family').addEventListener('change', () => {
  if (isNgcc()) { configureCatalogParameters(); showCatalog(); return; }
  const family = $('#family').value;
  pqmagicFamily = family;
  $('#hash').replaceChildren(...HASHES[family].map(hash => {
    const option = new Option(hash === 'sm3' ? 'SM3' : hash === 'sha2' ? 'SHA2' : 'SHAKE / SHA3', hash);
    option.selected = hash === DEFAULT_HASH[family];
    return option;
  }));
  configureVariants(true);
  configureVariant();
});
$('#hash').addEventListener('change', () => { if (!isNgcc()) { configureVariants(); configureVariant(); } });
$('#variant').addEventListener('change', () => isNgcc() ? showCatalog() : configureVariant());
$('#clear-all').addEventListener('click', () => {
  if (busy || isNgcc()) return;
  resetFields({ blankMessage: true });
  status('已清空所有输入与结果；算法、参数集和哈希选项保持当前选择。', 'success');
});
document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  if (input.id === 'kem-public') { keyTime = null; $('#kem-alice-public').value = ''; resetKem(); }
  else if (input.id === 'kem-alice-public') resetKem();
  else if (input.id === 'kem-private' || input.id === 'kem-bob-cipher') { keyTime = input.id === 'kem-private' ? null : keyTime; $('#kem-bob-secret').textContent = '等待解封装'; result(); }
  else if (input.id === 'sig-private') { keyTime = null; resetSig(); }
  else if (input.id === 'sig-public') { keyTime = null; $('#sig-verifier-public').value = ''; result(); }
  else if (input.id === 'sig-verifier-public' || input.id === 'verify-signature') result();
  else if (input.id.endsWith('-private') || input.id.endsWith('-public')) keyTime = null;
  refresh();
}));
$('#sign-message').addEventListener('input', resetSig);
$('#verify-message').addEventListener('input', () => result());

for (const [button, prefix] of [['kem-generate', 'kem'], ['sig-generate', 'sig']]) {
  $(`#${button}`).addEventListener('click', () => operation('generate', {}, generated => {
    resetTransfers();
    write(`${prefix}-public`, generated.publicKey); write(`${prefix}-private`, generated.privateKey);
    generated.privateKey.fill(0); keyTime = generated.ms;
    if (prefix === 'kem') {
      $('#kem-alice-public').value = ''; $('#kem-bob-cipher').value = ''; resetKem();
    } else {
      $('#sig-verifier-public').value = ''; $('#verify-signature').value = ''; resetSig();
    }
    status(`${name()} 密钥对已生成。`, 'success');
  }));
}
for (const [button, from, to, clear] of [
  ['kem-send-public', 'kem-public', 'kem-alice-public', resetKem],
  ['kem-send-cipher', 'kem-cipher', 'kem-bob-cipher', () => result()],
  ['sig-send-public', 'sig-public', 'sig-verifier-public', () => result()],
]) {
  $(`#${button}`).addEventListener('click', () => attempt(() => {
    write(to, read(from)); clear();
    const route = { 'kem-send-public': 'kem-route-pk', 'kem-send-cipher': 'kem-route-ct', 'sig-send-public': 'sig-route-pk' }[button];
    animateTransfer(route, [to]);
    status(button === 'kem-send-cipher' ? 'Alice 的密文已送达 Bob。' : '公钥已送达另一端，私钥仍留在本地。', 'success');
  }));
}
$('#sig-send-result').addEventListener('click', () => attempt(() => {
  write('verify-signature', read('signature'));
  $('#verify-message').value = $('#sign-message').value;
  result(); animateTransfer('sig-route-bundle', ['verify-signature']); status('消息与签名已送达 Bob。', 'success');
}));

$('#kem-encapsulate').addEventListener('click', () => attempt(() => {
  const publicKey = read('kem-alice-public');
  operation('encapsulate', { publicKey }, output => {
    resetKem(); write('kem-cipher', output.ciphertext);
    aliceSecret = output.sharedSecret; actionTime = output.ms;
    $('#kem-alice-secret').textContent = hex(aliceSecret);
    status('Alice 已生成密文与本地共享密钥。', 'success');
  });
}));
$('#kem-decapsulate').addEventListener('click', () => attempt(() => {
  const privateKey = read('kem-private'), ciphertext = read('kem-bob-cipher');
  const publicKey = $('#kem-alice-public').value.trim() ? read('kem-alice-public') : null;
  operation('decapsulate', { privateKey, ciphertext, publicKey }, output => {
    $('#kem-bob-secret').textContent = hex(output.sharedSecret);
    $('#fact-one').textContent = output.pairMatches === null ? '未提供甲方公钥' : output.pairMatches ? '关联一致' : '关联不一致';
    $('#fact-one').className = output.pairMatches === false ? 'bad' : output.pairMatches ? 'good' : '';
    if (aliceSecret) {
      const matches = equal(aliceSecret, output.sharedSecret);
      flowOutcome = matches ? 'pass' : 'fail';
      $('#manual-result').classList.remove('pass', 'fail');
      $('#manual-result').classList.add(matches ? 'pass' : 'fail');
      $('#manual-summary').textContent = matches ? '验证通过 · 双方得到相同的共享密钥' : '验证失败 · 双方共享密钥不同';
      $('#fact-two').textContent = matches ? '32 / 32 字节一致' : '密钥不同';
      $('#fact-two').className = matches ? 'good' : 'bad';
      status($('#manual-summary').textContent, matches ? 'success' : 'error');
    } else {
      flowOutcome = 'partial';
      $('#manual-summary').textContent = 'Bob 已得到共享密钥，等待 Alice 的结果用于比较';
      $('#fact-two').textContent = '缺少甲方结果';
      status($('#manual-summary').textContent);
    }
    $('#fact-time').textContent = `生成 ${elapsed(keyTime)} · 封装 ${elapsed(actionTime)} · 解封装 ${elapsed(output.ms)}`;
    output.sharedSecret.fill(0);
  });
}));
$('#sign-button').addEventListener('click', () => attempt(() => {
  const privateKey = read('sig-private');
  const message = new TextEncoder().encode($('#sign-message').value);
  operation('sign', { privateKey, message }, output => {
    resetSig(); write('signature', output.signature); actionTime = output.ms;
    $('#fact-one').textContent = '已生成'; $('#fact-one').className = 'good';
    $('#manual-summary').textContent = '签名已生成，等待验证方验签';
    $('#fact-time').textContent = `生成 ${elapsed(keyTime)} · 签名 ${elapsed(output.ms)}`;
    status('签名已生成。将公钥、消息和签名交给验证方。', 'success');
  });
}));
$('#verify-button').addEventListener('click', () => attempt(() => {
  const publicKey = read('sig-verifier-public');
  const signature = read('verify-signature');
  const message = new TextEncoder().encode($('#verify-message').value);
  operation('verify', { publicKey, signature, message }, output => {
    flowOutcome = output.valid ? 'pass' : 'fail';
    $('#manual-result').classList.remove('pass', 'fail');
    $('#manual-result').classList.add(output.valid ? 'pass' : 'fail');
    $('#manual-summary').textContent = output.valid ? '验证通过 · 签名与公钥、消息匹配' : '验证失败 · 签名与公钥或消息不匹配';
    $('#fact-one').textContent = $('#signature').value ? '本页或外部签名' : '外部签名';
    $('#fact-two').textContent = output.valid ? '有效' : '无效';
    $('#fact-two').className = output.valid ? 'good' : 'bad';
    $('#fact-time').textContent = `生成 ${elapsed(keyTime)} · 签名 ${elapsed(actionTime)} · 验签 ${elapsed(output.ms)}`;
    status($('#manual-summary').textContent, output.valid ? 'success' : 'error');
  });
}));

document.querySelectorAll('[data-import]').forEach(input => input.addEventListener('change', async () => {
  const file = input.files?.[0]; if (!file) return;
  const id = input.dataset.import, selected = `${$('#family').value}/${$('#variant').value}/${$('#hash').value}`, currentReset = resetSerial;
  try {
    if (file.size > 256 * 1024) throw new Error('文件超过 256 KiB，请导入单个原始密钥或签名');
    const expected = sizes[FIELD_SIZES[id]];
    let bytes;
    if (/\.bin$/i.test(file.name)) {
      bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length !== expected) throw new Error(`文件长度应为 ${expected} 字节，当前为 ${bytes.length} 字节`);
    } else if (/\.(hex|txt|b64)$/i.test(file.name)) bytes = decodeInput(await file.text(), expected, file.name);
    else throw new Error('请选择 .bin、.hex、.txt 或 .b64 文件');
    if (busy || currentReset !== resetSerial || selected !== `${$('#family').value}/${$('#variant').value}/${$('#hash').value}`) return;
    write(id, bytes); $(`#${id}`).dispatchEvent(new Event('input'));
    if (id.includes('private')) bytes.fill(0);
    status(`${file.name} 已导入。`, 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { input.value = ''; }
}));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const target = $(`#${button.dataset.copy}`);
  const value = (target.value ?? target.textContent).trim();
  if (!value || value.startsWith('等待')) return status('当前没有可复制的结果', 'error');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const fallback = document.createElement('textarea');
      fallback.value = value; fallback.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(fallback); fallback.select();
      const copied = document.execCommand('copy'); fallback.remove();
      if (!copied) throw new Error('clipboard unavailable');
    }
    status('已复制到剪贴板。', 'success');
  }
  catch { status('复制失败：请检查浏览器剪贴板权限。', 'error'); }
}));
const supportedOrigin = globalThis.isSecureContext || (import.meta.env?.DEV && location.hostname === 'terminal.local');
if (!supportedOrigin || !globalThis.crypto?.getRandomValues || !globalThis.WebAssembly || !globalThis.Worker) {
  runtime('浏览器环境不可用', 'error');
  status('需要 HTTPS 或 localhost，以及 WebAssembly、Web Worker 和 Web Crypto。', 'error');
} else startWorker();
