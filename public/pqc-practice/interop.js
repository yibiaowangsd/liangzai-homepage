import { createExample, runPack, validatePack } from './interop-core.js';

const $ = selector => document.querySelector(selector);
const choices = {
  'mlkem': { library: 'nist', family: 'mlkem', variant: '768', hash: 'shake' },
  'mldsa': { library: 'nist', family: 'mldsa', variant: '44', hash: 'shake' },
  'aigis-kem': { library: 'ngcc', family: 'kem-01', variant: '0', hash: 'shake' },
  'aigis-sig': { library: 'ngcc', family: 'sign-01', variant: '0', hash: 'shake' },
};
let worker, serial = 0, pending = new Map(), controller, report = null, generation = 0;
function stopWorker(error = new DOMException('已停止本次复验', 'AbortError')) {
  worker?.terminate(); worker = null;
  for (const { reject, timeout } of pending.values()) { clearTimeout(timeout); reject(error); }
  pending.clear();
}
function invoke(type, suite, inputs = {}) {
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const call = pending.get(data.requestId);
      if (!call) return;
      clearTimeout(call.timeout); pending.delete(data.requestId);
      if (data.type === 'error') call.reject(new Error(data.message)); else call.resolve(data.result);
    };
    worker.onerror = () => stopWorker(new Error('运行模块无法加载或执行。'));
  }
  const requestId = ++serial;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error('计算超时')); stopWorker(); }, 30000);
    pending.set(requestId, { resolve, reject, timeout });
    worker.postMessage({ type, requestId, ...suite, ...inputs });
  });
}
function busy(value) {
  $('#pack-run').disabled = value;
  $('#pack-example').disabled = value;
  $('#pack-file').disabled = value;
  $('#pack-input').disabled = value;
  $('#pack-suite').disabled = value;
  $('#pack-stop').disabled = !value;
}
function invalidate() {
  generation++; report = null; $('#pack-export').disabled = true; $('#pack-results').replaceChildren();
  $('#pack-status').textContent = '等待复验';
}
function appendResult(item) {
  const row = document.createElement('tr');
  for (const value of [item.id, `${item.suite.family} / ${item.suite.variant}`, { passed: '通过', failed: '不符合预期', error: '执行错误' }[item.status], typeof item.ms === 'number' ? item.ms.toFixed(2) + ' ms' : '—', item.error || `${item.operation === 'verify' ? '验签结果' : '与预期密钥相同'}：${item.actual ? '是' : '否'}`]) {
    const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
  }
  row.dataset.status = item.status; $('#pack-results').append(row);
}
function download(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#pack-input').addEventListener('input', invalidate);
$('#pack-file').addEventListener('change', async event => {
  invalidate();
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 12 * 1024 * 1024) { $('#pack-status').textContent = '单个测试包不能超过12MiB。'; return; }
  const current = generation;
  try { const text = await file.text(); if (current !== generation) return; validatePack(JSON.parse(text)); $('#pack-input').value = text; $('#pack-status').textContent = `已载入 ${file.name}，尚未执行。`; }
  catch (error) { $('#pack-status').textContent = error.message; }
  event.target.value = '';
});
$('#pack-example').addEventListener('click', async () => {
  invalidate(); busy(true); $('#pack-status').textContent = '正在生成临时测试材料…';
  const current = generation;
  try { const pack = await createExample(choices[$('#pack-suite').value], invoke); if (current !== generation) return; $('#pack-input').value = JSON.stringify(pack, null, 2); $('#pack-status').textContent = '已生成正向与篡改用例。点击开始复验，或下载测试包交给原生端运行。'; }
  catch (error) { if (current === generation) $('#pack-status').textContent = error.name === 'AbortError' ? '已停止生成。' : '生成失败，请重新选择算法后再试。'; }
  finally { if (current === generation) { stopWorker(); busy(false); } }
});
$('#pack-run').addEventListener('click', async () => {
  invalidate(); controller = new AbortController(); busy(true);
  const current = generation;
  try {
    const pack = validatePack(JSON.parse($('#pack-input').value));
    const result = await runPack(pack, invoke, { signal: controller.signal, onResult: (item, count, total) => { appendResult(item); $('#pack-status').textContent = `已完成 ${count} / ${total}`; } });
    const provenance = await fetch('./interop-provenance.json').then(response => { if (!response.ok) throw new Error('来源记录不可用'); return response.json(); });
    if (current !== generation) return;
    const selected = Object.fromEntries([...new Set(result.results.map(item => item.runtime))].filter(name => provenance.runtimes[name]).map(name => [name, provenance.runtimes[name]]));
    report = { ...result, provenance: { ...provenance, runtimes: selected } };
    $('#pack-export').disabled = false;
    $('#pack-status').textContent = `完成：${report.passed} 通过，${report.failed} 不符合预期，${report.errors} 执行错误。`;
  } catch (error) { if (current === generation) { report = null; $('#pack-export').disabled = true; $('#pack-status').textContent = error.name === 'AbortError' ? '已停止；未完成的批次不能导出为完整报告。' : error instanceof SyntaxError ? 'JSON 格式不正确。' : error.message; } }
  finally { if (current === generation) { stopWorker(); busy(false); } }
});
$('#pack-stop').addEventListener('click', () => { controller?.abort(); stopWorker(); });
$('#pack-clear').addEventListener('click', () => { controller?.abort(); stopWorker(); invalidate(); $('#pack-input').value = ''; busy(false); });
$('#pack-export').addEventListener('click', () => { if (report) download(report, 'liangzai-pqc-results.json'); });
$('#pack-download').addEventListener('click', () => {
  try { download(validatePack(JSON.parse($('#pack-input').value)), 'liangzai-pqc-testpack.json'); }
  catch { $('#pack-status').textContent = '请先生成或导入有效测试包。'; }
});
window.addEventListener('pagehide', () => { controller?.abort(); stopWorker(); $('#pack-input').value = ''; report = null; });
