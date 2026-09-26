import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';

const $ = id => document.getElementById(id);
let active = null;
let timer = null;
let currentCandidate = () => null;
let kexStep = 0;
let kexPasses = 0;

export function setCandidateProvider(provider) { currentCandidate = provider; }

export function stopCandidateWork() {
  active?.terminate();
  active = null;
  clearTimeout(timer);
  timer = null;
  $('candidate-run').disabled = false;
  $('candidate-message').disabled = false;
}

export function candidateModule(candidate, index) {
  if (candidate?.type === 'kex') return NGCC_KEX_WASM[candidate.id]?.[index];
  if (candidate?.type === 'hash') return NGCC_HASH_WASM[candidate.id]?.[index];
  return null;
}

function setKexState(state, result = null) {
  const view = $('kex-exchange');
  view.dataset.state = state;
  const label = state === 'running' ? '正在建立共享密钥' : state === 'done' ? '共享密钥已建立' : state === 'error' ? '交换未完成' : '等待查看';
  $('kex-alice-state').textContent = label;
  $('kex-bob-state').textContent = label;
  $('kex-passes').textContent = result ? `${result.passes} 轮` : '— 轮';
  $('kex-traffic').textContent = result ? `${result.totalBytes.toLocaleString('zh-CN')} B 传输总量` : '— B 传输总量';
  for (const side of ['alice', 'bob']) {
    $(`kex-${side}-fingerprint`).textContent = result ? `SHA-256: ${result.fingerprint}` : '—';
  }
}

function renderKexStep() {
  const step = kexStep;
  $('kex-next').disabled = step > kexPasses;
  $('candidate-run').disabled = step <= kexPasses;
  $('kex-next').textContent = step < kexPasses ? `查看第 ${step + 1} 轮` : step === kexPasses ? '查看双方派生' : '阶段已看完';
  $('kex-alice').classList.toggle('is-speaking', step > 0 && step <= kexPasses && step % 2 === 1);
  $('kex-bob').classList.toggle('is-speaking', step > 0 && step <= kexPasses && step % 2 === 0);
  $('kex-alice').classList.toggle('is-receiving', step > 0 && step <= kexPasses && step % 2 === 0);
  $('kex-bob').classList.toggle('is-receiving', step > 0 && step <= kexPasses && step % 2 === 1);
  for (const item of $('kex-messages').children) {
    const number = Number(item.dataset.pass);
    item.classList.toggle('is-current', number === step && step <= kexPasses);
    item.classList.toggle('is-viewed', number <= step);
    item.lastElementChild.textContent = number <= step ? '已查看顺序' : '等待查看';
  }
  if (!step) {
    $('kex-step-number').textContent = `准备阶段 / 共 ${kexPasses} 轮`;
    $('kex-step-title').textContent = '认识双方的本地材料';
    $('kex-step-detail').textContent = '协议运行时，Alice 与 Bob 各生成自己的密钥对和本地状态，私钥不传输。点击查看各轮输入、方向与消息去向。';
    $('kex-alice-state').textContent = '等待查看'; $('kex-bob-state').textContent = '等待查看';
    return;
  }
  if (step > kexPasses) {
    $('kex-step-number').textContent = `派生阶段 · 已查看 ${kexPasses} 轮`;
    $('kex-step-title').textContent = '双方分别派生并比较共享密钥';
    $('kex-step-detail').textContent = '消息顺序已看完。点击“执行完整协议并比对”，由真实 WASM 生成消息、更新本地状态，并检查 Alice 与 Bob 派生的密钥是否逐字节一致。';
    $('kex-alice-state').textContent = '准备派生共享密钥';
    $('kex-bob-state').textContent = '准备派生共享密钥';
    return;
  } else {
    const sender = step % 2 ? 'Alice' : 'Bob';
    const receiver = step % 2 ? 'Bob' : 'Alice';
    $('kex-step-number').textContent = `第 ${step}/${kexPasses} 轮 · 接口顺序`;
    $('kex-step-title').textContent = `${sender} → ${receiver}：产生并发送第 ${step} 轮消息`;
    $('kex-step-detail').textContent = step === 1
      ? 'Alice 的第 1 轮接口使用自己的私钥、Bob 的公钥及本地状态，产生消息 msg1；Bob 随后据此继续。'
      : `${sender} 的第 ${step} 轮接口读取 msg${step - 1}、自己的私钥、${receiver} 的公钥和本地状态，产生 msg${step}。`;
  }
  $('kex-alice-state').textContent = step % 2 ? '本轮产生 msg' + step : '接收 msg' + step;
  $('kex-bob-state').textContent = step % 2 ? '接收 msg' + step : '本轮产生 msg' + step;
}

function prepareKex(candidate, index) {
  const parameter = candidate.parameters[index];
  kexPasses = parameter.sizes.Passes;
  kexStep = 0;
  setKexState('idle');
  $('kex-passes').textContent = `${kexPasses} 轮`;
  $('kex-traffic').textContent = `预计总消息量 ${parameter.sizes.TotalMessageBytes.toLocaleString('zh-CN')} B`;
  $('kex-alice-material').textContent = `本地状态 ${parameter.sizes.InitiatorStateBytes.toLocaleString('zh-CN')} B · 私钥仅本地`;
  $('kex-bob-material').textContent = `本地状态 ${parameter.sizes.ResponderStateBytes.toLocaleString('zh-CN')} B · 私钥仅本地`;
  $('kex-messages').replaceChildren(...Array.from({ length: kexPasses }, (_, index) => {
    const number = index + 1;
    const item = document.createElement('li'); item.dataset.pass = number;
    const label = document.createElement('strong'), state = document.createElement('small');
    label.textContent = `第 ${number} 轮 · ${number % 2 ? 'Alice → Bob' : 'Bob → Alice'} · msg${number}`;
    item.append(label, state); return item;
  }));
  renderKexStep();
}

$('kex-next').addEventListener('click', () => {
  if (active || kexStep > kexPasses) return;
  kexStep++;
  renderKexStep();
  $('candidate-status').textContent = kexStep > kexPasses ? '过程已看完 · 可执行完整协议' : `已查看第 ${kexStep} 轮顺序`;
});
$('kex-reset').addEventListener('click', () => {
  stopCandidateWork();
  const candidate = currentCandidate();
  if (!candidate || candidate.type !== 'kex') return;
  prepareKex(candidate, Number($('variant').value));
  $('candidate-status').textContent = '等待查看协议轮次';
  $('candidate-output').textContent = '等待运行';
});

export function showCandidateWork(candidate, index) {
  stopCandidateWork();
  const isHash = candidate?.type === 'hash';
  const runnable = Boolean(candidateModule(candidate, index));
  $('candidate-workbench').classList.toggle('hidden', !runnable);
  if (!runnable) return;
  $('kex-exchange').classList.toggle('hidden', isHash);
  if (!isHash) prepareKex(candidate, index);
  $('candidate-work-title').textContent = isHash ? '本地计算摘要' : '双方密钥交换';
  $('candidate-work-description').textContent = isHash
    ? '输入按 UTF-8 编码，交给所选提交实现的 WASM 计算；最多 1 MiB，消息只在浏览器内处理。'
    : '按接口顺序点击每轮，观察 Alice、Bob 的材料与消息方向；最后由 WASM 执行完整协议并比对共享密钥。';
  $('candidate-message-field').classList.toggle('hidden', !isHash);
  $('candidate-run').textContent = isHash ? '计算摘要' : '执行完整协议并比对';
  $('candidate-output-label').textContent = isHash ? '摘要（HEX）' : '运行结果';
  $('candidate-status').textContent = isHash ? '等待输入' : '等待查看协议轮次';
  $('candidate-output').textContent = isHash ? '等待计算' : '等待运行';
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
  if (!isHash) {
    setKexState('running');
    $('kex-step-title').textContent = '正在运行真实 WASM 协议';
    $('kex-step-detail').textContent = '当前一次性调用完整提交接口：初始化、逐轮产生消息、双方派生并逐字节比较共享密钥。';
  }
  timer = setTimeout(() => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = '超过 30 秒，已停止';
    $('candidate-output').textContent = '未生成结果';
    if (!isHash) { setKexState('error'); $('kex-step-title').textContent = '本次协议超时'; }
  }, 30000);
  running.onmessage = ({ data }) => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = data.error || (isHash
      ? `完成 · ${data.bytes} B · ${data.ms.toFixed(2)} ms`
      : `双方一致 · ${data.passes} 轮 · ${data.ms.toFixed(2)} ms`);
    if (!isHash) {
      setKexState(data.error ? 'error' : 'done', data.error ? null : data);
      $('kex-step-number').textContent = data.error ? '真实协议失败' : '真实协议已完成';
      $('kex-step-title').textContent = data.error ? '本次未建立共享密钥' : 'Alice 与 Bob 的共享密钥逐字节一致';
      $('kex-step-detail').textContent = data.error || `WASM 报告 ${data.passes} 轮、实际总消息量 ${data.totalBytes.toLocaleString('zh-CN')} B；这里只展示相同密钥的 SHA-256 指纹，私钥和报文不离开本地模块。`;
    }
    $('candidate-output').textContent = data.error ? '未生成结果' : isHash
      ? data.digest : `共享密钥 ${data.bytes} B · 双方一致 · 耗时 ${data.ms.toFixed(2)} ms`;
  };
  running.onerror = () => {
    if (active !== running) return;
    stopCandidateWork();
    $('candidate-status').textContent = 'WASM 加载或执行失败';
    $('candidate-output').textContent = '未生成结果';
    if (!isHash) { setKexState('error'); $('kex-step-title').textContent = 'WASM 加载或运行失败'; }
  };
  if (isHash) running.postMessage({ id: candidate.id, index, message: bytes }, [bytes.buffer]);
  else running.postMessage({ id: candidate.id, index });
});
