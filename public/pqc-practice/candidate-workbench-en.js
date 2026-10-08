import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';
const $=id=>document.getElementById(id);
const SIDES=['alice','bob'],NAMES=['Alice','Bob'];
let active=null,timer=null,arrival=null,currentCandidate=()=>null,kexStep=0,kexPasses=0,busy=false,traffic=0;
let phase='init',pass=1,publicMaterials=[];
export function setCandidateProvider(provider){currentCandidate=provider;}
export function stopCandidateWork(){active?.terminate();active=null;clearTimeout(timer);clearTimeout(arrival);timer=arrival=null;busy=false;$('candidate-run').disabled=false;$('candidate-message').disabled=false;$('kex-route').classList.remove('sending');}
export function candidateModule(candidate,index){return candidate?.type==='kex'?NGCC_KEX_WASM[candidate.id]?.[index]:candidate?.type==='hash'?NGCC_HASH_WASM[candidate.id]?.[index]:null;}
function materialCard(value){
  const card=document.createElement('details');card.className='kex-material';card.dataset.slot=value.slot;
  const summary=document.createElement('summary');summary.textContent=`${value.label} · ${value.bytes.toLocaleString('zh-CN')} B`;
  const preview=document.createElement('pre');preview.textContent=value.bytes?`${value.preview}${value.bytes>128?'\n… (first 128 bytes)':''}`:'This parameter uses no such material (0 bytes; no byte transfer).';
  const hash=document.createElement('small');hash.textContent=`Complete material SHA-256: ${value.fingerprint}`;
  card.append(summary,preview,hash);return card;
}
function guide(title,detail){$('kex-step-title').textContent=title;$('kex-step-detail').textContent=detail;}
function owner(){return phase==='public-a'||phase==='derive-a'?0:phase==='public-b'||phase==='derive-b'?1:(pass-1)%2;}
function progress(){
  const stages=['Local setup','Share public keys',...Array.from({length:kexPasses},(_,i)=>`Round ${i+1} exchange`),'Derive independently','Keys match'];
  const current=phase==='init'?0:phase.startsWith('public')?1:['compute','send'].includes(phase)?pass+1:phase.startsWith('derive')?kexPasses+2:phase==='done'?kexPasses+3:-1;
  $('kex-progress').replaceChildren(...stages.map((text,i)=>{const li=document.createElement('li');li.textContent=`${i<current?'✓ ':''}${text}`;li.className=i===current?'current':i<current?'complete':'';if(i===current)li.setAttribute('aria-current','step');return li;}));
}
function controls(){
  const side=owner(),sending=phase==='send'||phase.startsWith('public');
  $('kex-next').hidden=phase!=='init';$('kex-next').disabled=busy;
  $('kex-next').textContent=busy?'Preparing both parties’ material…':'Start: generate local material for both parties';
  $('kex-send').disabled=busy||!sending;$('kex-send').classList.toggle('is-next',!busy&&sending);
  $('kex-send').firstElementChild.textContent=busy&&sending?'Sending…':`Send to ${NAMES[1-side]}`;
  for(const [i,key] of SIDES.entries()){
    const enabled=!busy&&i===side&&(phase==='compute'||phase.startsWith('derive'));
    $(`kex-${key}-action`).disabled=!enabled;$(`kex-${key}-action`).classList.toggle('is-next',enabled);
    $(`kex-${key}-action`).textContent=phase.startsWith('derive')?`${NAMES[i]} derives a shared secret`:`${NAMES[i]} Local computation${phase==='compute'||phase==='send'?` msg${pass}`:''}`;
    $(`kex-${key}`).classList.toggle('is-speaking',i===side&&phase!=='init'&&phase!=='done');
  }
  $('kex-step-number').textContent=phase==='done'?'All steps complete':`Step ${Math.min(kexStep+1,kexPasses*2+5)} / ${kexPasses*2+5}`;progress();
}
function route(side,message){
  const r=$('kex-route');r.classList.toggle('to-left',side===1);r.dataset.state=message?'ready':'empty';
  $('kex-direction').textContent=`${NAMES[side]} → ${NAMES[1-side]}`;$('kex-route-state').textContent=message?'◌ In progress':'○ Not started';
  $('kex-packet-title').textContent=message?`${message.label} · Ready to send`:'Outgoing material';
  if(message){const card=materialCard(message);card.open=true;$('kex-outbox').replaceChildren(card);}
  else $('kex-outbox').textContent=`${NAMES[side]} has not generated msg${pass}. Choose local computation for that party first.`;
  $('kex-route-note').textContent=message?(message.bytes?'Choose Send to deliver it to the other party.':'This item is 0 B: confirm the public input without sending bytes.'):'Computation is local. No message is ready to send.';
}
function prepareKex(candidate,index){
  kexStep=0;kexPasses=candidate.parameters[index].sizes.Passes;traffic=0;phase='init';pass=1;publicMaterials=[];
  $('kex-exchange').dataset.state='idle';$('kex-messages').replaceChildren();$('kex-messages').parentElement.open=false;
  for(const side of SIDES){
    $(`kex-${side}-material`).textContent='Public key may be shared; private key and state stay local';$(`kex-${side}-inventory`).replaceChildren();
    $(`kex-${side}-inbox`).textContent='No message received';$(`kex-${side}-state`).textContent='○ Not started';
    $(`kex-${side}-recipe`).textContent='Each party generates its own keys and local state.';$(`kex-${side}-fingerprint`).textContent='Shared secret not derived';
    $(`kex-${side}`).classList.remove('is-speaking','is-receiving');$(`kex-${side}-inbox`).classList.remove('incoming');
  }
  $('kex-passes').textContent=`${kexPasses} protocol rounds`;$('kex-traffic').textContent='Transferred 0 B';route(0,null);
  $('kex-outbox').textContent='Prepare both parties’ material, then send each public key.';
  guide('Prepare, then share public keys','Alice and Bob keep separate secrets. The middle channel carries public material. Generate both parties’ material, then send each public key step by step.');controls();
}
function packet(side,message,title){
  const item=document.createElement('li');item.className='is-viewed is-current';
  for(const child of $('kex-messages').children)child.classList.remove('is-current');
  const label=document.createElement('strong');label.textContent=title;item.append(label,materialCard(message));$('kex-messages').append(item);
  const inbox=$(`kex-${SIDES[1-side]}-inbox`);if(!inbox.querySelector('details'))inbox.replaceChildren();
  inbox.append(materialCard(message));inbox.classList.remove('incoming');void inbox.offsetWidth;inbox.classList.add('incoming');
  traffic+=message.bytes;$('kex-traffic').textContent=`Transferred ${traffic.toLocaleString('zh-CN')} B (including public keys)`;
  $(`kex-${SIDES[1-side]}-state`).textContent='◌ In progress';
  $(`kex-${SIDES[side]}-state`).textContent='◌ In progress';
}
function computeGuide(){
  const side=(pass-1)%2,from=NAMES[side],to=NAMES[1-side];
  const recipe=`Input: own private key and local state + ${to} Public key${pass>1?` + received msg${pass-1}`:''}. Output: msg${pass} and updated local state.`;
  $(`kex-${SIDES[side]}-recipe`).textContent=recipe;$(`kex-${SIDES[1-side]}-recipe`).textContent=`Waiting for ${from} to compute and send msg${pass}; this message has not arrived.`;
  guide(`Next: ${from} Local computation msg${pass}`,`${recipe} Choose ${from}’s computation button. This does not send a message.`);
}
function fail(message){stopCandidateWork();phase='error';controls();$('kex-exchange').dataset.state='error';guide('Exchange stopped',`${message}. Choose Restart to create a new session.`);$('candidate-status').textContent='✕ Failed · '+message;$('kex-reset').textContent='RetryKey exchange';}
function complete(data){
  busy=false;kexStep++;$('candidate-status').textContent=`${phase==='done'?'✓ Complete':'◌ In progress'} · ${data.ms.toFixed(2)} ms`;controls();
}
function receive(data){
  clearTimeout(timer);if(data.error){fail(data.error);return;}
  if(data.action==='init'){
    for(const [i,side] of SIDES.entries()){
      $(`kex-${side}-inventory`).replaceChildren(...data.materials.slice(i*3,i*3+3).map(materialCard));
      $(`kex-${side}-state`).textContent='◌ In progress';$(`kex-${side}-recipe`).textContent='Share public keys only. Private keys and state stay local.';
    }
    publicMaterials=[data.materials[0],data.materials[3]];phase='public-a';route(0,publicMaterials[0]);
    guide('Send Alice’s public key to Bob first','Alice’s public key is in the outbox. Choose Send to Bob to deliver it, then return Bob’s public key.');complete(data);
  }else if(data.action==='public'||data.action==='send'){
    const side=data.action==='public'?data.side:(data.pass-1)%2;
    $('kex-route').classList.add('sending');$('kex-route-state').textContent='◌ In progress';
    guide(`${NAMES[side]} → ${NAMES[1-side]}: sending ${data.message.label}`,'Wait for delivery before the next step. The message appears in the receiver’s inbox.');
    const deliver=()=>{
      arrival=null;$('kex-route').classList.remove('sending');$('kex-route').dataset.state='delivered';$('kex-route-state').textContent='✓ Complete';
      $('kex-packet-title').textContent=`${data.message.label} · Delivered`;
      packet(side,data.message,`${NAMES[side]} → ${NAMES[1-side]} · ${data.message.label}`);
      if(data.action==='public'&&side===0){phase='public-b';route(1,publicMaterials[1]);guide('Bob received Alice’s public key; return Bob’s key','Alice still needs Bob’s public key. Choose Send to Alice to complete the public inputs.');}
      else if(data.action==='public'){phase='compute';computeGuide();$('kex-route-note').textContent='Both public keys are shared. Compute the first message in Alice’s panel.';}
      else if(pass<kexPasses){pass++;phase='compute';computeGuide();$('kex-route-note').textContent=`Message delivered to ${NAMES[1-side]}. The other party can now compute locally.`;}
      else{
        phase='derive-a';guide('Exchange complete; Alice derives her secret','Alice derives the shared secret from her own secrets, state and received messages. The result stays local.');
        for(const [i,key] of SIDES.entries())$(`kex-${key}-recipe`).textContent=`Input: ${NAMES[i]}’s private key, state and received messages. Output: a locally stored shared secret.`;
      }
      complete(data);
    };
    arrival=setTimeout(deliver,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:850);
  }else if(data.action==='pass'){
    const side=(data.pass-1)%2,inventory=$(`kex-${SIDES[side]}-inventory`);
    inventory.querySelector(`[data-slot="${data.state.slot}"]`)?.remove();inventory.append(materialCard(data.state));
    phase='send';route(side,data.message);$(`kex-${SIDES[side]}-state`).textContent='◌ In progress';
    $(`kex-${SIDES[1-side]}-state`).textContent='◌ In progress';
    guide(`${NAMES[side]} computed msg${pass}, but ${NAMES[1-side]} has not received it`,'The real output is in the outbox. Inspect its bytes, then choose Send to deliver it. Traffic increases on delivery.');complete(data);
  }else if(data.action==='derive'){
    const side=SIDES[data.side];$(`kex-${side}-inventory`).append(materialCard(data.secret));$(`kex-${side}-fingerprint`).textContent=`Shared secret SHA-256：${data.secret.fingerprint}`;$(`kex-${side}-state`).textContent='✓ Complete';
    if(data.side===0){phase='derive-b';guide('Alice derived her secret; Bob computes independently','Shared secrets are not transmitted. Derive Bob’s secret from his own state and received material, then compare both outputs.');}
    else{
      phase=data.match?'done':'error';$('kex-exchange').dataset.state=data.match?'done':'error';
      guide(data.match?'All key bytes match; exchange complete':'Keys differ','Alice and Bob independently derived their keys. The complete outputs were compared byte by byte. Only public keys and messages crossed the channel.');
      $('candidate-output').textContent=data.match?`Both parties independently derived the same ${data.secret.bytes} B key; public traffic: ${traffic} B。`:'The protocol did not establish matching shared secrets';
    }
    complete(data);
  }
}
function execute(data){
  if(busy||phase==='done'||phase==='error')return;
  const candidate=currentCandidate(),index=Number($('variant').value);if(!candidateModule(candidate,index))return;
  if(!active){
    if(data.action!=='init')return;
    active=new Worker('./kex-worker.js',{type:'module'});const worker=active;
    worker.onmessage=({data})=>{if(active===worker)receive(data);};worker.onerror=()=>{if(active===worker)fail('✕ Failed · WASM loading or execution failed，Retry computing the hash。');};
  }
  busy=true;controls();$('candidate-status').textContent=data.action==='send'||data.action==='public'?'◌ In progress · Send public material':'◌ In progress · Local computation';
  timer=setTimeout(()=>fail('This step exceeded 30 seconds'),30000);active.postMessage({...data,id:candidate.id,index});
}
$('kex-next').addEventListener('click',()=>{if(phase==='init')execute({action:'init'});});
$('kex-send').addEventListener('click',()=>{if(phase.startsWith('public'))execute({action:'public',side:owner()});else if(phase==='send')execute({action:'send',pass});});
for(const [side,key] of SIDES.entries())$(`kex-${key}-action`).addEventListener('click',()=>{
  if(side!==owner())return;
  if(phase==='compute')execute({action:'pass',pass});else if(phase.startsWith('derive'))execute({action:'derive',side});
});
$('kex-reset').addEventListener('click',()=>{stopCandidateWork();const c=currentCandidate();if(c?.type==='kex'){prepareKex(c,Number($('variant').value));$('candidate-output').textContent='○ Not started';$('candidate-status').textContent='○ Not started';}});
export function showCandidateWork(candidate,index){
  stopCandidateWork();const hash=candidate?.type==='hash',runnable=Boolean(candidateModule(candidate,index));
  $('candidate-workbench').classList.toggle('hidden',!runnable);if(!runnable)return;
  $('kex-exchange').classList.toggle('hidden',hash);if(!hash)prepareKex(candidate,index);
  $('candidate-work-title').textContent=hash?'Compute a hash locally':'Alice and Bob establish a shared secret step by step';
  $('candidate-work-description').textContent=hash?'Input is UTF-8 encoded and computed by the selected WASM implementation; maximum 1 MiB.':'Share public keys, then alternate local computation, sending and receiving. Finally derive each secret independently. The middle channel carries public material.';
  $('candidate-message-field').classList.toggle('hidden',!hash);$('candidate-run').classList.toggle('hidden',!hash);$('candidate-run').textContent='Compute hash';
  $('candidate-output-label').textContent=hash?'Digest (HEX)':'Exchange result';$('candidate-status').textContent='○ Not started';$('candidate-output').textContent='○ Not started';
}
$('candidate-message').addEventListener('input', () => {
  if (active) stopCandidateWork();
  $('candidate-status').textContent = '○ Not started';
  $('candidate-output').textContent = '○ Not started';
});

$('candidate-run').addEventListener('click', () => {
  stopCandidateWork();
  const candidate = currentCandidate();
  const index = Number($('variant').value);
  if (!candidateModule(candidate, index)) return;
  const isHash = candidate.type === 'hash';
  if(!isHash)return;
  const bytes = isHash ? new TextEncoder().encode($('candidate-message').value) : null;
  if (bytes && bytes.length > 1048576) {
    $('candidate-status').textContent = 'Message must not exceed 1 MiB';
    return;
  }
  const running = new Worker(isHash ? './hash-worker.js' : './kex-worker.js', { type: 'module' });
  active = running;
  $('candidate-run').disabled = true;
  $('candidate-message').disabled = true;
  $('candidate-status').textContent = '◌ In progress';
  $('candidate-output').textContent = '◌ In progress';
  timer = setTimeout(() => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = '✕ Failed · Stopped after exceeding 30 seconds。Retry computing the hash。';
    $('candidate-output').textContent = '✕ Failed';
    $('candidate-run').textContent = 'RetryCompute hash';

  }, 30000);
  running.onmessage = ({ data }) => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = (data.error ? '✕ Failed · '+data.error : null) || (isHash
      ? `✓ Complete · ${data.bytes} B · ${data.ms.toFixed(2)} ms`
      : `Both parties match · ${data.passes} rounds · ${data.ms.toFixed(2)} ms`);
    $('candidate-output').textContent = data.error ? 'No result generated' : isHash
      ? data.digest : `Shared secret ${data.bytes} B · Both parties match · Time: ${data.ms.toFixed(2)} ms`;
  };
  running.onerror = () => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = '✕ Failed · WASM loading or execution failed，Retry computing the hash。';
    $('candidate-output').textContent = '✕ Failed';
    $('candidate-run').textContent = 'RetryCompute hash';

  };
  if (isHash) running.postMessage({ id: candidate.id, index, message: bytes }, [bytes.buffer]);
  else running.postMessage({ id: candidate.id, index });
});
