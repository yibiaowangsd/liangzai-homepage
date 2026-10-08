const $ = selector => document.querySelector(selector);
const fields = {
  'kem-public': 'pk', 'kem-private': 'sk', 'kem-alice-public': 'pk', 'kem-cipher': 'out', 'kem-bob-cipher': 'out',
  'sig-public': 'pk', 'sig-private': 'sk', 'signature': 'out', 'sig-verifier-public': 'pk', 'verify-signature': 'out',
};
const routes = {
  'kem-route-pk': ['kem-public', 'kem-alice-public'],
  'kem-route-ct': ['kem-cipher', 'kem-bob-cipher'],
  'sig-route-pk': ['sig-public', 'sig-verifier-public'],
  'sig-route-bundle': ['signature', 'verify-signature'],
};
const receipts = new Map();
const timers = new Map();
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const value = id => $('#' + id).value.trim();
const messageValue = id => $('#' + id).value;
const short = text => text.length > 42 ? text.slice(0, 22) + ' … ' + text.slice(-12) : text;
const steps = {
  kem: ['准备密钥', '发布Public key', 'Encapsulate', '返回Ciphertext', 'Decapsulate'],
  sig: ['准备密钥', '发布Public key', 'Signature', '发送Signature', 'Verify'],
};
let visibleKind = '';

export function resetTransfers() {
  receipts.clear();
  for (const [id, timer] of timers) { clearTimeout(timer); $('#' + id)?.classList.remove('sending'); }
  timers.clear();
}

export function animateTransfer(id, targets) {
  const [source, destination] = routes[id];
  receipts.set(id, {
    source: value(source), destination: value(destination),
    message: id === 'sig-route-bundle' ? messageValue('sign-message') : null,
  });
  const route = $('#' + id);
  clearTimeout(timers.get(id));
  route.classList.remove('sending');
  void route.offsetWidth;
  route.classList.add('sending');
  targets.forEach(target => $('#material-' + target)?.classList.add('incoming'));
  timers.set(id, setTimeout(() => {
    route.classList.remove('sending');
    targets.forEach(target => $('#material-' + target)?.classList.remove('incoming'));
    timers.delete(id);
  }, 1100));
}

function measure(raw) {
  const compact = raw.trim().replace(/\b0x/gi, '').replace(/[\s:,]/g, '');
  if (/^[a-f\d]+$/i.test(compact) && compact.length % 2 === 0) return compact.length / 2;
  try {
    const b64 = raw.replace(/\s/g, '');
    return atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')).length;
  } catch { return null; }
}

function drawRoute(id, materials, state) {
  const route = $('#' + id), [source, destination] = routes[id];
  const bytes = materials[source], receipt = receipts.get(id);
  const bundle = id === 'sig-route-bundle';
  const received = !!bytes && receipt?.source === value(source) && receipt?.destination === value(destination)
    && (!bundle || (receipt.message === messageValue('sign-message') && receipt.message === messageValue('verify-message')));
  const modified = !!bytes && receipt?.source === value(source) && !received;
  route.dataset.state = received ? 'delivered' : modified ? 'modified' : bytes ? 'ready' : 'empty';
  route.querySelector('.route-state').textContent = received ? '已送达' : modified ? '接收端已改' : bytes ? '待发送' : 'Waiting for generation';
  const message = bundle ? messageValue('sign-message') : '';
  const messageBytes = new TextEncoder().encode(message).length;
  route.querySelector('.packet-size').textContent = bytes ? (bytes.length + (bundle ? messageBytes : 0)) + ' B' : '';
  route.querySelector('.packet-preview').classList.toggle('hidden', !bytes);
  route.querySelector('.packet-details').classList.toggle('hidden', !bytes);
  const normalized = bytes ? hex(bytes) : '';
  route.querySelector('.packet-preview').textContent = bytes
    ? bundle ? 'm: ' + (message ? short(message) : '〈EmptyMessage〉') + '\nσ: ' + short(normalized) : short(normalized)
    : bundle ? '等待Message与Signature' : 'Waiting for material';
  route.querySelector('.packet-data').textContent = bytes
    ? bundle ? 'Message · UTF-8 · ' + messageBytes + ' B\n' + message + '\n\nSignature · HEX · ' + bytes.length + ' B\n' + normalized
      : 'HEX · ' + bytes.length + ' B\n\n' + normalized
    : 'No material yet';
  route.querySelector('.send-button').disabled = state.busy || !state.ready || !bytes;
}

export function renderDialogue(state) {
  const materials = {};
  for (const [id, sizeKey] of Object.entries(fields)) {
    const input = $('#' + id), expected = state.sizes?.[sizeKey];
    if (!input) continue;
    const raw = input.value.trim();
    const variable = state.ngccSig && sizeKey === 'out' && (id === 'signature' || id === 'verify-signature');
    if (raw && expected) {
      try { materials[id] = state.decode(raw, variable ? { min: 1, max: expected } : expected, '输入'); }
      catch { /* Guidance does not block editing. */ }
    }
    const bytes = materials[id], count = bytes?.length ?? (raw ? measure(raw) : null);
    $('#size-' + id).textContent = expected ? (raw ? (count ?? '?') + ' / ' : '') + (variable ? '≤ ' : '') + expected + ' B' : '— B';
    $('#material-' + id).classList.toggle('has-data', !!bytes);
    $('#material-' + id).classList.toggle('invalid', input.getAttribute('aria-invalid') === 'true');
  }
  Object.keys(routes).forEach(id => drawRoute(id, materials, state));
  const has = id => !!materials[id];
  const prerequisites = {
    'kem-encapsulate': has('kem-alice-public'), 'kem-decapsulate': has('kem-private') && has('kem-bob-cipher'),
    'sign-button': has('sig-private'), 'verify-button': has('sig-verifier-public') && has('verify-signature'),
  };
  for (const [id, available] of Object.entries(prerequisites)) $('#' + id).disabled = state.busy || !state.ready || !available;
  const passed = state.outcome === 'pass', failed = state.outcome === 'fail';
  let stage;
  if (state.kem) {
    stage = passed ? 5 : has('kem-bob-cipher') ? 4 : has('kem-cipher') ? 3 : has('kem-alice-public') ? 2 : has('kem-public') ? 1 : 0;
  } else {
    stage = passed ? 5 : has('verify-signature') || (has('sig-verifier-public') && !has('sig-private')) ? 4
      : has('signature') ? 3 : has('sig-public') && !has('sig-verifier-public') ? 1 : has('sig-private') ? 2 : 0;
  }
  const kind = state.kem ? 'kem' : 'sig';
  if (visibleKind !== kind) {
    $('#step-list').replaceChildren(...steps[kind].map((label, index) => {
      const li = document.createElement('li'), dot = document.createElement('span'), text = document.createElement('span');
      dot.className = 'step-dot'; dot.textContent = String(index + 1).padStart(2, '0');
      text.textContent = label; li.append(dot, text); return li;
    }));
    visibleKind = kind;
  }
  Array.from($('#step-list').children).forEach((li, index) => {
    li.classList.toggle('current', index === stage);
    li.classList.toggle('complete', index < stage);
    if (index === stage) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.querySelector('.step-dot').textContent = index < stage ? '✓' : String(index + 1).padStart(2, '0');
  });
  const guidance = state.kem ? [
    ['Prepare keys for Bob', 'Generate测试密钥对，或在 Bob 端粘贴 / Import已有的Public key和Private key。'],
    ['把Public key发给 Alice', '点击Transfer区的“Send public key”。只有Public key会到达另一端。'],
    ['Alice 可以开始Encapsulate', '确认Received public key，GenerateCiphertext和 Alice 的本地Shared secret。'],
    ['把Ciphertext送回 Bob', '点击第二条通道的“Send ciphertext”。Shared secret保留在 Alice 端。'],
    [has('kem-private') ? 'rounds到 Bob Decapsulate' : '补入 Bob 的本地Private key', has('kem-private') ? '使用本地Private key处理Received ciphertext，再逐bytes比较双方结果。' : 'Ciphertext已经就绪；粘贴或Import配套Private key后，即可Decapsulate。'],
    ['双方已建立相同的Shared secret', `两端的 ${state.sizes?.ss ?? 32} bytes完全一致。Transfer区只传送了Public key和Ciphertext。`],
  ] : [
    ['准备 Alice 的密钥', 'Generate测试密钥对，或在 Alice 端粘贴 / Import已有的密钥。'],
    ['让 Bob 收到Public key', '点击Transfer区的“Send public key”，为另一端Verify做好准备。'],
    ['Alice 可以签署Message', '填写Message to sign，再使用 Alice 的本地Private keySign message。'],
    ['把原文和Signature一起发送', '点击“Send message and signature”，把对应的数据放入 Bob 的Incoming material。'],
    ['rounds到 Bob 验证', '核对Received public key、Message和Signature；也可以修改原文，观察结果变化。'],
    ['Bob 已验证这份Signature', 'Signature与Received public key、Message匹配。修改Message后可重新验证。'],
  ];
  let [title, detail] = guidance[stage];
  if (failed) {
    title = state.kem ? '双方的Shared secret不一致' : '这份Signature未通过验证';
    detail = state.kem ? '检查Private key与Ciphertext是否配套，并确认双方使用相同的Algorithm、参数和哈希。' : '检查Public key、Message与Signature的对应关系；修改原文也会使Verify失败。';
  } else if (state.outcome === 'partial') {
    title = 'Bob 已完成Decapsulate';
    detail = '本地Shared secret已Generate；当前没有 Alice 的Encapsulate结果，暂时无法比较。';
  }
  $('#guide-number').textContent = passed ? '✓' : String(Math.min(stage + 1, 5)).padStart(2, '0');
  $('#guide-title').textContent = title;
  $('#guide-detail').textContent = detail;
  const activeActor = state.kem ? stage === 2 || stage === 3 ? 'kem-alice' : 'kem-bob' : stage < 4 ? 'sig-alice' : 'sig-bob';
  for (const id of ['kem-bob', 'kem-alice', 'sig-alice', 'sig-bob']) {
    const current = id === activeActor || (state.kem && passed && id.startsWith('kem-'));
    $('#' + id).classList.toggle('is-active', current);
    $('#' + id + '-status').textContent = current ? state.busy ? '正在计算' : passed ? '已完成' : '当前步骤' : '等待对方';
  }
  document.querySelectorAll('.is-next').forEach(button => button.classList.remove('is-next'));
  if (!passed) {
    const next = state.kem ? ['kem-generate', 'kem-send-public', 'kem-encapsulate', 'kem-send-cipher', 'kem-decapsulate']
      : ['sig-generate', 'sig-send-public', 'sign-button', 'sig-send-result', 'verify-button'];
    $('#' + next[stage]).classList.add('is-next');
  }
  for (const id of ['kem-bob-secret', 'kem-alice-secret']) {
    const sharedSize = state.sizes?.ss ?? 32;
    const present = new RegExp(`^[a-f0-9]{${sharedSize * 2}}$`, 'i').test($('#' + id).textContent.trim());
    $('#box-' + id).classList.toggle('has-secret', present);
    $('#box-' + id).classList.toggle('matched', present && passed && state.kem);
    $('#box-' + id).classList.toggle('mismatched', present && failed && state.kem);
    $('#state-' + id).textContent = !present ? `Not established · ${sharedSize} B` : passed && state.kem
      ? `已对齐 · ${sharedSize} / ${sharedSize} bytes match` : failed && state.kem ? '对照失败 · Shared secret不同' : '已建立 · 等待对照';
  }
  const verdict = $('#signature-verdict');
  verdict.classList.toggle('pass', !state.kem && passed);
  verdict.classList.toggle('fail', !state.kem && failed);
  $('#signature-verdict-title').textContent = !state.kem && passed ? 'SignatureValid' : !state.kem && failed ? 'SignatureInvalid' : 'Waiting to verify';
  $('#signature-verdict-detail').textContent = !state.kem && passed ? 'Public key、Message与Signature匹配。' : !state.kem && failed ? '原文、Signature或Public key不匹配。' : 'Verification is available once the public key, message and signature are ready.';
  for (const [id, sizeKey] of Object.entries(fields)) {
    if (sizeKey === 'sk') materials[id]?.fill(0);
  }
}
