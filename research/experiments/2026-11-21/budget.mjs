/** Arithmetic on published lengths only: no RF I/O, packets, or protocol implementation. */
import { pathToFileURL } from 'node:url';

export const radiotap = [26, 13];
export const rows = [
  { mode: 'OWE', captured: [223, 206], kem: [0, 0] },
  { mode: 'ML-KEM-512', captured: [1033, 984], kem: [800, 768] },
  { mode: 'ML-KEM-768', captured: [1419, 1306], kem: [1184, 1088] },
  { mode: 'ML-KEM-1024', captured: [1807, 1790], kem: [1568, 1568] },
];
export function budget(row, ceiling = 1500, rates = [1, 6, 24]) {
  const mac = row.captured.map((number, i) => number - radiotap[i]);
  const delta = row.captured.reduce((sum, number, i) => sum + number - rows[0].captured[i], 0);
  const headroom = mac.map(number => ceiling - number);
  const elementOverhead = delta - row.kem.reduce((sum, number) => sum + number, 0);
  const airtimeMs = rates.map(rate => delta * 8 / (rate * 1000));
  return { mode: row.mode, mac, delta, headroom, elementOverhead, airtimeMs };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify({ limit: 1500, ratesMbps: [1, 6, 24], results: rows.map(row => budget(row)) }, null, 2));
