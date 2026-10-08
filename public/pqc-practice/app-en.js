import { setupUsability } from './usability-en.js';
import { renderDialogue, animateTransfer, resetTransfers, transferSnapshot, restoreTransfers } from './dialogue-en.js?v=20261002-usability';
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
const CATEGORIES = { kem: 'Key encapsulation · 41  items', sig: 'Digital signatures · 34  items', kex: 'Key exchange · 9  items', hash: 'Hashes · 35  items' };
const REPORT_SEVERITY = { Critical: 'Critical', High: 'High', Medium: 'Medium', Low: 'Low', Info: 'Info' };
const REPORT_STATUS = { Confirmed: 'Confirmed', Probable: 'Confirmed defect; attack not established', Lead: 'Unverified lead', 'Proof gap': 'Proof gap; not an attack', Withdrawn: 'Withdrawn' };
const REPORT_SCOPE = { implementation: 'Implementation', design: 'Design', 'side-channel': 'Side channel', evaluation: 'Evaluation' };
const FIPS = { mlkem: ['FIPS 203', 'https://csrc.nist.gov/pubs/fips/203/final'],
  mldsa: ['FIPS 204', 'https://csrc.nist.gov/pubs/fips/204/final'],
  slhdsa: ['FIPS 205', 'https://csrc.nist.gov/pubs/fips/205/final'] };
const FACTS = {
  PublicKeyBytes: 'Public key', SecretKeyBytes: 'Private key', CiphertextBytes: 'Ciphertext', SharedSecretBytes: 'Shared secret',
  SignatureBytes: 'Signature', Passes: 'Interaction rounds', InitiatorStateBytes: 'Initiator state',
  ResponderStateBytes: 'Responder state', TotalMessageBytes: 'Total message', DigestBits: 'Digest bits', DigestBytes: 'Digest bytes',
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
let catalog = null, catalogPromise = null, reportIndex = null, catalogError = '', nistFamily = 'mlkem';
let aliceSecret = null, keyTime = null, actionTime = null;
let flowOutcome = null;
let expandedLibrary = 'nist';
let labTab = new URLSearchParams(location.search).get('tab') || 'kem';
if (!['kem', 'signature', 'candidates'].includes(labTab)) labTab = 'kem';
let demoRunning = false;
let usability, finalTime = null, loadTimer = null;
const parameterLabels = {
 mlkem: {512:[1,800,1632,768],768:[3,1184,2400,1088],1024:[5,1568,3168,1568]},
 mldsa: {44:[2,1312,2560,2420],65:[3,1952,4032,3309],87:[5,2592,4896,4627]},
 slhdsa: {"128f":[1,32,64,17088],"128s":[1,32,64,7856],"192f":[3,48,96,35664],"192s":[3,48,96,16224],"256f":[5,64,128,49856],"256s":[5,64,128,29792]}
};

function renderSidebar() {
  const selectedLibrary = $('#library').value;
  const selectedFamily = $('#family').value;
  const query = $('#sidebar-search').value.trim().toLocaleLowerCase();
  const root = $('#library-list');
  const previousScroll = root.scrollTop;
  const libraries = [
    { id: 'nist', label: 'NIST algorithms', count: '3  algorithms', groups: [
      ['kem', 'Key encapsulation · FIPS 203', ['mlkem'].map(id => ({ id, name: NAMES[id], ready: true }))],
      ['sig', 'Digital signatures · FIPS 204 / 205', ['mldsa', 'slhdsa'].map(id => ({ id, name: NAMES[id], ready: true }))],
    ] },
    { id: 'ngcc', label: '2026 domestic submissions', count: '119  candidates', groups: catalog
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
      loading.className = catalogError ? 'sidebar-empty' : 'sidebar-empty loading-placeholder'; loading.textContent = catalogError || 'Loading submission catalogue…';
      content.append(loading);
      if(catalogError){const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>$('#retry-runtime').click();content.append(retry);}
    }
    let visible = 0;
    for (const [, title, algorithms] of library.groups.filter(group => labTab === "candidates" || group[0] === (labTab === "signature" ? "sig" : "kem"))) {
      const matches = algorithms.filter(algorithm =>
        `${algorithm.name} ${algorithm.id}`.toLocaleLowerCase().includes(query) && (!$('#runnable-only').checked || algorithm.ready));
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
        state.textContent = `${algorithm.ready ? '● Available' : '○ Information'} · ${algorithm.id}`;
        choice.append(name, state);
        choice.addEventListener('click', () => {
          if (busy || $('#family').value === algorithm.id) return;
          $('#family').value = algorithm.id;
          $('#family').dispatchEvent(new CustomEvent('change', {detail:{internal:true}}));
          root.querySelector('[aria-current="true"][data-select-family]')?.focus({ preventScroll: true });
        });
        group.append(choice);
      }
      content.append(group);
    }
    if (query && !visible) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-empty'; empty.textContent = 'No matching algorithms';
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
  ngccSig: isNgcc() && !isKem(), outcome: flowOutcome, decode: decodeInput }); usability?.update(uiState()); }
function uiState() { return {kem:isKem(), sizes, busy, outcome:flowOutcome, name:name(), timings:[{label:"Key generation",ms:keyTime},{label:isKem()?"Encapsulate":"Signature",ms:actionTime},{label:isKem()?"Decapsulate":"Verify",ms:finalTime}]}; }
function status(value, kind = '') { $('#message').textContent = value; $('#message').className = `message ${kind}`; refresh(); }
function runtime(value, kind = '') { $('#runtime').setAttribute('aria-busy', String(!kind && /Loading|Loading/.test(value))); $('#runtime').className = `runtime ${kind}`; $('#runtime').lastElementChild.classList.remove('lab-skeleton'); $('#runtime').lastElementChild.textContent = value; $('#retry-runtime').hidden = kind !== 'error'; }
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
  if (!isRunnable() || !ready || (busy && !demoRunning) || active) throw new Error('The current configuration is unavailable or an operation is still running.');
  const requestId = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (active?.requestId !== requestId) return;
      active = null;
      worker?.terminate(); ready = false;
      runtime('Operation timed out', 'error');
      reject(new Error('The reference implementation exceeded 45 seconds and was stopped. Retry loading the worker.'));
    }, 45000);
    active = { requestId, resolve, reject, timer };
    try { worker.postMessage({ type, requestId, library: $('#library').value,
      family: $('#family').value, variant: $('#variant').value, hash: $('#hash').value, ...payload }); }
    catch (error) { clearTimeout(timer); active = null; reject(error); }
  });
}
function startWorker() {
  worker?.terminate(); ready = false; clearTimeout(loadTimer);
  runtime('Loading algorithm module…');
  loadTimer = setTimeout(() => { worker?.terminate(); runtime('Module load timed out', 'error'); status('The module did not become ready within 15 seconds. Retry loading.', 'error'); setBusy(false); }, 15000);
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(loadTimer); ready = true;
        if (isRunnable()) { runtime('Local execution', 'ready'); configureVariant(); }
      } else if (data.type === 'error' && !ready && !active) {
        clearTimeout(loadTimer); runtime('Load failed', 'error'); status(data.message, 'error');
      } else if ((data.type === 'result' || data.type === 'error') && data.requestId === active?.requestId) {
        const pending = active;
        active = null;
        clearTimeout(pending.timer);
        if (data.type === 'error') pending.reject(new Error(data.message));
        else pending.resolve(data.result);
      }
    };
    worker.onerror = event => {
      clearTimeout(loadTimer); ready = false;
      const pending = active; active = null;
      clearTimeout(pending?.timer);
      pending?.reject(new Error(event.message || 'Worker failed'));
      runtime('WASM Load failed', 'error');
      status(event.message || 'WASM worker failed', 'error');
      setBusy(false);
    };
    worker.postMessage({ type: 'init' });
  } catch (error) { clearTimeout(loadTimer); runtime('Required browser features unavailable', 'error'); status(error.message, 'error'); }
}
function decodeInput(input, expected, label) {
  const raw = input.trim();
  if (!raw) throw new Error(`${label} is empty`);
  if (/-----BEGIN\s/i.test(raw)) throw new Error(`${label} must contain raw bytes; PEM / DER is unsupported`);
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
  if (candidates.length) throw new Error(`${label} length must be  ${typeof expected === 'number' ? expected : `${expected.min} to ${expected.max}`}  bytes; received  ${candidates.map(bytes => bytes.length).join(' or ')} bytes`);
  throw new Error(`${label} has an invalid format. Use HEX or Base64.`);
}
function expectedSize(id) {
  const size = sizes[FIELD_SIZES[id]];
  return isNgcc() && !isKem() && (id === 'signature' || id === 'verify-signature')
    ? { min: 1, max: size } : size;
}
function read(id) {
  const input = $(`#${id}`);
  try {
    const bytes = decodeInput(input.value, expectedSize(id), input.labels?.[0]?.textContent || 'Input');
    input.removeAttribute('aria-invalid');
    return bytes;
  } catch (error) { input.setAttribute('aria-invalid', 'true'); input.focus(); throw error; }
}
function write(id, bytes) { $(`#${id}`).value = hex(bytes).match(/.{1,8}/g)?.join(' ') || ''; $(`#${id}`).removeAttribute('aria-invalid'); }
function result(label = '○ Not started') {
  finalTime = null;
  flowOutcome = null;
  $('#manual-result').classList.remove('pass', 'fail');
  $('#manual-summary').textContent = label;
  $('#fact-one').textContent = '○ Not started'; $('#fact-one').className = '';
  $('#fact-two').textContent = '○ Not started'; $('#fact-two').className = '';
  $('#fact-time').textContent = 'Not started';
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
  usability?.hidePrivate();
  resetTransfers();
  document.querySelectorAll('[data-field]').forEach(input => { input.value = ''; input.removeAttribute('aria-invalid'); });
  document.querySelectorAll('[data-import]').forEach(input => { input.value = ''; });
  $('#sign-message').value = blankMessage ? '' : 'This is a test message.'; $('#verify-message').value = '';
  keyTime = null; finalTime = null; resetKem(); resetSig();
}
function showSizes() {
  for (const [id, key] of Object.entries(FIELD_SIZES)) $(`#size-${id}`).textContent = `${sizes[key]} B`;
  $('#kem-flow').classList.toggle('hidden', !isKem());
  $('#sig-flow').classList.toggle('hidden', isKem());
  $('#flow-title').textContent = isKem() ? 'Key encapsulation' : 'Signature verification';
  $('#fact-one-label').textContent = isKem() ? (isNgcc() ? 'Key-pair consistency' : 'Key-pair consistency') : 'Signature state';
  $('#fact-two-label').textContent = isKem() ? 'Byte-for-byte shared secret comparison' : 'Signature verification result';
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
    status(isNgcc() ? 'Submission implementation loaded. Use keys matching this parameter instance.'
      : 'Use keys matching the selected algorithm, parameters and hash.');
  } catch (error) { runtime('Module load failed', 'error'); status(error.message, 'error'); }
  finally { setBusy(false); }
}
async function operation(type, payload, onSuccess) {
  if (!isRunnable() || !ready || busy || !sizes) return;
  try {
    const pending = request(type, payload);
    setBusy(true);
    status(`Running ${name()} ${({ generate: 'Key generation', encapsulate: 'Encapsulate', decapsulate: 'Decapsulate', sign: 'Signature', verify: 'Verify' })[type]}…`);
    onSuccess(await pending);
  } catch (error) { flowOutcome='fail'; status(error.message, 'error'); }
  finally { setBusy(false); }
}
function attempt(callback) { try { callback(); } catch (error) { status(error.message, 'error'); } }

function configureVariants(preferDefault = false) {
  const family = $('#family').value;
  const variants = VARIANTS[family];
  const previous = $('#variant').value;
  const selected = !preferDefault && variants.includes(previous) ? previous : DEFAULT_VARIANT[family];
  $('#variant').replaceChildren(...variants.map(variant => {
    const [level,pk,sk,out] = parameterLabels[family][variant];
    const option = new Option(`${NAMES[family]}-${variant.toUpperCase()} · Security level ${level} · Public key ${pk} B · Private key ${sk} B · ${family==='mlkem'?'Ciphertext':'Signature'} ${out} B${family==='mlkem'?' · Shared secret 32 B':''}`, variant);
    option.selected = variant === selected;
    return option;
  }));
}
async function loadCatalog() {
  if (!catalogPromise) catalogPromise = fetch('./ngcc-catalog.json', {signal:AbortSignal.timeout(10000)}).then(async response => {
    if (!response.ok) throw new Error(`Cannot load the candidate catalogue (HTTP ${response.status}）`);
    const data = await response.json();
    if (!Array.isArray(data.candidates) || data.candidates.length !== 119) throw new Error('Incomplete submission catalogue');
    return data.candidates;
  }).catch(error => { catalogPromise = null; throw error; });
  catalog = await catalogPromise;
  if (!reportIndex) {
    try {
      const response = await fetch('./ngcc-reports-zh.json', {signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const index = await response.json();
      if (index.findings?.length !== 166 || index.active_findings !== 164 || index.findings.some(item => !item.title || !item.summary || !item.source_url)) throw new Error('Incomplete report snapshot');
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
  $('#report-title').textContent = `${candidate.name} · Source-language security report summary`;
  $('#report-index-link').href = reports.length ? `https://ngcc.dev/reports/${candidate.id}.html` : 'https://ngcc.dev/reports/index.html';
  $('#report-index-link').textContent = 'Read the original ngcc.dev report';
  $('#report-intro').textContent = reportIndex?.unavailable
    ? 'The report index is unavailable. Check the source website. Functional tests are not security certification.'
    : `Source-language summaries of ngcc.dev reports, checked on ${reportIndex.reviewed_utc}; source updated ${reportIndex.source_updated_utc} UTC. Findings concern the source version identified in each report, not a retest of this site binary. Open the title for authors, evidence and reproduction steps.`;
  if (reportIndex?.unavailable) {
    list.replaceChildren(document.createElement('p'));
    list.firstChild.className = 'report-empty';
    list.firstChild.textContent = 'Visit the report source for all candidates.';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Retry reports';retry.onclick=async()=>{reportIndex=null;await loadCatalog();showReports(candidate);};list.append(retry);
    return;
  }
  if (!reports.length) {
    const empty = document.createElement('p');
    empty.className = 'report-empty';
    empty.textContent = 'This source lists no active finding for this candidate. This does not establish security. Use the report index for the source review.';
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
    note.textContent = `${REPORT_SEVERITY[finding.severity]} · ${REPORT_STATUS[finding.status]} · ${REPORT_SCOPE[finding.scope]} · Updated ${finding.updated}`;
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
  $('#report-title').textContent = 'Standards and implementation evaluation';
  $('#report-index-link').href = url;
  $('#report-index-link').textContent = `Read NIST ${label}`;
  $('#report-intro').textContent = 'The selected algorithm is NIST-standardized. This WASM is built from PQMagic source. This site binary has no independent security audit or FIPS implementation validation. Algorithm standardization does not certify an implementation.';
  const link = document.createElement('a');
  link.href = 'https://github.com/pqcrypto-cn/PQMagic'; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.textContent = 'Current implementation source';
  $('#report-list').replaceChildren(link);
}
function showCatalog() {
  const candidate = catalog?.find(item => item.id === $('#family').value);
  const parameter = candidate?.parameters[Number($('#variant').value)];
  if (!candidate || !parameter) return;
  sizes = null; resetFields();
  const special = candidate.type === 'kex' || candidate.type === 'hash';
  const runnable = special ? Boolean(candidateModule(candidate, Number($('#variant').value))) : isRunnable();
  $('#flow-title').textContent = candidate.type === 'hash' ? 'Hash experiments'
    : candidate.type === 'kex' ? 'Key exchange experiments' : candidate.type === 'sig' ? 'Signature experiments' : 'Key encapsulation';
  $('#catalog-name').textContent = candidate.name;
  $('#catalog-id').textContent = candidate.id;
  $('#catalog-type').textContent = CATEGORIES[candidate.type].split(' · ')[0];
  $('#catalog-notice').textContent = runnable
    ? 'This parameter instance runs in browser WASM compiled from the submission source. Functional tests are not security certification.'
    : 'This parameter instance has no available browser implementation. Inspect its parameters, submission team and source.';
  $('#catalog-facts').replaceChildren(...Object.entries(parameter.sizes).map(([key, value]) => {
    const box = document.createElement('div'), label = document.createElement('dt'), size = document.createElement('dd');
    label.textContent = FACTS[key];
    size.textContent = `${value.toLocaleString('zh-CN')} ${key === 'Passes' ? 'rounds' : key === 'DigestBits' ? 'bit' : 'B'}`;
    box.append(label, size); return box;
  }));
  $('#catalog-team').textContent = candidate.team.join(', ');
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
  runtime(runnable ? 'Submission implementation · Local execution' : 'Candidate information: implementation unavailable', runnable ? 'ready' : '');
  status(runnable ? `${candidate.name} / ${parameter.label}：Loading WASM…`
    : `${candidate.name} / ${parameter.label}: Parameters available; browser implementation unavailable.`);
  setBusy(false);
  if (runnable && !special) configureVariant();
  else if (runnable) status(`${candidate.name} / ${parameter.label}: Available for local execution below.`);
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
    catalogError='';
    $('#catalog-notice').textContent='Loading reference implementation information.';
    $('#family').replaceChildren(new Option('Loading submission catalogue…', ''));
    $('#variant').replaceChildren();
    runtime('Loading candidate information');
    status('Loading 2026 submission algorithms and parameters…');
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
    } catch (error) { catalogError=error.message; $('#catalog-notice').textContent=error.message; $('#report-intro').textContent='Candidate catalog failed to load. Retry loading.'; status(error.message, 'error'); runtime('Candidate catalogue failed to load', 'error'); renderSidebar(); }
  } else {
    $('#family').replaceChildren(...[
      ['Key encapsulation', ['mlkem']], ['Digital signatures', ['mldsa', 'slhdsa']],
    ].map(([label, names]) => {
      const group = document.createElement('optgroup'); group.label = label;
      group.append(...names.map(value => new Option(NAMES[value], value)));
      return group;
    }));
    $('#family').value = nistFamily;
    $('#family').dispatchEvent(new CustomEvent('change', {detail:{internal:true}}));
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
  usability.beforeClear();
  resetFields({ blankMessage: true });
  status('All inputs and results cleared. Use Undo clear to restore. Editing or running a new operation ends undo.', 'success');
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
    resetTransfers(); usability?.hidePrivate();
    write(`${prefix}-public`, generated.publicKey); write(`${prefix}-private`, generated.privateKey);
    generated.privateKey.fill(0); keyTime = generated.ms;
    if (prefix === 'kem') {
      $('#kem-alice-public').value = ''; $('#kem-bob-cipher').value = ''; resetKem();
    } else {
      $('#sig-verifier-public').value = ''; $('#verify-signature').value = ''; resetSig();
    }
    status(`${name()} key pair generated.`, 'success');
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
    status(button === 'kem-send-cipher' ? 'Bob’s ciphertext delivered to Alice.' : 'Public key delivered; private key stays local.', 'success');
  }));
}
$('#sig-send-result').addEventListener('click', () => attempt(() => {
  write('verify-signature', read('signature'));
  $('#verify-message').value = $('#sign-message').value;
  result(); animateTransfer('sig-route-bundle', ['verify-signature']); status('Message and signature delivered to Bob.', 'success');
}));

$('#kem-encapsulate').addEventListener('click', () => attempt(() => {
  const publicKey = read('kem-alice-public');
  operation('encapsulate', { publicKey }, output => {
    resetKem(); write('kem-cipher', output.ciphertext);
    aliceSecret = output.sharedSecret; actionTime = output.ms;
    $('#kem-alice-secret').textContent = hex(aliceSecret);
    status('Bob generated ciphertext and a local shared secret.', 'success');
  });
}));
$('#kem-decapsulate').addEventListener('click', () => attempt(() => {
  const privateKey = read('kem-private'), ciphertext = read('kem-bob-cipher');
  const publicKey = $('#kem-alice-public').value.trim() ? read('kem-alice-public') : null;
  operation('decapsulate', { privateKey, ciphertext, publicKey }, output => {
    $('#kem-bob-secret').textContent = hex(output.sharedSecret);
    $('#fact-one').textContent = isNgcc() ? 'Shared secrets compared' : output.pairMatches === null
      ? 'Alice public key not provided' : output.pairMatches ? 'Consistent' : 'Inconsistent';
    $('#fact-one').className = output.pairMatches === false ? 'bad' : output.pairMatches ? 'good' : '';
    if (aliceSecret) {
      const matches = equal(aliceSecret, output.sharedSecret);
      flowOutcome = matches ? 'pass' : 'fail';
      $('#manual-result').classList.remove('pass', 'fail');
      $('#manual-result').classList.add(matches ? 'pass' : 'fail');
      $('#manual-summary').textContent = matches ? 'Passed: both parties derived the same shared secret' : 'Failed: shared secrets differ';
      $('#fact-two').textContent = matches ? `${sizes.ss} / ${sizes.ss} bytes match` : 'Keys differ';
      $('#fact-two').className = matches ? 'good' : 'bad';
      status($('#manual-summary').textContent, matches ? 'success' : 'error');
    } else {
      flowOutcome = 'partial';
      $('#manual-summary').textContent = 'Alice derived a shared secret; waiting for Bob’s result.';
      $('#fact-two').textContent = 'Bob result missing';
      status($('#manual-summary').textContent);
    }
    finalTime = output.ms;
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Encapsulate ${elapsed(actionTime)} · Decapsulate ${elapsed(output.ms)}`;
    output.sharedSecret.fill(0);
  });
}));
$('#sign-button').addEventListener('click', () => attempt(() => {
  const privateKey = read('sig-private');
  const message = new TextEncoder().encode($('#sign-message').value);
  operation('sign', { privateKey, message }, output => {
    resetSig(); write('signature', output.signature); actionTime = output.ms;
    $('#fact-one').textContent = 'Generated'; $('#fact-one').className = 'good';
    $('#manual-summary').textContent = 'Signature generated; waiting for verification.';
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Signature ${elapsed(output.ms)}`;
    status('Signature generated. Send the public key, message and signature to the verifier.', 'success');
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
    $('#fact-one').textContent = $('#signature').value ? 'Local or imported signature' : 'Imported signature';
    $('#fact-two').textContent = output.valid ? 'Valid' : 'Invalid';
    $('#fact-two').className = output.valid ? 'good' : 'bad';
    finalTime = output.ms;
    $('#fact-time').textContent = `Generate ${elapsed(keyTime)} · Signature ${elapsed(actionTime)} · Verify ${elapsed(output.ms)}`;
    status($('#manual-summary').textContent, output.valid ? 'success' : 'error');
  });
}));

async function importFile(input, file) {
  if (!file || !sizes) return;
  const id = input.dataset.import, selected = `${$('#library').value}/${$('#family').value}/${$('#variant').value}/${$('#hash').value}`, currentReset = resetSerial;
  try {
    if (file.size > 256 * 1024) throw new Error('File exceeds 256 KiB. Import one raw key or signature.');
    const expected = expectedSize(id);
    let bytes;
    if (/\.bin$/i.test(file.name)) {
      bytes = new Uint8Array(await file.arrayBuffer());
      const valid = typeof expected === 'number' ? bytes.length === expected
        : bytes.length >= expected.min && bytes.length <= expected.max;
      if (!valid) throw new Error(`File length must be  ${typeof expected === 'number' ? expected : `${expected.min} to ${expected.max}`}  bytes; received  ${bytes.length} bytes`);
    } else if (/\.(hex|txt|b64)$/i.test(file.name)) bytes = decodeInput(await file.text(), expected, file.name);
    else throw new Error('Choose a .bin, .hex, .txt or .b64 file.');
    if (busy || currentReset !== resetSerial || selected !== `${$('#library').value}/${$('#family').value}/${$('#variant').value}/${$('#hash').value}`) return;
    write(id, bytes); $(`#${id}`).dispatchEvent(new Event('input'));
    if (id.includes('private')) bytes.fill(0);
    status(`${file.name} imported.`, 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { input.value = ''; }
}
document.querySelectorAll('[data-import]').forEach(input => input.addEventListener('change', () => importFile(input, input.files?.[0])));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const target = $(`#${button.dataset.copy}`);
  const value = (target.value ?? target.textContent).trim();
  if (!value || /^(Waiting|Not started)/.test(value)) return status('No result available to copy.', 'error');
  try {
    await copyText(value);
    button.textContent='✓'; setTimeout(()=>{button.textContent='⧉';},1500);
    status(button.dataset.copy.includes('private') ? 'Private key copied. Do not share it; clear your clipboard after use.' : 'Copied to clipboard.', 'success');
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
      animateTransfer('kem-route-pk', ['kem-alice-public']);
      const encapsulated = await request('encapsulate', { publicKey: keys.publicKey });
      write('kem-cipher', encapsulated.ciphertext); write('kem-bob-cipher', encapsulated.ciphertext);
      animateTransfer('kem-route-ct', ['kem-bob-cipher']);
      const decapsulated = await request('decapsulate', { privateKey: keys.privateKey, ciphertext: encapsulated.ciphertext, publicKey: keys.publicKey });
      aliceSecret = encapsulated.sharedSecret; actionTime=encapsulated.ms; finalTime=decapsulated.ms;
      $('#kem-alice-secret').textContent = hex(aliceSecret); $('#kem-bob-secret').textContent = hex(decapsulated.sharedSecret);
      const valid = equal(aliceSecret, decapsulated.sharedSecret);
      flowOutcome = valid ? 'pass' : 'fail';
      $('#fact-one').textContent = 'Generated example key pair'; $('#fact-two').textContent = valid ? `${sizes.ss} / ${sizes.ss} bytes match` : 'Keys differ';
      $('#fact-time').textContent = `Generate ${elapsed(keys.ms)} · Encapsulate ${elapsed(encapsulated.ms)} · Decapsulate ${elapsed(decapsulated.ms)}`;
      $('#manual-summary').textContent = valid ? 'Passed: both parties derived the same shared secret' : 'Failed: shared secrets differ';
      decapsulated.sharedSecret.fill(0);
    } else {
      $('#sign-message').value = 'Yibiao cryptography lab example';
      const message = new TextEncoder().encode($('#sign-message').value);
      const signed = await request('sign', { privateKey: keys.privateKey, message });
      write('signature', signed.signature); write('verify-signature', signed.signature); write('sig-verifier-public', keys.publicKey); $('#verify-message').value = $('#sign-message').value;
      animateTransfer('sig-route-pk', ['sig-verifier-public']);
      animateTransfer('sig-route-bundle', ['verify-signature']);
      const checked = await request('verify', { publicKey: keys.publicKey, signature: signed.signature, message });
      actionTime=signed.ms; finalTime=checked.ms;
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
usability = setupUsability({state:uiState, renderSidebar, decode:decodeInput, expectedSize, importFile,
  snapshot:()=>({fields:Object.fromEntries([...document.querySelectorAll('[data-field],.message-input')].map(input=>[input.id,input.value])), aliceSecret:aliceSecret?.slice(), keyTime, actionTime, finalTime, outcome:flowOutcome, transfers:transferSnapshot(), texts:Object.fromEntries(['kem-alice-secret','kem-bob-secret','manual-summary','fact-one','fact-two','fact-time'].map(id=>[id,$('#'+id).textContent]))}),
  restore:snapshot=>{resetSerial++;for(const [id,value] of Object.entries(snapshot.fields))$('#'+id).value=value;aliceSecret=snapshot.aliceSecret?.slice()||null;keyTime=snapshot.keyTime;actionTime=snapshot.actionTime;finalTime=snapshot.finalTime;flowOutcome=snapshot.outcome;restoreTransfers(snapshot.transfers);for(const [id,value] of Object.entries(snapshot.texts))$('#'+id).textContent=value;status('✓ Clear undone; inputs and results restored.','success');}
});
$('#retry-runtime').addEventListener('click',()=>{if(busy)return;if(isNgcc()&&!catalog)void switchLibrary();else startWorker();});
$('#tamper-one-bit').addEventListener('click',()=>attempt(()=>{
  if(busy)return;
  if(isKem()){
    const bytes=read('kem-bob-cipher');bytes[0]^=1;write('kem-bob-cipher',bytes);$('#kem-bob-cipher').dispatchEvent(new Event('input'));
    $('#tamper-note').textContent='The first received ciphertext bit was flipped. Decapsulating again. ML-KEM implicitly rejects invalid ciphertext by deriving a different shared secret.';
    $('#kem-decapsulate').click();
  } else {
    const message=new TextEncoder().encode($('#verify-message').value);
    if(!message.length)throw new Error('An empty message has no bit to flip. Sign a nonempty message first.');
    message[message.length-1]^=1;
    $('#verify-message').value=new TextDecoder().decode(message);
    $('#verify-message').dispatchEvent(new Event('input'));
    // Flipping the lowest bit of the final UTF-8 byte preserves encoding.
    $('#tamper-note').textContent='Flipped the lowest bit of the last message byte. Verifying the exact modified bytes.';
    operation('verify',{publicKey:read('sig-verifier-public'),signature:read('verify-signature'),message},output=>{
      finalTime=output.ms;flowOutcome=output.valid?'pass':'fail';
      $('#manual-result').classList.remove('pass','fail');$('#manual-result').classList.add(flowOutcome);
      $('#fact-two').textContent=output.valid?'✓ Complete':'✕ Failed';status(output.valid?'Signature is still valid':'✕ Verification failed after changing one message bit',output.valid?'success':'error');
    });
  }
}));
void selectLabTab(labTab);
const missing = missingBrowserFeatures();
if (missing.length) {
  runtime('Required browser features unavailable', 'error');
  status(`The browser lacks ${missing.join(', ')}. Use a browser supporting these features.`, 'error');
} else startWorker();
renderSidebar();
showNistReports();
