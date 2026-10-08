import { renderDialogue, animateTransfer, resetTransfers } from './dialogue-en.js?v=20261002-usability';
import { copyText, missingBrowserFeatures } from './browser-compat.js';
import { ngccModule } from './ngcc-runtime.js';
import { candidateModule, setCandidateProvider, showCandidateWork, stopCandidateWork } from './candidate-workbench-en.js';
const $ = selector => document.querySelector(selector);
const VARIANTS = {
  mlkem: ['512', '768', '1024'],
  mldsa: ['44', '65', '87'],
  slhdsa: ['128f', '128s', '192f', '192s', '256f', '256s'],
};
const HASHES = { mlkem: ['shake'], mldsa: ['shake'], slhdsa: ['sha2', 'shake'] };
const DEFAULT_HASH = { mlkem: 'shake', mldsa: 'shake', slhdsa: 'sha2' };
const DEFAULT_VARIANT = { mlkem: '768', mldsa: '65', slhdsa: '128f' };
const NAMES = { mlkem: 'ML-KEM', mldsa: 'ML-DSA', slhdsa: 'SLH-DSA' };
const CATEGORIES = { kem: 'Key encapsulation · 41 项', sig: 'Digital signatures · 34 项', kex: 'Key exchange · 9 项', hash: 'Hashes · 35 项' };
const REPORT_SEVERITY = { Critical: '严重', High: '高', Medium: '中', Low: '低', Info: '提示' };
const REPORT_STATUS = { Confirmed: '已确认', Probable: '缺陷已确认，攻击待推导', Lead: '线索待验证', 'Proof gap': '证明不足，非攻击', Withdrawn: '已撤回' };
const REPORT_SCOPE = { implementation: '实现', design: '设计', 'side-channel': '侧信道', evaluation: '评估' };
const FIPS = { mlkem: ['FIPS 203', 'https://csrc.nist.gov/pubs/fips/203/final'],
  mldsa: ['FIPS 204', 'https://csrc.nist.gov/pubs/fips/204/final'],
  slhdsa: ['FIPS 205', 'https://csrc.nist.gov/pubs/fips/205/final'] };
const FACTS = {
  PublicKeyBytes: 'Public key', SecretKeyBytes: 'Private key', CiphertextBytes: 'Ciphertext', SharedSecretBytes: 'Shared secret',
  SignatureBytes: 'Signature', Passes: '交互rounds数', InitiatorStateBytes: 'Initiator状态',
  ResponderStateBytes: 'Responder状态', TotalMessageBytes: '总Message', DigestBits: '摘要位数', DigestBytes: '摘要长度',
};
const FIELD_SIZES = {
  'kem-public': 'pk', 'kem-private': 'sk', 'kem-alice-public': 'pk', 'kem-cipher': 'out', 'kem-bob-cipher': 'out',
  'sig-public': 'pk', 'sig-private': 'sk', 'signature': 'out', 'sig-verifier-public': 'pk', 'verify-signature': 'out',
};
const isNgcc = () => $('#library').value === 'ngcc';
const selectedCandidate = () => catalog?.find(item => item.id === $('#family').value);
setCandidateProvider(selectedCandidate);
const isRunnable = () => !isNgcc() || !!ngccModule($('#family').value, $('#variant').value);
const isKem = () => isNgcc() ? selectedCandidate()?.type === 'kem' : $('#family').value === 'mlkem';
const name = () => isNgcc() ? `${selectedCandidate()?.name} / ${selectedCandidate()?.parameters[Number($('#variant').value)]?.name}`
  : $('#family').value === 'slhdsa' ? `SLH-DSA-${$('#hash').value.toUpperCase()}-${$('#variant').value.toUpperCase()}`
    : `${NAMES[$('#family').value]}-${$('#variant').value.toUpperCase()}`;
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const equal = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const elapsed = value => value == null ? '—' : `${value.toFixed(2)} ms`;
let worker, ready = false, busy = false, active = null, serial = 0, resetSerial = 0, sizes = null;
let catalog = null, catalogPromise = null, reportIndex = null, nistFamily = 'mlkem';
let aliceSecret = null, keyTime = null, actionTime = null;
let flowOutcome = null;
let expandedLibrary = 'nist';
let labTab = new URLSearchParams(location.search).get('tab') || 'kem';
if (!['kem', 'signature', 'candidates'].includes(labTab)) labTab = 'kem';
let demoRunning = false;

function renderSidebar() {
  const selectedLibrary = $('#library').value;
  const selectedFamily = $('#family').value;
  const query = $('#sidebar-search').value.trim().toLocaleLowerCase();
  const root = $('#library-list');
  const previousScroll = root.scrollTop;
  const libraries = [
    { id: 'nist', label: 'NIST algorithms', count: '3 种Algorithm', groups: [
      ['kem', 'Key encapsulation · FIPS 203', ['mlkem'].map(id => ({ id, name: NAMES[id], ready: true }))],
      ['sig', 'Digital signatures · FIPS 204 / 205', ['mldsa', 'slhdsa'].map(id => ({ id, name: NAMES[id], ready: true }))],
    ] },
    { id: 'ngcc', label: '2026 domestic submissions', count: '119 个Candidate', groups: catalog
      ? Object.entries(CATEGORIES).map(([type, title]) => [type, title,
        catalog.filter(candidate => candidate.type === type).map(candidate => ({
          id: candidate.id, name: candidate.name,
          ready: candidate.parameters.some((_, index) =>
            ngccModule(candidate.id, index) || candidateModule(candidate, index)),
        }))]) : [] },
  ];
  root.replaceChildren(...libraries.filter(library => labTab === "candidates" ? library.id === "ngcc" : library.id === "nist").map(library => {
    const section = document.createElement('section');
    section.className = 'library-section';
    const head = document.createElement('button');
    head.type = 'button'; head.className = 'library-pick';
    head.dataset.selectLibrary = library.id;
    head.disabled = busy;
    head.setAttribute('aria-expanded', String(expandedLibrary === library.id));
    if (selectedLibrary === library.id) head.setAttribute('aria-current', 'true');
    const label = document.createElement('strong'), count = document.createElement('small');
    label.textContent = library.label; count.textContent = library.count;
    head.append(label, count);
    head.addEventListener('click', async () => {
      if (busy) return;
      const switching = $('#library').value !== library.id;
      expandedLibrary = switching || expandedLibrary !== library.id ? library.id : null;
      if (switching) {
        $('#sidebar-search').value = '';
        root.scrollTop = 0;
        $('#library').value = library.id;
        await switchLibrary();
      } else renderSidebar();
    });
    section.append(head);
    if (expandedLibrary !== library.id) return section;
    const content = document.createElement('div');
    content.className = 'library-choices';
    if (library.id === 'ngcc' && !catalog) {
      const loading = document.createElement('p');
      loading.className = 'sidebar-empty'; loading.textContent = '正在读取征集目录…';
      content.append(loading);
    }
    let visible = 0;
    for (const [, title, algorithms] of library.groups.filter(group => labTab === "candidates" || group[0] === (labTab === "signature" ? "sig" : "kem"))) {
      const matches = algorithms.filter(algorithm =>
        `${algorithm.name} ${algorithm.id}`.toLocaleLowerCase().includes(query));
      if (!matches.length) continue;
      visible += matches.length;
      const group = document.createElement('details');
      group.className = 'algorithm-category';
      group.open = Boolean(query) || (selectedLibrary === library.id &&
        matches.some(algorithm => algorithm.id === selectedFamily));
      const summary = document.createElement('summary');
      summary.textContent = title;
      const count = document.createElement('small');
      count.textContent = `${matches.length}`;
      summary.append(count); group.append(summary);
      for (const algorithm of matches) {
        const choice = document.createElement('button');
        choice.type = 'button'; choice.className = 'algorithm-choice';
        choice.dataset.selectFamily = algorithm.id;
        choice.disabled = busy;
        if (selectedLibrary === library.id && selectedFamily === algorithm.id)
          choice.setAttribute('aria-current', 'true');
        const name = document.createElement('span'), state = document.createElement('small');
        name.textContent = algorithm.name;
        state.textContent = `${algorithm.ready ? '● 可Run' : '○ 资料'} · ${algorithm.id}`;
        choice.append(name, state);
        choice.addEventListener('click', () => {
          if (busy || $('#family').value === algorithm.id) return;
          $('#family').value = algorithm.id;
          $('#family').dispatchEvent(new Event('change'));
          root.querySelector('[aria-current="true"][data-select-family]')?.focus({ preventScroll: true });
        });
        group.append(choice);
      }
      content.append(group);
    }
    if (query && !visible) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-empty'; empty.textContent = '没有匹配的Algorithm';
      content.append(empty);
    }
    section.append(content);
    return section;
  }));
  root.scrollTop = previousScroll;
  document.querySelectorAll('[data-library-shortcut]').forEach(button => {
    button.disabled = busy;
    button.classList.toggle('is-selected', selectedLibrary === button.dataset.libraryShortcut);
  });
}

function setSidebarCollapsed(collapsed, focusSearch = false) {
  $('#practice-layout').classList.toggle('is-collapsed', collapsed);
  $('#sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
  $('#sidebar-toggle').setAttribute('aria-label', collapsed ? 'Expand algorithm panel' : 'Collapse algorithm panel');
  $('#sidebar-toggle').firstElementChild.textContent = collapsed ? '›' : '‹';
  if (!collapsed && focusSearch) $('#sidebar-search').focus({ preventScroll: true });
}

// Start mobile sessions at the workspace; an explicit toggle always wins after load.
if (window.matchMedia('(max-width: 900px)').matches) setSidebarCollapsed(true);
$('#sidebar-search').addEventListener('input', renderSidebar);
$('#sidebar-toggle').addEventListener('click', () => {
  setSidebarCollapsed(!$('#practice-layout').classList.contains('is-collapsed'), true);
});
document.querySelectorAll('[data-library-shortcut]').forEach(button => button.addEventListener('click', async () => {
  if (busy || demoRunning) return;
  setSidebarCollapsed(false);
  $('#sidebar-search').value = '';
  await selectLabTab(button.dataset.libraryShortcut === 'ngcc' ? 'candidates' : 'kem');
}));

function refresh() { renderDialogue({ kem: isKem(), sizes, busy, ready: ready && isRunnable(),
  ngccSig: isNgcc() && !isKem(), outcome: flowOutcome, decode: decodeInput }); }
function status(value, kind = '') { $('#message').textContent = value; $('#message').className = `message ${kind}`; refresh(); }
function runtime(value, kind = '') { $('#runtime').setAttribute('aria-busy', String(!kind && /加载|载入/.test(value))); $('#runtime').className = `runtime ${kind}`; $('#runtime').lastElementChild.textContent = value; }
function setBusy(value) {
  busy = value;
  $('#run-example').disabled = value || !ready || !sizes || !isRunnable() || (isNgcc() && !['kem','sig'].includes(selectedCandidate()?.type));
  document.querySelectorAll('[data-lab-tab]').forEach(button => { button.disabled = value; });
  document.querySelectorAll('[data-work]').forEach(control => { control.disabled = value || !ready || !sizes || !isRunnable(); });
  document.querySelectorAll('select, [data-field], [data-import], [data-copy], .message-input').forEach(control => { control.disabled = value; });
  $('#clear-all').disabled = value;
  document.querySelectorAll('.library-sidebar [data-select-library], .library-sidebar [data-select-family], .library-sidebar [data-library-shortcut]')
    .forEach(control => { control.disabled = value; });
  refresh();
}
function request(type, payload = {}) {
  if (!isRunnable() || !ready || (busy && !demoRunning) || active) throw new Error('当前配置没有可Run的浏览器实现，或任务仍在执行');
  const requestId = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (active?.requestId !== requestId) return;
      active = null;
      worker?.terminate(); ready = false;
      reject(new Error('该参考实现Run超过 45 秒，已停止；正在重新加载工作线程'));
      startWorker();
    }, 45000);
    active = { requestId, resolve, reject, timer };
    try { worker.postMessage({ type, requestId, library: $('#library').value,
      family: $('#family').value, variant: $('#variant').value, hash: $('#hash').value, ...payload }); }
    catch (error) { clearTimeout(timer); active = null; reject(error); }
  });
}
function startWorker() {
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        ready = true;
        if (isRunnable()) { runtime('Local execution', 'ready'); configureVariant(); }
      } else if (data.type === 'error' && !ready && !active) {
        runtime('Load failed', 'error'); status(data.message, 'error');
      } else if ((data.type === 'result' || data.type === 'error') && data.requestId === active?.requestId) {
        const pending = active;
        active = null;
        clearTimeout(pending.timer);
        if (data.type === 'error') pending.reject(new Error(data.message));
        else pending.resolve(data.result);
      }
    };
    worker.onerror = event => {
      ready = false;
      const pending = active; active = null;
      clearTimeout(pending?.timer);
      pending?.reject(new Error(event.message || '工作线程失败'));
      runtime('WASM Load failed', 'error');
      status(event.message || 'WASM 工作线程失败', 'error');
      setBusy(false);
    };
    worker.postMessage({ type: 'init' });
  } catch (error) { runtime('浏览器环境不可用', 'error'); status(error.message, 'error'); }
}
function decodeInput(input, expected, label) {
  const raw = input.trim();
  if (!raw) throw new Error(`${label}为Empty`);
  if (/-----BEGIN\s/i.test(raw)) throw new Error(`${label}需为原始bytes，不支持 PEM / DER`);
  const compact = raw.replace(/\b0x/gi, '').replace(/[\s:,]/g, '');
  const candidates = [];
  if (/^[\da-f]+$/i.test(compact) && compact.length % 2 === 0) candidates.push(Uint8Array.from(compact.match(/../g), pair => parseInt(pair, 16)));
  const base64 = raw.replace(/\s/g, '');
  if (/^[A-Za-z\d+/]*={0,2}$/.test(base64) && base64.length % 4 !== 1) {
    try { candidates.push(Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), char => char.charCodeAt(0))); }
    catch { /* Not Base64. */ }
  }
  const match = candidates.find(bytes => typeof expected === 'number' ? bytes.length === expected
    : bytes.length >= expected.min && bytes.length <= expected.max);
  if (match) return match;
  if (candidates.length) throw new Error(`${label}长度应为 ${typeof expected === 'number' ? expected : `${expected.min} to ${expected.max}`} bytes，当前为 ${candidates.map(bytes => bytes.length).join(' 或 ')} bytes`);
  throw new Error(`${label}格式Invalid：请使用 HEX 或 Base64`);
}
function expectedSize(id) {
  const size = sizes[FIELD_SIZES[id]];
  return isNgcc() && !isKem() && (id === 'signature' || id === 'verify-signature')
    ? { min: 1, max: size } : size;
}
function read(id) {
  const input = $(`#${id}`);
  try {
    const bytes = decodeInput(input.value, expectedSize(id), input.labels?.[0]?.textContent || '输入');
    input.removeAttribute('aria-invalid');
    return bytes;
  } catch (error) { input.setAttribute('aria-invalid', 'true'); input.focus(); throw error; }
}
function write(id, bytes) { $(`#${id}`).value = hex(bytes); $(`#${id}`).removeAttribute('aria-invalid'); }
function result(label = 'Waiting for both parties') {
  flowOutcome = null;
  $('#manual-result').classList.remove('pass', 'fail');
  $('#manual-summary').textContent = label;
  $('#fact-one').textContent = 'Not checked'; $('#fact-one').className = '';
  $('#fact-two').textContent = 'Not compared'; $('#fact-two').className = '';
  $('#fact-time').textContent = '—';
  refresh();
}
function resetKem() {
  aliceSecret?.fill(0); aliceSecret = null; actionTime = null;
  $('#kem-cipher').value = ''; $('#kem-alice-secret').textContent = 'Waiting for encapsulation';
  $('#kem-bob-cipher').value = '';
  $('#kem-bob-secret').textContent = 'Waiting for decapsulation'; result();
}
function resetSig() { actionTime = null; $('#signature').value = ''; $('#verify-signature').value = ''; $('#verify-message').value = ''; result(); }
function resetFields({ blankMessage = false } = {}) {
  resetSerial++;
  resetTransfers();
  document.querySelectorAll('[data-field]').forEach(input => { input.value = ''; input.removeAttribute('aria-invalid'); });
  document.querySelectorAll('[data-import]').forEach(input => { input.value = ''; });
  $('#sign-message').value = blankMessage ? '' : 'This is a test message.'; $('#verify-message').value = '';
  keyTime = null; resetKem(); resetSig();
}
function showSizes() {
  for (const [id, key] of Object.entries(FIELD_SIZES)) $(`#size-${id}`).textContent = `${sizes[key]} B`;
  $('#kem-flow').classList.toggle('hidden', !isKem());
  $('#sig-flow').classList.toggle('hidden', isKem());
  $('#flow-title').textContent = isKem() ? 'Key encapsulation' : 'Signature verification';
  $('#fact-one-label').textContent = isKem() ? (isNgcc() ? '密钥配套情况' : 'Key-pair consistency') : 'Signature状态';
  $('#fact-two-label').textContent = isKem() ? 'Byte-for-byte shared secret comparison' : 'Signature verification结果';
}
async function configureVariant() {
  if (!isRunnable() || !ready) return;
  sizes = null; resetFields();
  try {
    const pending = request('describe');
    setBusy(true);
    const description = await pending;
    sizes = description.sizes;
    showSizes();
    status(isNgcc() ? 'Loaded征集参考实现；请使用与此参数实例配套的密钥。'
      : 'Use keys matching the selected algorithm, parameters and hash.');
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
}
async function operation(type, payload, onSuccess) {
  if (!isRunnable() || !ready || busy || !sizes) return;
  try {
    const pending = request(type, payload);
    setBusy(true);
    status(`Running ${name()} ${({ generate: 'Key generation', encapsulate: 'Encapsulate', decapsulate: 'Decapsulate', sign: 'Signature', verify: 'Verify' })[type]}…`);
    onSuccess(await pending);
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
}
function attempt(callback) { try { callback(); } catch (error) { status(error.message, 'error'); } }

function configureVariants(preferDefault = false) {
  const family = $('#family').value;
  const variants = VARIANTS[family];
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
    if (!response.ok) throw new Error(`无法载入Candidate目录（HTTP ${response.status}）`);
    const data = await response.json();
    if (!Array.isArray(data.candidates) || data.candidates.length !== 119) throw new Error('征集目录数据不完整');
    return data.candidates;
  }).catch(error => { catalogPromise = null; throw error; });
  catalog = await catalogPromise;
  if (!reportIndex) {
    try {
      const response = await fetch('./ngcc-reports-zh.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const index = await response.json();
      if (index.findings?.length !== 166 || index.active_findings !== 164 || index.findings.some(item => !item.title || !item.summary || !item.source_url)) throw new Error('报告快照数据不完整');
      reportIndex = index;
    } catch { reportIndex = { unavailable: true }; }
  }
}
function configureCatalogParameters() {
  const candidate = catalog.find(item => item.id === $('#family').value);
  $('#variant').replaceChildren(...candidate.parameters.map((item, index) => new Option(item.label, String(index))));
}
function showReports(candidate) {
  const list = $('#report-list');
  const reports = reportIndex?.findings?.filter(item => item.candidateId === candidate.id) || [];
  $('#report-title').textContent = `${candidate.name} · 中文安全报告摘要`;
  $('#report-index-link').href = reports.length ? `https://ngcc.dev/reports/${candidate.id}.html` : 'https://ngcc.dev/reports/index.html';
  $('#report-index-link').textContent = '查看 ngcc.dev 报告原文';
  $('#report-intro').textContent = reportIndex?.unavailable
    ? '报告目录暂时无法读取，请访问原站核对最新信息。浏览器功能验证不构成安全认证。'
    : `下方为 ngcc.dev 原报告的中文摘要（非全文翻译），核对日期 ${reportIndex.reviewed_utc}；原站更新 ${reportIndex.source_updated_utc} UTC。发现针对报告注明的提交版本，不等于本站二进制复测结论。点击每项标题可查看作者署名、完整论证和复现步骤。`;
  if (reportIndex?.unavailable) {
    list.replaceChildren(document.createElement('p'));
    list.firstChild.className = 'report-empty';
    list.firstChild.textContent = '可前往报告原站查看全部Candidate。';
    return;
  }
  if (!reports.length) {
    const empty = document.createElement('p');
    empty.className = 'report-empty';
    empty.textContent = '该报告源目前未列出此Candidate的主动发现；这不表示通过安全评估。可从上方查看报告索引与源码审查。';
    list.replaceChildren(empty);
    return;
  }
  const ul = document.createElement('ul'); ul.className = 'report-items';
  for (const finding of reports) {
    const li = document.createElement('li'), id = document.createElement('b'), link = document.createElement('a');
    id.textContent = finding.id;
    link.textContent = finding.title;
    link.href = finding.source_url;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    const note = document.createElement('span'); note.className = 'report-note';
    note.textContent = `${REPORT_SEVERITY[finding.severity]} · ${REPORT_STATUS[finding.status]} · ${REPORT_SCOPE[finding.scope]} · 更新 ${finding.updated}`;
    li.append(id, link, note);
    const detail = document.createElement('p');
    detail.className = 'report-detail';detail.textContent = finding.summary;li.append(detail);
    if (finding.status === 'Withdrawn') li.classList.add('report-withdrawn');
    ul.append(li);
  }
  list.replaceChildren(ul);
}
function showNistReports() {
  const [label, url] = FIPS[$('#family').value];
  $('#report-panel').classList.remove('hidden');
  $('#report-title').textContent = '标准与实现评估';
  $('#report-index-link').href = url;
  $('#report-index-link').textContent = `查看 NIST ${label}`;
  $('#report-intro').textContent = 'The selected algorithm is NIST-standardized. This WASM is built from PQMagic source. This site binary has no independent security audit or FIPS implementation validation. Algorithm standardization does not certify an implementation.';
  const link = document.createElement('a');
  link.href = 'https://github.com/pqcrypto-cn/PQMagic'; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.textContent = '查看当前模块实现Source';
  $('#report-list').replaceChildren(link);
}
function showCatalog() {
  const candidate = catalog?.find(item => item.id === $('#family').value);
  const parameter = candidate?.parameters[Number($('#variant').value)];
  if (!candidate || !parameter) return;
  sizes = null; resetFields();
  const special = candidate.type === 'kex' || candidate.type === 'hash';
  const runnable = special ? Boolean(candidateModule(candidate, Number($('#variant').value))) : isRunnable();
  $('#flow-title').textContent = candidate.type === 'hash' ? '哈希实战'
    : candidate.type === 'kex' ? 'Key exchange实战' : candidate.type === 'sig' ? 'Signature实战' : 'Key encapsulation';
  $('#catalog-name').textContent = candidate.name;
  $('#catalog-id').textContent = candidate.id;
  $('#catalog-type').textContent = CATEGORIES[candidate.type].split(' · ')[0];
  $('#catalog-notice').textContent = runnable
    ? '此Parameter set已由征集提交源码编译为浏览器 WASM，可在下方Run。功能验证不构成安全认证。'
    : '此Parameter set尚未接入可Run的浏览器实现。可查阅原始参数、提交团队与源码；下方不展示无法执行的操作。';
  $('#catalog-facts').replaceChildren(...Object.entries(parameter.sizes).map(([key, value]) => {
    const box = document.createElement('div'), label = document.createElement('dt'), size = document.createElement('dd');
    label.textContent = FACTS[key];
    size.textContent = `${value.toLocaleString('zh-CN')} ${key === 'Passes' ? 'rounds' : key === 'DigestBits' ? 'bit' : 'B'}`;
    box.append(label, size); return box;
  }));
  $('#catalog-team').textContent = candidate.team.join('、');
  $('#catalog-path').textContent = parameter.source;
  $('#catalog-official').href = candidate.page;
  $('#catalog-archive').href = candidate.archive;
  $('#report-panel').classList.remove('hidden');
  showReports(candidate);
  showCandidateWork(candidate, Number($('#variant').value));
  $('.journey').classList.toggle('hidden', !runnable || special);
  $('#manual-result').classList.toggle('hidden', !runnable || special);
  $('#clear-all').classList.toggle('hidden', !runnable || special);
  $('#kem-flow').classList.add('hidden');
  $('#sig-flow').classList.add('hidden');
  runtime(runnable ? '征集实现 · Local execution' : 'Candidate information: implementation unavailable', runnable ? 'ready' : '');
  status(runnable ? `${candidate.name} / ${parameter.label}：Loading WASM…`
    : `${candidate.name} / ${parameter.label}：可查阅参数；暂无可Run的浏览器实现。`);
  setBusy(false);
  if (runnable && !special) configureVariant();
  else if (runnable) status(`${candidate.name} / ${parameter.label}：已接入，可在下方Local execution。`);
}
async function switchLibrary() {
  sizes = null; resetFields(); stopCandidateWork();
  const directory = isNgcc();
  $('#catalog-detail').classList.toggle('hidden', !directory);
  $('#report-panel').classList.toggle('hidden', !directory);
  $('#candidate-workbench').classList.add('hidden');
  $('#hash-field').classList.toggle('hidden', directory);
  $('#clear-all').classList.toggle('hidden', directory);
  for (const selector of ['.journey', '#kem-flow', '#sig-flow', '#manual-result']) {
    $(selector).classList.toggle('hidden', directory);
  }
  if (directory) {
    $('#family').replaceChildren(new Option('Loading征集目录…', ''));
    $('#variant').replaceChildren();
    runtime('Loading candidate information');
    status('Loading 2026 年征集Algorithms and parameters…');
    renderSidebar();
    try {
      if (!catalog) await loadCatalog();
      if (!isNgcc()) return;
      $('#family').replaceChildren(...Object.entries(CATEGORIES).map(([type, title]) => {
        const group = document.createElement('optgroup'); group.label = title;
        group.append(...catalog.filter(item => item.type === type).map(item => new Option(
          `${item.parameters.some((_, index) => ngccModule(item.id, index) || candidateModule(item, index)) ? '● ' : ''}${item.name} (${item.id})`, item.id)));
        return group;
      }));
      configureCatalogParameters(); showCatalog(); renderSidebar();
    } catch (error) { status(error.message, 'error'); runtime('Candidate目录Load failed', 'error'); }
  } else {
    $('#family').replaceChildren(...[
      ['Key encapsulation', ['mlkem']], ['Digital signatures', ['mldsa', 'slhdsa']],
    ].map(([label, names]) => {
      const group = document.createElement('optgroup'); group.label = label;
      group.append(...names.map(value => new Option(NAMES[value], value)));
      return group;
    }));
    $('#family').value = nistFamily;
    $('#family').dispatchEvent(new Event('change'));
    runtime(ready ? 'Local execution' : 'Loading…', ready ? 'ready' : '');
  }
}
$('#library').addEventListener('change', switchLibrary);
$('#family').addEventListener('change', () => {
  if (isNgcc()) { configureCatalogParameters(); showCatalog(); renderSidebar(); return; }
  const family = $('#family').value;
  nistFamily = family;
  $('#hash-field').classList.toggle('hidden', family !== 'slhdsa');
  $('#hash').replaceChildren(...HASHES[family].map(hash => {
    const option = new Option(hash === 'sha2' ? 'SHA2' : 'SHAKE', hash);
    option.selected = hash === DEFAULT_HASH[family];
    return option;
  }));
  configureVariants(true);
  configureVariant();
  showNistReports();
  renderSidebar();
});
$('#hash').addEventListener('change', () => { if (!isNgcc()) { configureVariants(); configureVariant(); } });
$('#variant').addEventListener('change', () => isNgcc() ? showCatalog() : configureVariant());
$('#clear-all').addEventListener('click', () => {
  if (busy || !isRunnable()) return;
  resetFields({ blankMessage: true });
  status('Inputs and results cleared. Algorithm and parameters remain selected.', 'success');
});
document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  if (input.id === 'kem-public') { keyTime = null; $('#kem-alice-public').value = ''; resetKem(); }
  else if (input.id === 'kem-alice-public') resetKem();
  else if (input.id === 'kem-private' || input.id === 'kem-bob-cipher') { keyTime = input.id === 'kem-private' ? null : keyTime; $('#kem-bob-secret').textContent = 'Waiting for decapsulation'; result(); }
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
    status(`${name()} 密钥对已Generate。`, 'success');
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
    status(button === 'kem-send-cipher' ? 'Alice 的Ciphertext已送达 Bob。' : 'Public key已送达另一端，Private key仍留在本地。', 'success');
  }));
}
$('#sig-send-result').addEventListener('click', () => attempt(() => {
  write('verify-signature', read('signature'));
  $('#verify-message').value = $('#sign-message').value;
  result(); animateTransfer('sig-route-bundle', ['verify-signature']); status('Message与Signature已送达 Bob。', 'success');
}));

$('#kem-encapsulate').addEventListener('click', () => attempt(() => {
  const publicKey = read('kem-alice-public');
  operation('encapsulate', { publicKey }, output => {
    resetKem(); write('kem-cipher', output.ciphertext);
    aliceSecret = output.sharedSecret; actionTime = output.ms;
    $('#kem-alice-secret').textContent = hex(aliceSecret);
    status('Alice 已GenerateCiphertext与本地Shared secret。', 'success');
  });
}));
$('#kem-decapsulate').addEventListener('click', () => attempt(() => {
  const privateKey = read('kem-private'), ciphertext = read('kem-bob-cipher');
  const publicKey = $('#kem-alice-public').value.trim() ? read('kem-alice-public') : null;
  operation('decapsulate', { privateKey, ciphertext, publicKey }, output => {
    $('#kem-bob-secret').textContent = hex(output.sharedSecret);
    $('#fact-one').textContent = isNgcc() ? '通过双方Shared secret比对' : output.pairMatches === null
      ? '未提供甲方Public key' : output.pairMatches ? 'Consistent' : 'Inconsistent';
    $('#fact-one').className = output.pairMatches === false ? 'bad' : output.pairMatches ? 'good' : '';
    if (aliceSecret) {
      const matches = equal(aliceSecret, output.sharedSecret);
      flowOutcome = matches ? 'pass' : 'fail';
      $('#manual-result').classList.remove('pass', 'fail');
      $('#manual-result').classList.add(matches ? 'pass' : 'fail');
      $('#manual-summary').textContent = matches ? 'Passed: both parties derived the same shared secret' : 'Failed: shared secrets differ';
      $('#fact-two').textContent = matches ? `${sizes.ss} / ${sizes.ss} bytes match` : '密钥不同';
      $('#fact-two').className = matches ? 'good' : 'bad';
      status($('#manual-summary').textContent, matches ? 'success' : 'error');
    } else {
      flowOutcome = 'partial';
      $('#manual-summary').textContent = 'Bob 已得到Shared secret，等待 Alice 的结果用于比较';
      $('#fact-two').textContent = '缺少甲方结果';
      status($('#manual-summary').textContent);
    }
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Encapsulate ${elapsed(actionTime)} · Decapsulate ${elapsed(output.ms)}`;
    output.sharedSecret.fill(0);
  });
}));
$('#sign-button').addEventListener('click', () => attempt(() => {
  const privateKey = read('sig-private');
  const message = new TextEncoder().encode($('#sign-message').value);
  operation('sign', { privateKey, message }, output => {
    resetSig(); write('signature', output.signature); actionTime = output.ms;
    $('#fact-one').textContent = '已Generate'; $('#fact-one').className = 'good';
    $('#manual-summary').textContent = 'Signature已Generate，Waiting to verify方Verify';
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Signature ${elapsed(output.ms)}`;
    status('Signature已Generate。将Public key、Message和Signature交给验证方。', 'success');
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
    $('#manual-summary').textContent = output.valid ? 'Passed: signature matches the public key and message' : 'Failed: signature does not match';
    $('#fact-one').textContent = $('#signature').value ? '本页或外部Signature' : '外部Signature';
    $('#fact-two').textContent = output.valid ? 'Valid' : 'Invalid';
    $('#fact-two').className = output.valid ? 'good' : 'bad';
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Signature ${elapsed(actionTime)} · Verify ${elapsed(output.ms)}`;
    status($('#manual-summary').textContent, output.valid ? 'success' : 'error');
  });
}));

document.querySelectorAll('[data-import]').forEach(input => input.addEventListener('change', async () => {
  const file = input.files?.[0]; if (!file) return;
  const id = input.dataset.import, selected = `${$('#library').value}/${$('#family').value}/${$('#variant').value}/${$('#hash').value}`, currentReset = resetSerial;
  try {
    if (file.size > 256 * 1024) throw new Error('文件超过 256 KiB，请Import单个原始密钥或Signature');
    const expected = expectedSize(id);
    let bytes;
    if (/\.bin$/i.test(file.name)) {
      bytes = new Uint8Array(await file.arrayBuffer());
      const valid = typeof expected === 'number' ? bytes.length === expected
        : bytes.length >= expected.min && bytes.length <= expected.max;
      if (!valid) throw new Error(`文件长度应为 ${typeof expected === 'number' ? expected : `${expected.min} to ${expected.max}`} bytes，当前为 ${bytes.length} bytes`);
    } else if (/\.(hex|txt|b64)$/i.test(file.name)) bytes = decodeInput(await file.text(), expected, file.name);
    else throw new Error('请选择 .bin、.hex、.txt 或 .b64 文件');
    if (busy || currentReset !== resetSerial || selected !== `${$('#library').value}/${$('#family').value}/${$('#variant').value}/${$('#hash').value}`) return;
    write(id, bytes); $(`#${id}`).dispatchEvent(new Event('input'));
    if (id.includes('private')) bytes.fill(0);
    status(`${file.name} 已Import。`, 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { input.value = ''; }
}));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const target = $(`#${button.dataset.copy}`);
  const value = (target.value ?? target.textContent).trim();
  if (!value || value.startsWith('等待')) return status('当前没有可Copy的结果', 'error');
  try {
    await copyText(value);
    status('Copied to clipboard.', 'success');
  }
  catch { status('Copy failed: check clipboard permissions.', 'error'); }
}));
async function selectLabTab(tab) {
  if (busy || demoRunning) return;
  labTab = tab;
  document.querySelectorAll('[data-lab-tab]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.labTab === tab)); button.tabIndex = button.dataset.labTab === tab ? 0 : -1; });
  const url = new URL(location.href); url.searchParams.set('tab', tab); history.replaceState(null, '', url);
  $('#library').value = tab === 'candidates' ? 'ngcc' : 'nist';
  const requested = new URLSearchParams(location.search).get('algorithm');
  nistFamily = tab === 'signature' && requested === 'slh-dsa' ? 'slhdsa' : tab === 'signature' ? 'mldsa' : 'mlkem';
  expandedLibrary = $('#library').value;
  await switchLibrary();
}
document.querySelectorAll('[data-lab-tab]').forEach(button => {
  button.addEventListener('click', () => { void selectLabTab(button.dataset.labTab); });
  button.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-lab-tab]')];
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const i = tabs.indexOf(button);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus(); void selectLabTab(tabs[next].dataset.labTab);
  });
});
$('#run-example').addEventListener('click', async () => {
  if (busy || demoRunning || !ready || !sizes || !isRunnable()) return;
  demoRunning = true;
  try {
    resetFields();
    setBusy(true);
    $('#example-status').textContent = 'Running example…';
    const prefix = isKem() ? 'kem' : 'sig';
    const keys = await request('generate');
    write(prefix + '-public', keys.publicKey); write(prefix + '-private', keys.privateKey); keyTime = keys.ms;
    if (isKem()) {
      write('kem-alice-public', keys.publicKey);
      const encapsulated = await request('encapsulate', { publicKey: keys.publicKey });
      write('kem-cipher', encapsulated.ciphertext); write('kem-bob-cipher', encapsulated.ciphertext);
      const decapsulated = await request('decapsulate', { privateKey: keys.privateKey, ciphertext: encapsulated.ciphertext, publicKey: keys.publicKey });
      aliceSecret = encapsulated.sharedSecret;
      $('#kem-alice-secret').textContent = hex(aliceSecret); $('#kem-bob-secret').textContent = hex(decapsulated.sharedSecret);
      const valid = equal(aliceSecret, decapsulated.sharedSecret);
      flowOutcome = valid ? 'pass' : 'fail';
      $('#fact-one').textContent = 'Generated example key pair'; $('#fact-two').textContent = valid ? `${sizes.ss} / ${sizes.ss} bytes match` : '密钥不同';
      $('#fact-time').textContent = `Generate ${elapsed(keys.ms)} · Encapsulate ${elapsed(encapsulated.ms)} · Decapsulate ${elapsed(decapsulated.ms)}`;
      $('#manual-summary').textContent = valid ? 'Passed: both parties derived the same shared secret' : 'Failed: shared secrets differ';
      decapsulated.sharedSecret.fill(0);
    } else {
      $('#sign-message').value = 'Yibiao cryptography lab example';
      const message = new TextEncoder().encode($('#sign-message').value);
      const signed = await request('sign', { privateKey: keys.privateKey, message });
      write('signature', signed.signature); write('verify-signature', signed.signature); write('sig-verifier-public', keys.publicKey); $('#verify-message').value = $('#sign-message').value;
      const checked = await request('verify', { publicKey: keys.publicKey, signature: signed.signature, message });
      flowOutcome = checked.valid ? 'pass' : 'fail';
      $('#fact-one').textContent = 'Generated example signature'; $('#fact-two').textContent = checked.valid ? 'Valid' : 'Invalid';
      $('#fact-time').textContent = `Generate ${elapsed(keys.ms)} · Signature ${elapsed(signed.ms)} · Verify ${elapsed(checked.ms)}`;
      $('#manual-summary').textContent = checked.valid ? 'Passed: signature matches the public key and message' : 'Failed: signature does not match';
    }
    keys.privateKey.fill(0);
    $('#manual-result').classList.add(flowOutcome);
    $('#example-status').textContent = $('#manual-summary').textContent;
    status($('#manual-summary').textContent, flowOutcome === 'pass' ? 'success' : 'error');
  } catch (error) { status(error.message, 'error'); $('#example-status').textContent = error.message; }
  finally { demoRunning = false; setBusy(false); }
});
void selectLabTab(labTab);
const missing = missingBrowserFeatures();
if (missing.length) {
  runtime('浏览器环境不可用', 'error');
  status(`当前浏览器缺少 ${missing.join('、')}，请使用支持这些功能的浏览器。`, 'error');
} else startWorker();
renderSidebar();
showNistReports();
