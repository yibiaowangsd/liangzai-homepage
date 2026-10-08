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
  kem: ['Prepare keys', 'Publish public key', 'Encapsulate', 'Return ciphertext', 'Decapsulate'],
  sig: ['Prepare keys', 'Publish public key', 'Signature', 'Send signature', 'Verify'],
};
let visibleKind = '';

export function resetTransfers() {
  receipts.clear();
  for (const [id, timer] of timers) { clearTimeout(timer); $('#' + id)?.classList.remove('sending'); }
  timers.clear();
}

export function transferSnapshot() { return [...receipts.entries()]; }
export function restoreTransfers(entries) { resetTransfers(); for(const [key,value] of entries)receipts.set(key,value); }

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
  route.querySelector('.route-state').textContent = received ? '✓ Complete' : modified ? '✕ Failed' : bytes ? '◌ In progress' : '○ Not started';
  const message = bundle ? messageValue('sign-message') : '';
  const messageBytes = new TextEncoder().encode(message).length;
  route.querySelector('.packet-size').textContent = bytes ? (bytes.length + (bundle ? messageBytes : 0)) + ' B' : '';
  route.querySelector('.packet-preview').classList.toggle('hidden', !bytes);
  route.querySelector('.packet-details').classList.toggle('hidden', !bytes);
  const normalized = bytes ? hex(bytes) : '';
  route.querySelector('.packet-preview').textContent = bytes
    ? bundle ? 'm: ' + (message ? short(message) : '〈EmptyMessage〉') + '\nσ: ' + short(normalized) : short(normalized)
    : bundle ? 'Waiting for message and signature' : 'Waiting for material';
  route.querySelector('.packet-data').textContent = bytes
    ? bundle ? 'Message · UTF-8 · ' + messageBytes + ' B\n' + message + '\n\nSignature · HEX · ' + bytes.length + ' B\n' + normalized
      : 'HEX · ' + bytes.length + ' B\n\n' + normalized
    : 'No material yet';
  const send=route.querySelector('.send-button');
  send.disabled = state.busy || !state.ready || !bytes;
  send.title = !bytes ? 'Generate or import valid '+route.querySelector('.packet-head strong').textContent : state.busy ? 'Computing, please wait' : 'Send public material';
}

export function renderDialogue(state) {
  const materials = {};
  for (const [id, sizeKey] of Object.entries(fields)) {
    const input = $('#' + id), expected = state.sizes?.[sizeKey];
    if (!input) continue;
    const raw = input.value.trim();
    const variable = state.ngccSig && sizeKey === 'out' && (id === 'signature' || id === 'verify-signature');
    if (raw && expected) {
      try { materials[id] = state.decode(raw, variable ? { min: 1, max: expected } : expected, 'Input'); }
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
  for (const [id, available] of Object.entries(prerequisites)) { const button=$('#'+id);button.disabled=state.busy||!state.ready||!available;button.title=!available ? ({'kem-encapsulate':'Receive a valid public key first','kem-decapsulate':'Prepare a private key and receive ciphertext first','sign-button':'Prepare a private key first','verify-button':'Receive a public key and signature first'})[id] : state.busy?'Computing, please wait':''; }
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
    ['Prepare Alice’s keys', 'Generate temporary test keys or import Alice’s matching public and private keys.'],
    ['Send the public key to Bob', 'Choose Send public key in the channel. Only the public key is transferred.'],
    ['Bob can encapsulate', 'Use the received public key to generate ciphertext and Bob’s local shared secret.'],
    ['Return ciphertext to Alice', 'Choose Send ciphertext in the second channel. Bob’s shared secret stays local.'],
    [has('kem-private') ? 'Alice can decapsulate' : 'Import Alice’s private key', has('kem-private') ? 'Decapsulate the received ciphertext with the local private key, then compare all bytes.' : 'Ciphertext is ready. Import the matching private key to decapsulate.'],
    ['Both parties derived the same shared secret', `Both copies contain ${state.sizes?.ss ?? 32} identical bytes. Only the public key and ciphertext crossed the channel.`],
  ] : [
    ['Prepare Alice’s keys', 'Generate temporary test keys or import Alice’s matching keys.'],
    ['Send the public key to Bob', 'Choose Send public key so Bob can verify the signature.'],
    ['Alice can sign a message', 'Enter a message and sign it with Alice’s local private key.'],
    ['Send the message and signature', 'Choose Send message and signature to populate Bob’s incoming material.'],
    ['Bob can verify', 'Verify the received public key, message and signature. Edit the message to inspect a failure.'],
    ['Bob verified the signature', 'The signature matches the received key and message. Edit the message and verify again.'],
  ];
  let [title, detail] = guidance[stage];
  if (failed) {
    title = state.kem ? 'Shared secrets differ' : 'Signature verification failed';
    detail = state.kem ? 'Check the key and ciphertext, and match both parties’ algorithm, parameters and hash.' : 'Check the public key, message and signature. Editing the message also causes verification to fail.';
  } else if (state.outcome === 'partial') {
    title = 'Alice completed decapsulation';
    detail = 'The local shared secret is ready. Bob has not encapsulated yet, so comparison is pending.';
  }
  $('#guide-number').textContent = passed ? '✓' : String(Math.min(stage + 1, 5)).padStart(2, '0');
  $('#guide-title').textContent = title;
  $('#guide-detail').textContent = detail;
  const activeActor = state.kem ? stage === 2 || stage === 3 ? 'kem-alice' : 'kem-bob' : stage < 4 ? 'sig-alice' : 'sig-bob';
  for (const id of ['kem-bob', 'kem-alice', 'sig-alice', 'sig-bob']) {
    const current = id === activeActor || (state.kem && passed && id.startsWith('kem-'));
    $('#' + id).classList.toggle('is-active', current);
    $('#' + id + '-status').textContent = failed ? '✕ Failed' : passed ? '✓ Complete' : current && (state.busy || stage>0) ? '◌ In progress' : '○ Not started';
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
    $('#state-' + id).textContent = !present ? `○ Not started · ${sharedSize} B` : passed && state.kem
      ? `✓ Complete · ${sharedSize} / ${sharedSize} bytes match` : failed && state.kem ? '✕ Failed · Shared secrets differ' : '◌ In progress · Comparison pending';
  }
  const verdict = $('#signature-verdict');
  verdict.classList.toggle('pass', !state.kem && passed);
  verdict.classList.toggle('fail', !state.kem && failed);
  $('#signature-verdict-title').textContent = !state.kem && passed ? 'SignatureValid' : !state.kem && failed ? 'SignatureInvalid' : 'Waiting to verify';
  $('#signature-verdict-detail').textContent = !state.kem && passed ? 'Public key, message and signature match.' : !state.kem && failed ? 'Message, signature or public key does not match.' : 'Verification is available once the public key, message and signature are ready.';
  for (const [id, sizeKey] of Object.entries(fields)) {
    if (sizeKey === 'sk') materials[id]?.fill(0);
  }
}
