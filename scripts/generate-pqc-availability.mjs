import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NGCC_WASM } from '../public/pqc-practice/ngcc-runtime.js';
import { NGCC_KEX_WASM } from '../public/pqc-practice/ngcc-kex-runtime.js';
import { NGCC_HASH_WASM } from '../public/pqc-practice/ngcc-hash-runtime.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const catalog = (await read('public/pqc-practice/ngcc-catalog.json')).candidates;
const build = await read('public/pqc-practice/ngcc-build-status.json');
const mapping = { kem: NGCC_WASM, sig: NGCC_WASM, kex: NGCC_KEX_WASM, hash: NGCC_HASH_WASM };
const types = { kem: '密钥封装', sig: '数字签名', kex: '密钥交换', hash: '哈希' };
const reasons = { source_not_in_snapshot: '本快照未收录源码', compile_failed: '编译失败',
  runtime_failed: 'WASM 运行失败', native_failed: '原生测试失败', native_timeout: '原生测试超时',
  timeout: '编译或运行超时' };
const results = [];
for (const candidate of catalog) {
  const parameters = [];
  for (const [index, parameter] of candidate.parameters.entries()) {
    const moduleName = mapping[candidate.type][candidate.id]?.[index];
    if (moduleName) {
      await access(resolve(root, 'public/pqc-practice/wasm', `${moduleName}.mjs`));
      await access(resolve(root, 'public/pqc-practice/wasm', `${moduleName}.wasm`));
    }
    parameters.push({ label: parameter.label, ready: Boolean(moduleName),
      reason: build.results[candidate.id]?.[index]?.status || 'not_attempted' });
  }
  results.push({ candidate, parameters, ready: parameters.filter(item => item.ready).length });
}
const all = results.reduce((sum, row) => sum + row.parameters.length, 0);
const ready = results.reduce((sum, row) => sum + row.ready, 0);
const none = results.filter(row => row.ready === 0);
const partial = results.filter(row => row.ready > 0 && row.ready < row.parameters.length);
const missing = results.filter(row => row.ready < row.parameters.length);
const counts = {};
for (const row of missing) for (const item of row.parameters) if (!item.ready)
  counts[item.reason] = (counts[item.reason] || 0) + 1;
const lines = [
  '# PQC 武器实战：暂不可运行的算法与参数',
  '',
  `目录快照：${build.source_revision}。此表根据当前仓库的运行映射、已收录的 JS/WASM 文件和逐参数构建记录生成。运行 \`node scripts/generate-pqc-availability.mjs\` 可重新核对。`,
  '',
  `119 个国内征集候选、${all} 组参数中，${ready} 组已接入，${all - ready} 组未接入；${none.length} 个候选完全无法运行，${partial.length} 个候选仅部分参数能运行。`,
  '',
  '未接入原因（组数）：' + Object.entries(counts).map(([reason, count]) =>
    `${reasons[reason] || reason} ${count}`).join('；') + '。',
  '',
  '“本快照未收录源码”只表示固定的 ngcc-harness 快照没有对应实现目录，不代表官方未公开源码。功能测试通过也不等于安全认证。',
];
for (const type of Object.keys(types)) {
  const rows = missing.filter(row => row.candidate.type === type);
  lines.push('', `## ${types[type]}`, '',
    '| 编号与候选 | 可运行参数 | 尚不可运行的参数 | 原因（组数） |',
    '| --- | ---: | --- | --- |');
  for (const { candidate, parameters, ready: count } of rows) {
    const unavailable = parameters.filter(item => !item.ready);
    const byReason = {};
    for (const item of unavailable) byReason[item.reason] = (byReason[item.reason] || 0) + 1;
    lines.push(`| ${candidate.id} · ${candidate.name.replaceAll('|', '\\|')} | ${count}/${parameters.length} | ${unavailable.map(item => item.label.replaceAll('|', '\\|')).join('、')} | ${Object.entries(byReason).map(([reason, n]) => `${reasons[reason] || reason} ${n}`).join('；')} |`);
  }
}
lines.push('', '逐项构建状态、源码与团队成员可在 [网站接入记录](../public/pqc-practice/audit.html) 中筛选与导出。', '');
await writeFile(resolve(root, 'docs/pqc-unavailable.md'), lines.join('\n'));
console.log(`${none.length} 完全未接入，${partial.length} 部分接入，${all - ready} 参数未接入`);
