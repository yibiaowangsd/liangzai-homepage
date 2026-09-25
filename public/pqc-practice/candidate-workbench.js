import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';

const $ = id => document.getElementById(id);
let active = null;
let timer = null;
let currentCandidate = () => null;

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

export function showCandidateWork(candidate, index) {
  stopCandidateWork();
  const isHash = candidate?.type === 'hash';
  const runnable = Boolean(candidateModule(candidate, index));
  $('candidate-workbench').classList.toggle('hidden', !runnable);
  if (!runnable) return;
  $('candidate-work-title').textContent = isHash ? '本地计算摘要' : '本地协议往返';
  $('candidate-work-description').textContent = isHash
    ? '输入按 UTF-8 编码，交给所选提交实现的 WASM 计算；最多 1 MiB，消息只在浏览器内处理。'
    : '双方调用所选提交实现完成协议并比较共享密钥；页面仅显示密钥的 SHA-256 指纹。';
  $('candidate-message-field').classList.toggle('hidden', !isHash);
  $('candidate-run').textContent = isHash ? '计算摘要' : '运行密钥交换';
  $('candidate-output-label').textContent = isHash ? '摘要（HEX）' : '运行结果';
  $('candidate-status').textContent = isHash ? '等待输入' : '等待运行';
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
      ? data.digest : `共享密钥 ${data.bytes} B，SHA-256 指纹：${data.fingerprint}`;
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
