import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateWeeklyReport } from '../news-worker/weekly.js';

let files;
if (process.env.EVENT_NAME === 'workflow_dispatch') {
  files = process.env.INPUT_FILE ? [process.env.INPUT_FILE] : readdirSync('news/weekly').filter(file => file.endsWith('.json')).sort().slice(-1).map(file => `news/weekly/${file}`);
} else {
  const before = process.env.BEFORE_SHA;
  const args = before && !/^0+$/.test(before)
    ? ['diff', '--name-only', before, process.env.GITHUB_SHA, '--', 'news/weekly/*.json']
    : ['show', '--pretty=', '--name-only', process.env.GITHUB_SHA, '--', 'news/weekly/*.json'];
  files = execFileSync('git', args, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}
for (const file of files.filter(existsSync)) {
  if (!/^news\/weekly\/\d{4}-\d{2}-\d{2}\.json$/.test(file)) throw new Error('Invalid weekly report path');
  const report = JSON.parse(readFileSync(file, 'utf8'));
  if (file !== `news/weekly/${report.date}.json`) throw new Error('weekly date must match filename');
  validateWeeklyReport(report);
  if (!process.env.NEWS_ADMIN_TOKEN) throw new Error('Missing news administrator secret');
  const response = await fetch('https://api.wangyibiao.com/api/admin/news/weekly', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEWS_ADMIN_TOKEN}` },
    body: JSON.stringify(report), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error(`Weekly publication failed: HTTP ${response.status}`);
  console.log(JSON.stringify(result));
  const read = await fetch(`https://api.wangyibiao.com/api/news/weekly?date=${report.date}`, { signal: AbortSignal.timeout(30000) });
  const published = (await read.json()).data;
  if (!read.ok || JSON.stringify(published) !== JSON.stringify(report)) throw new Error('Weekly publication readback must match the complete submitted report');
  console.log(`Weekly ${report.date} readback verified; approved channels will deliver on the next cron.`);
}
if (!files.length) console.log('No weekly reports changed.');
