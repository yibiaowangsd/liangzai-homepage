import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { validateWeeklyReport } from '../news-worker/weekly.js';

for (const path of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  if (basename(path) !== `${report.date}.json`) throw new Error('weekly date must match filename');
  validateWeeklyReport(report);
  console.log(`Validated weekly ${report.date}: ${report.items.length} events, ${report.items.filter(item => item.front_page).length} headlines`);
}
