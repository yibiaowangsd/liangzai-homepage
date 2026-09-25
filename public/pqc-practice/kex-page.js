import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';

const $ = id => document.getElementById(id);
const facts = { PublicKeyBytes: '公钥', SecretKeyBytes: '私钥', SharedSecretBytes: '共享密钥',
  Passes: '交互轮数', InitiatorStateBytes: '发起方状态', ResponderStateBytes: '响应方状态',
  TotalMessageBytes: '总消息' };
const item = (tag, content) => { const element = document.createElement(tag); element.textContent = content; return element; };
const catalog = await fetch('./ngcc-catalog.json').then(response => {
  if (!response.ok) throw new Error(`目录 HTTP ${response.status}`);
  return response.json();
});
const candidates = catalog.candidates.filter(candidate => candidate.type === 'kex');
let current = candidates[0], worker = null, timer = null;
function stop() {
  worker?.terminate(); worker = null;
  clearTimeout(timer); timer = null;
  $('kex-run').disabled = false;
}
function renderParameter() {
  stop();
  const index = Number($('kex-variant').value), parameter = current.parameters[index];
  const module = NGCC_KEX_WASM[current.id]?.[index];
  $('kex-source').textContent = parameter.source;
  $('kex-workbench').classList.toggle('hidden', !module);
  $('kex-notice').textContent = module
    ? '此参数的提交源码已编译成浏览器 WASM，通过原生测试向量与完整协议往返检查。运行结果仅是功能验证。'
    : '当前发布版本尚未接入此参数的浏览器 WASM；可查看提交源码与官方资料。';
  $('kex-result').textContent = '等待运行';
  $('kex-status').textContent = '等待运行';
  $('kex-facts').replaceChildren(...Object.entries(parameter.sizes).map(([key, value]) => {
    const container = item('div', '');
    container.append(item('dt', facts[key] || key), item('dd', `${value.toLocaleString('zh-CN')} ${key === 'Passes' ? '轮' : 'B'}`));
    return container;
  }));
}
function renderList() {
  const query = $('kex-search').value.trim().toLocaleLowerCase();
  $('kex-list').replaceChildren(...candidates.filter(candidate =>
    `${candidate.id} ${candidate.name}`.toLocaleLowerCase().includes(query)).map(candidate => {
    const button = item('button', `${candidate.name} (${candidate.id})`);
    button.type = 'button';
    if (candidate === current) button.setAttribute('aria-current', 'true');
    button.append(item('small', `${candidate.parameters.length} 组参数 · ${candidate.team.length} 位成员`));
    button.addEventListener('click', () => { current = candidate; render(); });
    return button;
  }));
}
function render() {
  $('kex-name').textContent = current.name; $('kex-id').textContent = current.id;
  $('kex-variant').replaceChildren(...current.parameters.map((parameter, index) =>
    new Option(parameter.label, String(index))));
  $('kex-team').textContent = current.team.join('、');
  $('kex-official').href = current.page; $('kex-archive').href = current.archive;
  renderParameter(); renderList();
}
$('kex-search').addEventListener('input', renderList);
$('kex-variant').addEventListener('change', renderParameter);
$('kex-run').addEventListener('click', () => {
  stop();
  const running = new Worker('./kex-worker.js', { type: 'module' });
  worker = running; $('kex-run').disabled = true;
  $('kex-status').textContent = '正在交换…'; $('kex-result').textContent = '运行中';
  timer = setTimeout(() => {
    if (worker !== running) return;
    stop(); $('kex-status').textContent = '超过 30 秒，已停止'; $('kex-result').textContent = '未生成结果';
  }, 30000);
  running.onmessage = ({ data }) => {
    if (worker !== running) return;
    stop(); $('kex-status').textContent = data.error || `双方一致 · ${data.passes} 轮 · ${data.ms.toFixed(2)} ms`;
    $('kex-result').textContent = data.error ? '未生成结果' : `共享密钥 ${data.bytes} B，SHA-256 指纹：${data.fingerprint}`;
  };
  running.onerror = () => {
    if (worker !== running) return;
    stop(); $('kex-status').textContent = 'WASM 加载或执行失败'; $('kex-result').textContent = '未生成结果';
  };
  running.postMessage({ id: current.id, index: Number($('kex-variant').value) });
});
render();
