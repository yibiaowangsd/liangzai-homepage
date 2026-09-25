import { NGCC_WASM } from './ngcc-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';
import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
import { NGCC_REPORTS } from './ngcc-reports.js';

const $ = id => document.getElementById(id);
const TYPES = { kem: '密钥封装', sig: '数字签名', kex: '密钥交换', hash: '哈希算法' };
const SIZES = { PublicKeyBytes: '公钥', SecretKeyBytes: '私钥', CiphertextBytes: '密文',
  SharedSecretBytes: '共享密钥', SignatureBytes: '签名', Passes: '交互轮数',
  InitiatorStateBytes: '发起方状态', ResponderStateBytes: '响应方状态',
  TotalMessageBytes: '总消息', DigestBits: '摘要位数', DigestBytes: '摘要长度' };
const BUILD_LABELS = { verified: '已接入并验证', existing_verified: '已接入并验证',
  compile_failed: '源码编译失败', runtime_failed: 'WASM 运行失败',
  timeout: 'WASM 编译或运行超时', native_timeout: '原生测试超时',
  native_failed: '原生测试失败', source_missing: '本快照缺少实现目录',
  source_not_in_snapshot: '本快照未收录源码', not_attempted: '本批次未执行' };
const node = (tag, value, className) => {
  const element = document.createElement(tag);
  if (value != null) element.textContent = value;
  if (className) element.className = className;
  return element;
};
const ready = (candidate, index) => Boolean((candidate.type === 'hash' ? NGCC_HASH_WASM
  : candidate.type === 'kex' ? NGCC_KEX_WASM : NGCC_WASM)[candidate.id]?.[index]);

function hashPage(candidates) {
  const hashes = candidates.filter(candidate => candidate.type === 'hash');
  let current = hashes[0];
  let active = null, timer = null;
  const stop = () => {
    active?.terminate(); active = null;
    if (timer) clearTimeout(timer);
    timer = null; $('hash-run').disabled = false;
  };
  const render = () => {
    $('hash-name').textContent = current.name;
    $('hash-id').textContent = current.id;
    $('hash-variant').replaceChildren(...current.parameters.map((parameter, index) =>
      new Option(parameter.label, String(index))));
    $('hash-team').textContent = current.team.join('、');
    $('hash-official').href = current.page;
    $('hash-archive').href = current.archive;
    const reports = NGCC_REPORTS[current.id] || [];
    $('hash-report').textContent = reports.length
      ? `已整理 ${reports.length} 条发现；可在密钥与签名页的报告区查看，并核对原文。`
      : '本站尚未整理此候选的中文安全报告；请以 ngcc.dev 的最新报告索引为准。';
    renderParameter();
    renderList();
  };
  const renderParameter = () => {
    stop();
    const parameter = current.parameters[Number($('hash-variant').value)];
    if (!parameter) return;
    const module = NGCC_HASH_WASM[current.id]?.[Number($('hash-variant').value)];
    $('hash-workbench').classList.toggle('hidden', !module);
    $('hash-notice').textContent = module
      ? '该参数已从提交参考源码编译为浏览器 WASM，并通过原生测试向量与 WASM 运行检查；在下方输入消息可本地计算摘要。测试通过不等于安全认证。'
      : '当前发布版本尚未接入该参数的浏览器 WASM。下方仅展示官方资料，不会用其他哈希函数冒充计算结果。';
    $('hash-status').textContent = '等待输入';
    $('hash-digest').textContent = '等待计算';
    $('hash-source').textContent = parameter.source;
    $('hash-facts').replaceChildren(...Object.entries(parameter.sizes).map(([key, value]) => {
      const box = node('div'), label = node('dt', SIZES[key] || key);
      const suffix = key === 'DigestBits' ? 'bit' : key === 'Passes' ? '轮' : 'B';
      box.append(label, node('dd', `${value.toLocaleString('zh-CN')} ${suffix}`));
      return box;
    }));
  };
  const renderList = () => {
    const query = $('hash-search').value.trim().toLocaleLowerCase();
    $('hash-list').replaceChildren(...hashes.filter(candidate =>
      `${candidate.id} ${candidate.name}`.toLocaleLowerCase().includes(query)).map(candidate => {
      const button = node('button', `${candidate.name} (${candidate.id})`);
      button.type = 'button';
      if (candidate === current) button.setAttribute('aria-current', 'true');
      button.append(node('small', `${candidate.parameters.length} 组参数 · ${candidate.team.length} 位成员`));
      button.addEventListener('click', () => { current = candidate; render(); });
      return button;
    }));
  };
  $('hash-search').addEventListener('input', renderList);
  $('hash-variant').addEventListener('change', renderParameter);
  $('hash-run').addEventListener('click', () => {
    stop();
    const bytes = new TextEncoder().encode($('hash-message').value);
    if (bytes.length > 1048576) {
      $('hash-status').textContent = '消息不得超过 1 MiB'; return;
    }
    const index = Number($('hash-variant').value);
    $('hash-run').disabled = true;
    $('hash-status').textContent = '正在计算…';
    $('hash-digest').textContent = '计算中';
    const worker = new Worker('./hash-worker.js', { type: 'module' });
    active = worker;
    timer = setTimeout(() => {
      if (active !== worker) return;
      stop(); $('hash-status').textContent = '该实现运行超过 30 秒，已停止';
      $('hash-digest').textContent = '未生成摘要';
    }, 30000);
    worker.onmessage = ({ data }) => {
      if (active !== worker) return;
      stop();
      $('hash-status').textContent = data.error || `完成 · ${data.bytes} B · ${data.ms.toFixed(2)} ms`;
      $('hash-digest').textContent = data.error ? '未生成摘要' : data.digest;
    };
    worker.onerror = () => {
      if (active !== worker) return;
      stop(); $('hash-status').textContent = 'WASM 加载或执行失败';
      $('hash-digest').textContent = '未生成摘要';
    };
    worker.postMessage({ id: current.id, index, message: bytes }, [bytes.buffer]);
  });
  render();
}

const cell = (row, value, kind) => {
  const td = node('td'); td.append(node(kind || 'span', value)); row.append(td); return td;
};
const csv = value => `"${String(value).replaceAll('"', '""')}"`;
function auditPage(candidates, build) {
  const entries = candidates.flatMap(candidate => candidate.parameters.map((parameter, index) =>
    ({ candidate, parameter, index, state: ready(candidate, index) ? 'ready' : 'pending',
      buildStatus: build?.results?.[candidate.id]?.[index]?.status || 'not_attempted' })));
  const verified = entries.filter(entry => entry.state === 'ready');
  const counts = entries.filter(entry => entry.state !== 'ready').reduce((groups, entry) => {
    (groups[entry.buildStatus] ||= []).push(entry); return groups;
  }, {});
  const breakdown = build ? Object.entries(counts).map(([status, rows]) =>
    `${BUILD_LABELS[status] || status} ${rows.length} 组`).join('；') : '';
  $('audit-summary').textContent = `当前发布版本已接入 ${new Set(verified.map(entry => entry.candidate.id)).size} 个候选的 ${verified.length} 组参数。${breakdown || '其余条目等待逐参数构建记录。'}`;
  if (build?.run_url && !build.run_url.endsWith('/0')) {
    $('audit-build-link').href = build.run_url;
    $('audit-build-link').classList.remove('hidden');
  }
  let visible = entries;
  const update = () => {
    const query = $('audit-query').value.trim().toLocaleLowerCase();
    const type = $('audit-type').value, state = $('audit-state').value;
    visible = entries.filter(({ candidate, parameter, state: actual, buildStatus }) =>
      (!type || candidate.type === type) && (!state || actual === state) &&
      `${candidate.id} ${candidate.name} ${parameter.label} ${candidate.team.join(' ')} ${BUILD_LABELS[buildStatus] || buildStatus}`
        .toLocaleLowerCase().includes(query));
    $('audit-count').textContent = `显示 ${visible.length} / ${entries.length} 组参数`;
    $('audit-rows').replaceChildren(...visible.map(({ candidate, parameter, state: actual, buildStatus }) => {
      const tr = node('tr');
      cell(tr, `${candidate.id} · ${candidate.name}`);
      cell(tr, parameter.label);
      cell(tr, candidate.team.join('、'));
      cell(tr, parameter.source, 'code');
      cell(tr, actual === 'ready' ? '● 已接入' : `○ ${BUILD_LABELS[buildStatus] || '未接入'}`)
        .classList.toggle('audit-ready', actual === 'ready');
      const links = node('td');
      for (const [label, href] of [['官方资料', candidate.page], ['源码', candidate.archive]]) {
        const link = node('a', label);
        link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        links.append(link, document.createTextNode('  '));
      }
      tr.append(links);
      return tr;
    }));
  };
  for (const id of ['audit-query', 'audit-type', 'audit-state']) {
    $(id).addEventListener(id === 'audit-query' ? 'input' : 'change', update);
  }
  $('audit-export').addEventListener('click', () => {
    const headings = ['候选编号', '类别', '算法', '参数', '团队成员', '参考实现目录', '本站接入', '构建结果', '官方页面', '提交源码包'];
    const rows = visible.map(({ candidate, parameter, state, buildStatus }) =>
      [candidate.id, TYPES[candidate.type], candidate.name, parameter.label,
        candidate.team.join('、'), parameter.source, state === 'ready' ? '已接入' : '未接入',
        BUILD_LABELS[buildStatus] || buildStatus, candidate.page, candidate.archive]);
    const blob = new Blob(['\uFEFF', [headings, ...rows].map(row => row.map(csv).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = node('a');
    link.href = url; link.download = 'ngcc-2026-参数接入记录.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
}

try {
  const response = await fetch('./ngcc-catalog.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const catalog = await response.json();
  if (catalog.candidates?.length !== 119) throw new Error('候选数量与已核对快照不符');
  if (document.body.dataset.page === 'hash') hashPage(catalog.candidates);
  else {
    const build = await fetch('./ngcc-build-status.json').then(response =>
      response.ok ? response.json() : null).catch(() => null);
    auditPage(catalog.candidates, build);
  }
} catch (error) {
  const target = document.body.dataset.page === 'hash' ? $('hash-name') : $('audit-count');
  target.textContent = `目录加载失败：${error.message}`;
}
