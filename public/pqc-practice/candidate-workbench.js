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
  const preview=document.createElement('pre');preview.textContent=value.bytes?`${value.preview}${value.bytes>128?'\n…（预览前 128 字节）':''}`:'此参数不使用这项材料（0 字节；跳过字节传输）';
  const hash=document.createElement('small');hash.textContent=`完整材料 SHA-256：${value.fingerprint}`;
  card.append(summary,preview,hash);return card;
}
function guide(title,detail){$('kex-step-title').textContent=title;$('kex-step-detail').textContent=detail;}
function owner(){return phase==='public-a'||phase==='derive-a'?0:phase==='public-b'||phase==='derive-b'?1:(pass-1)%2;}
function progress(){
  const stages=['本地准备','共享公钥',...Array.from({length:kexPasses},(_,i)=>`第 ${i+1} 轮收发`),'独立派生','密钥一致'];
  const current=phase==='init'?0:phase.startsWith('public')?1:['compute','send'].includes(phase)?pass+1:phase.startsWith('derive')?kexPasses+2:phase==='done'?kexPasses+3:-1;
  $('kex-progress').replaceChildren(...stages.map((text,i)=>{const li=document.createElement('li');li.textContent=`${i<current?'✓ ':''}${text}`;li.className=i===current?'current':i<current?'complete':'';if(i===current)li.setAttribute('aria-current','step');return li;}));
}
function controls(){
  const side=owner(),sending=phase==='send'||phase.startsWith('public');
  $('kex-next').hidden=phase!=='init';$('kex-next').disabled=busy;
  $('kex-next').textContent=busy?'正在准备双方材料…':'开始：生成双方本地材料';
  $('kex-send').disabled=busy||!sending;$('kex-send').classList.toggle('is-next',!busy&&sending);
  $('kex-send').firstElementChild.textContent=busy&&sending?'正在发送…':`发送给 ${NAMES[1-side]}`;
  for(const [i,key] of SIDES.entries()){
    const enabled=!busy&&i===side&&(phase==='compute'||phase.startsWith('derive'));
    $(`kex-${key}-action`).disabled=!enabled;$(`kex-${key}-action`).classList.toggle('is-next',enabled);
    $(`kex-${key}-action`).textContent=phase.startsWith('derive')?`${NAMES[i]} 派生共享密钥`:`${NAMES[i]} 本地计算${phase==='compute'||phase==='send'?` msg${pass}`:''}`;
    $(`kex-${key}`).classList.toggle('is-speaking',i===side&&phase!=='init'&&phase!=='done');
  }
  $('kex-step-number').textContent=phase==='done'?'全部步骤完成':`操作 ${Math.min(kexStep+1,kexPasses*2+5)} / ${kexPasses*2+5}`;progress();
}
function route(side,message){
  const r=$('kex-route');r.classList.toggle('to-left',side===1);r.dataset.state=message?'ready':'empty';
  $('kex-direction').textContent=`${NAMES[side]} → ${NAMES[1-side]}`;$('kex-route-state').textContent=message?'待发送 · 未送达':'等待本地计算';
  $('kex-packet-title').textContent=message?`${message.label} · 待发送`:'待发送区';
  if(message){const card=materialCard(message);card.open=true;$('kex-outbox').replaceChildren(card);}
  else $('kex-outbox').textContent=`${NAMES[side]} 还没有生成 msg${pass}。先点击左／右侧本地计算。`;
  $('kex-route-note').textContent=message?(message.bytes?'点击发送后才进入对方收件箱。':'该项为 0 B：确认公开输入，不发送字节。'):'计算只发生在本地，尚无消息可以发送。';
}
function prepareKex(candidate,index){
  kexStep=0;kexPasses=candidate.parameters[index].sizes.Passes;traffic=0;phase='init';pass=1;publicMaterials=[];
  $('kex-exchange').dataset.state='idle';$('kex-messages').replaceChildren();$('kex-messages').parentElement.open=false;
  for(const side of SIDES){
    $(`kex-${side}-material`).textContent='公钥可公开 · 私钥与状态留在本地';$(`kex-${side}-inventory`).replaceChildren();
    $(`kex-${side}-inbox`).textContent='尚未收到消息';$(`kex-${side}-state`).textContent='等待生成本地材料';
    $(`kex-${side}-recipe`).textContent='开始后，各自生成公钥、私钥和本地状态。';$(`kex-${side}-fingerprint`).textContent='尚未派生共享密钥';
    $(`kex-${side}`).classList.remove('is-speaking','is-receiving');$(`kex-${side}-inbox`).classList.remove('incoming');
  }
  $('kex-passes').textContent=`${kexPasses} 轮协议消息`;$('kex-traffic').textContent='已传输 0 B';route(0,null);
  $('kex-outbox').textContent='先准备双方材料，再分别发送公钥。';
  guide('先准备，再共享公钥','左边是 Alice，右边是 Bob。两边各自保管秘密；中间只传公开材料。先生成双方材料，然后逐个点击发送公钥。每一步都由你操作。');controls();
}
function packet(side,message,title){
  const item=document.createElement('li');item.className='is-viewed is-current';
  for(const child of $('kex-messages').children)child.classList.remove('is-current');
  const label=document.createElement('strong');label.textContent=title;item.append(label,materialCard(message));$('kex-messages').append(item);
  const inbox=$(`kex-${SIDES[1-side]}-inbox`);if(!inbox.querySelector('details'))inbox.replaceChildren();
  inbox.append(materialCard(message));inbox.classList.remove('incoming');void inbox.offsetWidth;inbox.classList.add('incoming');
  traffic+=message.bytes;$('kex-traffic').textContent=`已传输 ${traffic.toLocaleString('zh-CN')} B（含公钥）`;
  $(`kex-${SIDES[1-side]}-state`).textContent=`已收到 ${message.label} · ${message.bytes} B`;
  $(`kex-${SIDES[side]}-state`).textContent=`${message.label} 已送达 ${NAMES[1-side]}`;
}
function computeGuide(){
  const side=(pass-1)%2,from=NAMES[side],to=NAMES[1-side];
  const recipe=`输入：自己的私钥与本地状态 + ${to} 公钥${pass>1?` + 收到的 msg${pass-1}`:''}。输出：msg${pass} 和更新后的本地状态。`;
  $(`kex-${SIDES[side]}-recipe`).textContent=recipe;$(`kex-${SIDES[1-side]}-recipe`).textContent=`等待 ${from} 计算并发送 msg${pass}；当前还没有收到这条消息。`;
  guide(`轮到 ${from} 本地计算 msg${pass}`,`${recipe} 点击 ${from} 卡片内的计算按钮；此操作不会发送消息。`);
}
function fail(message){stopCandidateWork();phase='error';controls();$('kex-exchange').dataset.state='error';guide('本次交换停止',`${message}。点击“重新开始”创建新会话。`);$('candidate-status').textContent=message;}
function complete(data){
  busy=false;kexStep++;$('candidate-status').textContent=`本步完成 · ${data.ms.toFixed(2)} ms`;controls();
}
function receive(data){
  clearTimeout(timer);if(data.error){fail(data.error);return;}
  if(data.action==='init'){
    for(const [i,side] of SIDES.entries()){
      $(`kex-${side}-inventory`).replaceChildren(...data.materials.slice(i*3,i*3+3).map(materialCard));
      $(`kex-${side}-state`).textContent='本地材料已生成，尚未发送';$(`kex-${side}-recipe`).textContent='只共享公钥，私钥与状态不离开本地保险箱。';
    }
    publicMaterials=[data.materials[0],data.materials[3]];phase='public-a';route(0,publicMaterials[0]);
    guide('先把 Alice 的公钥交给 Bob','Alice 的公钥已经放入中间待发送区。点击“发送给 Bob”，Bob 的收件箱才会出现它；然后反向发送 Bob 的公钥。');complete(data);
  }else if(data.action==='public'||data.action==='send'){
    const side=data.action==='public'?data.side:(data.pass-1)%2;
    $('kex-route').classList.add('sending');$('kex-route-state').textContent='传输中…';
    guide(`${NAMES[side]} → ${NAMES[1-side]}：正在发送 ${data.message.label}`,'发送过程中暂时不能执行下一步。消息到达后会出现在接收方的收件箱。');
    const deliver=()=>{
      arrival=null;$('kex-route').classList.remove('sending');$('kex-route').dataset.state='delivered';$('kex-route-state').textContent='已送达';
      $('kex-packet-title').textContent=`${data.message.label} · 已送达`;
      packet(side,data.message,`${NAMES[side]} → ${NAMES[1-side]} · ${data.message.label}`);
      if(data.action==='public'&&side===0){phase='public-b';route(1,publicMaterials[1]);guide('Bob 收到了 Alice 公钥，现在回送自己的公钥','左侧仍未收到 Bob 的公钥。点击中间“发送给 Alice”，完成双向公开输入准备。');}
      else if(data.action==='public'){phase='compute';computeGuide();$('kex-route-note').textContent='双方公钥已共享。接下来在 Alice 卡片中计算第一条消息。';}
      else if(pass<kexPasses){pass++;phase='compute';computeGuide();$('kex-route-note').textContent=`消息已送达 ${NAMES[1-side]}。现在轮到对方本地计算。`;}
      else{
        phase='derive-a';guide('收发结束，Alice 先独立派生密钥','Alice 使用自己的秘密、状态和已收到的消息计算共享密钥。共享密钥只进入本地保险箱，不发送给 Bob。');
        for(const [i,key] of SIDES.entries())$(`kex-${key}-recipe`).textContent=`输入：${NAMES[i]} 自己的私钥、状态和已接收消息。输出：仅本地保存的共享密钥。`;
      }
      complete(data);
    };
    arrival=setTimeout(deliver,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:850);
  }else if(data.action==='pass'){
    const side=(data.pass-1)%2,inventory=$(`kex-${SIDES[side]}-inventory`);
    inventory.querySelector(`[data-slot="${data.state.slot}"]`)?.remove();inventory.append(materialCard(data.state));
    phase='send';route(side,data.message);$(`kex-${SIDES[side]}-state`).textContent=`msg${pass} 已计算 · 尚未发送`;
    $(`kex-${SIDES[1-side]}-state`).textContent=`正在等待 msg${pass}，尚未收到`;
    guide(`${NAMES[side]} 算出了 msg${pass}，但 ${NAMES[1-side]} 还没收到`,'真实输出已放入中间待发送区，可直接查看字节；传输总量没有变化。现在点击发送，把消息交给对方。');complete(data);
  }else if(data.action==='derive'){
    const side=SIDES[data.side];$(`kex-${side}-inventory`).append(materialCard(data.secret));$(`kex-${side}-fingerprint`).textContent=`共享密钥 SHA-256：${data.secret.fingerprint}`;$(`kex-${side}-state`).textContent='已在本地派生共享密钥';
    if(data.side===0){phase='derive-b';guide('Alice 已算出密钥，现在让 Bob 独立计算','两人没有互传共享密钥。点击 Bob 卡片里的派生按钮，用 Bob 自己的秘密与已收到的材料计算，然后比较两份真实输出。');}
    else{
      phase=data.match?'done':'error';$('kex-exchange').dataset.state=data.match?'done':'error';
      guide(data.match?'两把密钥逐字节一致，交换完成':'双方密钥不一致','Alice 与 Bob 分别计算了自己的密钥，底层已逐字节比较完整结果。公钥和消息可以公开传输；私钥、本地状态及最终共享密钥始终留在各自本地。');
      $('candidate-output').textContent=data.match?`双方独立得到相同的 ${data.secret.bytes} B 密钥；公开传输 ${traffic} B。`:'协议未能建立一致的共享密钥';
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
    worker.onmessage=({data})=>{if(active===worker)receive(data);};worker.onerror=()=>{if(active===worker)fail('WASM 加载或执行失败');};
  }
  busy=true;controls();$('candidate-status').textContent=data.action==='send'||data.action==='public'?'正在发送公开材料…':'正在执行本地计算…';
  timer=setTimeout(()=>fail('本步超过 30 秒'),30000);active.postMessage({...data,id:candidate.id,index});
}
$('kex-next').addEventListener('click',()=>{if(phase==='init')execute({action:'init'});});
$('kex-send').addEventListener('click',()=>{if(phase.startsWith('public'))execute({action:'public',side:owner()});else if(phase==='send')execute({action:'send',pass});});
for(const [side,key] of SIDES.entries())$(`kex-${key}-action`).addEventListener('click',()=>{
  if(side!==owner())return;
  if(phase==='compute')execute({action:'pass',pass});else if(phase.startsWith('derive'))execute({action:'derive',side});
});
$('kex-reset').addEventListener('click',()=>{stopCandidateWork();const c=currentCandidate();if(c?.type==='kex'){prepareKex(c,Number($('variant').value));$('candidate-output').textContent='等待运行';$('candidate-status').textContent='新会话尚未开始';}});
export function showCandidateWork(candidate,index){
  stopCandidateWork();const hash=candidate?.type==='hash',runnable=Boolean(candidateModule(candidate,index));
  $('candidate-workbench').classList.toggle('hidden',!runnable);if(!runnable)return;
  $('kex-exchange').classList.toggle('hidden',hash);if(!hash)prepareKex(candidate,index);
  $('candidate-work-title').textContent=hash?'本地计算摘要':'Alice 与 Bob，一步一步建立共同秘密';
  $('candidate-work-description').textContent=hash?'输入按 UTF-8 编码，交给所选实现的 WASM 计算；最多 1 MiB。':'先共享公钥，再交替执行“本地计算 → 点击发送 → 对方接收”，最后各自派生同一把密钥。左右是本地保险箱，中间是公开通信通道。';
  $('candidate-message-field').classList.toggle('hidden',!hash);$('candidate-run').classList.toggle('hidden',!hash);$('candidate-run').textContent='计算摘要';
  $('candidate-output-label').textContent=hash?'摘要（HEX）':'交换结论';$('candidate-status').textContent=hash?'等待输入':'等待生成双方材料';$('candidate-output').textContent='等待运行';
}
$('candidate-message').addEventListener('input', () => {
  if (active) stopCandidateWork();
  $('candidate-status').textContent = '等待计算';
  $('candidate-output').textContent = '等待计算';
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
    $('candidate-status').textContent = '消息不得超过 1 MiB';
    return;
  }
  const running = new Worker(isHash ? './hash-worker.js' : './kex-worker.js', { type: 'module' });
  active = running;
  $('candidate-run').disabled = true;
  $('candidate-message').disabled = true;
  $('candidate-status').textContent = isHash ? '正在计算…' : '正在交换…';
  $('candidate-output').textContent = '运行中';
  timer = setTimeout(() => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = '超过 30 秒，已停止';
    $('candidate-output').textContent = '未生成结果';

  }, 30000);
  running.onmessage = ({ data }) => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = data.error || (isHash
      ? `完成 · ${data.bytes} B · ${data.ms.toFixed(2)} ms`
      : `双方一致 · ${data.passes} 轮 · ${data.ms.toFixed(2)} ms`);
    $('candidate-output').textContent = data.error ? '未生成结果' : isHash
      ? data.digest : `共享密钥 ${data.bytes} B · 双方一致 · 耗时 ${data.ms.toFixed(2)} ms`;
  };
  running.onerror = () => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = 'WASM 加载或执行失败';
    $('candidate-output').textContent = '未生成结果';

  };
  if (isHash) running.postMessage({ id: candidate.id, index, message: bytes }, [bytes.buffer]);
  else running.postMessage({ id: candidate.id, index });
});
