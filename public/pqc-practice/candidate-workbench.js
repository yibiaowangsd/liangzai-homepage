import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';
const $=id=>document.getElementById(id);
let active=null,timer=null,currentCandidate=()=>null,kexStep=0,kexPasses=0,busy=false,traffic=0;
export function setCandidateProvider(provider){currentCandidate=provider;}
export function stopCandidateWork(){active?.terminate();active=null;clearTimeout(timer);timer=null;busy=false;$('candidate-run').disabled=false;$('candidate-message').disabled=false;}
export function candidateModule(candidate,index){return candidate?.type==='kex'?NGCC_KEX_WASM[candidate.id]?.[index]:candidate?.type==='hash'?NGCC_HASH_WASM[candidate.id]?.[index]:null;}
function materialCard(value){
  const card=document.createElement('details');card.className='kex-material';
  const summary=document.createElement('summary');summary.textContent=`${value.label} · ${value.bytes.toLocaleString('zh-CN')} B`;
  const preview=document.createElement('pre');preview.textContent=value.bytes?`${value.preview}${value.bytes>128?'\n…（预览前 128 字节）':''}`:'此参数没有这项材料（0 字节）';
  const hash=document.createElement('small');hash.textContent=`完整材料 SHA-256：${value.fingerprint}`;
  card.append(summary,preview,hash);return card;
}
function guide(title,detail){$('kex-step-title').textContent=title;$('kex-step-detail').textContent=detail;}
function controls(){
  const text=kexStep===0?'① 双方生成本地材料':kexStep===1?'② 互相发送公钥':kexStep<=kexPasses+1?`第 ${kexStep-1} 轮：${kexStep%2===0?'Alice → Bob':'Bob → Alice'} 生成并发送`:kexStep===kexPasses+2?'Alice 派生共享密钥':kexStep===kexPasses+3?'Bob 派生并比对密钥':'交换完成';
  $('kex-next').textContent=busy?'正在计算…':text;$('kex-next').disabled=busy||kexStep>kexPasses+3;
  $('kex-step-number').textContent=`操作 ${Math.min(kexStep+1,kexPasses+4)} / ${kexPasses+4}`;
}
function prepareKex(candidate,index){
  kexStep=0;kexPasses=candidate.parameters[index].sizes.Passes;traffic=0;
  $('kex-exchange').dataset.state='idle';$('kex-messages').replaceChildren();
  for(const side of ['alice','bob']){
    $(`kex-${side}-material`).textContent='尚未生成公钥、私钥与状态';$(`kex-${side}-inventory`).replaceChildren();
    $(`kex-${side}-state`).textContent='等待初始化';$(`kex-${side}-fingerprint`).textContent='尚未派生共享密钥';
    $(`kex-${side}`).classList.remove('is-speaking','is-receiving');
  }
  $('kex-passes').textContent=`${kexPasses} 轮`;$('kex-traffic').textContent='已传输 0 B';
  guide('从各自的秘密开始','每按一次按钮才执行当前步骤。先生成双方材料，再交换公钥、逐轮发送消息，最后分别计算共享密钥。展开卡片可看真实字节。');controls();
}
function packet(title,values){
  const item=document.createElement('li');item.className='is-viewed is-current';
  for(const child of $('kex-messages').children)child.classList.remove('is-current');
  const label=document.createElement('strong');label.textContent=title;item.append(label,...values.map(materialCard));$('kex-messages').append(item);
  traffic+=values.reduce((sum,item)=>sum+item.bytes,0);$('kex-traffic').textContent=`已传输 ${traffic.toLocaleString('zh-CN')} B（含公钥）`;
}
function fail(message){stopCandidateWork();$('kex-next').disabled=true;$('kex-exchange').dataset.state='error';guide('本次交换停止',`${message}。点击“重新开始”创建新会话。`);$('candidate-status').textContent=message;}
function receive(data){
  clearTimeout(timer);busy=false;if(data.error){fail(data.error);return;}
  if(data.action==='init'){
    for(const [i,side] of ['alice','bob'].entries()){
      $(`kex-${side}-inventory`).replaceChildren(...data.materials.slice(i*3,i*3+3).map(materialCard));
      $(`kex-${side}-material`).textContent='公钥可发送 · 私钥与状态留在本地';$(`kex-${side}-state`).textContent='材料已生成，尚未发送';
    }
    guide('双方各自产生了什么？','两边分别生成了自己的公钥、私钥和协议状态。展开左右卡片查看真实字节。下一步只交换公钥，私钥和本地状态不发送。');
  }else if(data.action==='public'){
    packet('建立公开输入：Alice ⇄ Bob 互发公钥',data.messages);
    for(const side of ['alice','bob'])$(`kex-${side}-state`).textContent='已收到对方公钥';
    guide('双方拿到了对方的公钥','下方记录就是公开传输的材料。公钥须通过可信方式绑定对方身份；这里演示同一浏览器中的两个角色，不包含网络认证。');
  }else if(data.action==='pass'){
    const sender=data.pass%2?'alice':'bob',receiver=data.pass%2?'bob':'alice',from=data.pass%2?'Alice':'Bob',to=data.pass%2?'Bob':'Alice';
    packet(`第 ${data.pass} 轮 · ${from} → ${to} · 已送达 msg${data.pass}`,[data.message]);
    for(const side of ['alice','bob']){$(`kex-${side}`).classList.toggle('is-speaking',side===sender);$(`kex-${side}`).classList.toggle('is-receiving',side===receiver);}
    const inventory=$(`kex-${sender}-inventory`);inventory.lastElementChild?.remove();inventory.append(materialCard(data.state));
    $(`kex-${sender}-state`).textContent=`生成并发送 msg${data.pass}，状态已更新`;$(`kex-${receiver}-state`).textContent=`收到 msg${data.pass} · ${data.message.bytes} B`;
    guide(`${from} 产生了 msg${data.pass}，${to} 已收到`,`${from} 使用自己的私钥和本地状态、${to} 的公钥${data.pass>1?`及刚收到的 msg${data.pass-1}`:''}，生成下面的真实消息，同时更新自己的状态。${to} 将使用该消息继续协议。`);
  }else{
    const side=data.side?'bob':'alice';$(`kex-${side}-inventory`).append(materialCard(data.secret));$(`kex-${side}-fingerprint`).textContent=`共享密钥 SHA-256：${data.secret.fingerprint}`;$(`kex-${side}-state`).textContent='已在本地派生共享密钥';
    if(data.side===0)guide('Alice 已独立算出共享密钥','Alice 根据自己的私钥、本地状态和 Bob 的最后一条消息派生密钥。密钥没有发送给 Bob；接下来让 Bob 独立计算。');
    else{
      $('kex-exchange').dataset.state=data.match?'done':'error';guide(data.match?'两把密钥逐字节一致':'双方密钥不一致','Bob 使用自己的秘密和收到的消息独立派生。底层对两份完整密钥逐字节比较；两边卡片显示各自的真实输出。传输记录中没有共享密钥。');
      $('candidate-output').textContent=data.match?`双方独立得到相同的 ${data.secret.bytes} B 密钥；公开传输 ${traffic} B。`:'协议未能建立一致的共享密钥';
    }
  }
  kexStep++;$('candidate-status').textContent=`本步完成 · ${data.ms.toFixed(2)} ms`;controls();
}
$('kex-next').addEventListener('click',()=>{
  if(busy||kexStep>kexPasses+3)return;
  const candidate=currentCandidate(),index=Number($('variant').value);if(!candidateModule(candidate,index))return;
  if(!active){
    active=new Worker('./kex-worker.js',{type:'module'});const worker=active;
    worker.onmessage=({data})=>{if(active===worker)receive(data);};worker.onerror=()=>{if(active===worker)fail('WASM 加载或执行失败');};
  }
  const data=kexStep===0?{action:'init',id:candidate.id,index}:kexStep===1?{action:'public'}:kexStep<=kexPasses+1?{action:'pass',pass:kexStep-1}:{action:'derive',side:kexStep-kexPasses-2};
  busy=true;controls();$('candidate-status').textContent='正在执行当前步骤…';timer=setTimeout(()=>fail('本步超过 30 秒'),30000);active.postMessage(data);
});
$('kex-reset').addEventListener('click',()=>{stopCandidateWork();const c=currentCandidate();if(c?.type==='kex'){prepareKex(c,Number($('variant').value));$('candidate-output').textContent='等待运行';$('candidate-status').textContent='新会话尚未开始';}});
export function showCandidateWork(candidate,index){
  stopCandidateWork();const hash=candidate?.type==='hash',runnable=Boolean(candidateModule(candidate,index));
  $('candidate-workbench').classList.toggle('hidden',!runnable);if(!runnable)return;
  $('kex-exchange').classList.toggle('hidden',hash);if(!hash)prepareKex(candidate,index);
  $('candidate-work-title').textContent=hash?'本地计算摘要':'双方密钥交换';
  $('candidate-work-description').textContent=hash?'输入按 UTF-8 编码，交给所选实现的 WASM 计算；最多 1 MiB。':'逐步执行真实 WASM：生成材料 → 交换公钥 → 逐轮收发消息 → 双方独立派生。所有操作在当前浏览器完成。';
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
