import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const candidates = (await read('public/pqc-practice/ngcc-catalog.json')).candidates;
const index = await read('public/pqc-practice/ngcc-report-index.json');
const kinds = { kem: '密钥封装', sig: '数字签名', kex: '密钥交换', hash: '哈希' };
const levels = { Critical: '严重', High: '高', Medium: '中', Low: '低', Info: '提示' };
const states = { Confirmed: '已确认', Probable: '缺陷已确认，攻击待推导',
  Lead: '线索待验证', 'Proof gap': '证明不足，非攻击' };
const count = (rows, key, labels) => Object.keys(labels).map(value => {
  const n = rows.filter(row => row[key] === value).length;
  return n ? `${labels[value]} ${n}` : null;
}).filter(Boolean).join('、') || '—';
const active = index.findings.filter(item => item.status !== 'Withdrawn');
if (candidates.length !== 119 || active.length !== index.active_findings ||
    new Set(active.map(item => item.candidateId)).size !== index.reported_candidates)
  throw new Error('目录与安全报告数量不匹配');
const lines = [
  '# PQC 武器实战：征集候选安全报告索引',
  '',
  `来源：[ngcc.dev 报告索引](${index.source})；原站更新：${index.source_updated_utc} UTC。本站记录 ${index.reported_candidates} 份候选报告、${index.active_findings} 项有效发现和 ${index.withdrawn_records} 条撤回记录。`,
  '',
  '此表只整理原站已发布的报告索引与证据状态，不能用发现数量比较不同算法的安全性。无报告不表示已通过评估；“证明不足”本身不等于攻击。问题针对归档提交版本，本站浏览器构建可能不同。逐项证据与复现步骤请进入原报告核对。',
];
for (const [type, label] of Object.entries(kinds)) {
  lines.push('', `## ${label}`, '', '| 候选 | 有效发现 | 严重程度 | 证据状态 | 报告 |',
    '| --- | ---: | --- | --- | --- |');
  for (const candidate of candidates.filter(item => item.type === type)) {
    const rows = active.filter(item => item.candidateId === candidate.id);
    const withdrawn = index.findings.filter(item => item.candidateId === candidate.id && item.status === 'Withdrawn');
    const href = rows.length ? `[报告全文](https://ngcc.dev/reports/${candidate.id}.html)` : '原站未列报告';
    lines.push(`| ${candidate.id} · ${candidate.name.replaceAll('|', '\\|')} | ${rows.length}${withdrawn.length ? `（另有 ${withdrawn.length} 条撤回）` : ''} | ${count(rows, 'severity', levels)} | ${count(rows, 'status', states)} | ${href} |`);
  }
}
lines.push('', '本站实战页按所选候选逐项显示编号、状态、更新日期与报告链接；其中 8 个候选的 15 项发现另附中文证据、影响边界和修复方向。', '');
await writeFile(resolve(root, 'docs/pqc-security-index.md'), lines.join('\n'));
console.log(`${candidates.length} candidates, ${active.length} active findings, ${index.withdrawn_records} withdrawn`);
