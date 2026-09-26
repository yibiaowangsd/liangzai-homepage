import { NGCC_WASM } from './ngcc-runtime.js';
import { NGCC_HASH_WASM } from './ngcc-hash-runtime.js';
import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';

const $ = id => document.getElementById(id);
const TYPES = { kem: '密钥封装', sig: '数字签名', kex: '密钥交换', hash: '哈希算法' };
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

const cell = (row, value, kind) => {
  const td = node('td'); td.append(node(kind || 'span', value)); row.append(td); return td;
};
const csv = value => `"${String(value).replaceAll('"', '""')}"`;
function auditPage(candidates, build) {
  const entries = candidates.flatMap(candidate => candidate.parameters.map((parameter, index) =>
    ({ candidate, parameter, index, state: ready(candidate, index) ? 'ready' : 'pending',
      buildRecord: build?.results?.[candidate.id]?.[index] || {},
      buildStatus: build?.results?.[candidate.id]?.[index]?.status || 'not_attempted' })));
  const verified = entries.filter(entry => entry.state === 'ready');
  const counts = entries.filter(entry => entry.state !== 'ready').reduce((groups, entry) => {
    (groups[entry.buildStatus] ||= []).push(entry); return groups;
  }, {});
  const breakdown = build ? Object.entries(counts).map(([status, rows]) =>
    `${BUILD_LABELS[status] || status} ${rows.length} 组`).join('；') : '';
  $('audit-summary').textContent = `当前发布版本已接入 ${new Set(verified.map(entry => entry.candidate.id)).size} 个候选的 ${verified.length} 组参数。${breakdown || '其余条目等待逐参数构建记录。'}`;
  const availability = candidates.map(candidate => {
    const rows = entries.filter(entry => entry.candidate.id === candidate.id);
    return { candidate, total: rows.length, working: rows.filter(entry => entry.state === 'ready').length,
      reasons: [...new Set(rows.filter(entry => entry.state !== 'ready').map(entry => BUILD_LABELS[entry.buildStatus] || entry.buildStatus))] };
  });
  const missing = availability.filter(item => item.working === 0);
  const partial = availability.filter(item => item.working > 0 && item.working < item.total);
  $('availability-intro').textContent = `完全无法运行 ${missing.length} 个候选；另有 ${partial.length} 个候选仅部分参数可运行。未接入 ${entries.length - verified.length} / ${entries.length} 组参数；逐项原因见下表。`;
  $('availability-groups').replaceChildren(...Object.entries(TYPES).map(([type, label]) => {
    const group = node('details', null, 'availability-group');
    const affected = availability.filter(item => item.candidate.type === type && item.working < item.total);
    group.append(node('summary', `${label} · 完全未接入 ${affected.filter(item => !item.working).length}，部分接入 ${affected.filter(item => item.working).length}`));
    const list = node('div', null, 'availability-list');
    for (const item of affected) {
      const button = node('button', `${item.candidate.id} · ${item.candidate.name} · ${item.working}/${item.total} 组可运行`, 'availability-item');
      button.type = 'button';
      button.title = `缺失原因：${item.reasons.join('、')}`;
      button.addEventListener('click', () => {
        $('audit-query').value = item.candidate.id;
        $('audit-state').value = 'pending';
        update();
        $('audit-rows').scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      list.append(button);
    }
    group.append(list); return group;
  }));
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
    $('audit-rows').replaceChildren(...visible.map(({ candidate, parameter, state: actual, buildStatus, buildRecord }) => {
      const tr = node('tr');
      cell(tr, `${candidate.id} · ${candidate.name}`);
      cell(tr, parameter.label);
      cell(tr, candidate.team.join('、'));
      cell(tr, parameter.source, 'code');
      cell(tr, actual === 'ready' && buildRecord.validation === 'official_kat_native_wasm'
        ? '● 已接入 · 官方 KAT / 原生与 WASM 对照'
        : actual === 'ready' ? '● 已接入' : `○ ${BUILD_LABELS[buildStatus] || '未接入'}`)
        .classList.toggle('audit-ready', actual === 'ready');
      const links = node('td');
      for (const [label, href] of [['官方资料', candidate.page], ['源码', buildRecord.source_url || candidate.archive]]) {
        const link = node('a', label);
        link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        links.append(link, document.createTextNode('  '));
      }
      if (buildRecord.source_sha256) links.append(node('code', `SHA-256 ${buildRecord.source_sha256}`));
      tr.append(links);
      return tr;
    }));
  };
  for (const id of ['audit-query', 'audit-type', 'audit-state']) {
    $(id).addEventListener(id === 'audit-query' ? 'input' : 'change', update);
  }
  $('audit-export').addEventListener('click', () => {
    const headings = ['候选编号', '类别', '算法', '参数', '团队成员', '参考实现目录', '本站接入', '构建结果', '官方页面', '提交源码包', '源码SHA256'];
    const rows = visible.map(({ candidate, parameter, state, buildStatus, buildRecord }) =>
      [candidate.id, TYPES[candidate.type], candidate.name, parameter.label,
        candidate.team.join('、'), parameter.source, state === 'ready' ? '已接入' : '未接入',
        BUILD_LABELS[buildStatus] || buildStatus, candidate.page,
        buildRecord.source_url || candidate.archive, buildRecord.source_sha256 || '']);
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
  const build = await fetch('./ngcc-build-status.json').then(response =>
    response.ok ? response.json() : null).catch(() => null);
  auditPage(catalog.candidates, build);
} catch (error) {
  $('audit-count').textContent = `目录加载失败：${error.message}`;
}
