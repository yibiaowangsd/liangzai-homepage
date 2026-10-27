// Reader for myapp's SharedData.kt v1/v2. No network or persistent storage.
export type LocalSource = { path: string; size: number; text: () => Promise<string> };
export type Episode = { id: string; startMs: number; endMs: number; kind: string; title: string; assertion: string; favorite: boolean; sources: string[]; qualityFlags: string[] };
export type Metric = { key: string; label: string; unit: string; value: number | null };
export type DayRecord = { date: string; timeZone: string; asOfMs: number; status: string; headline: string; summary: string[]; episodes: Episode[]; facts: { id: string; type: string; value: string; assertion: string }[]; metrics: Metric[]; coverage: { source: string; available: boolean }[]; warnings: string[]; verified: boolean; pending: boolean };
export type LifeMemory = { notes: string; updatedAtMs: number; observations: { text: string; dates: string[] }[]; review: { text: string; throughDate: string; dates: string[]; model: string } | null };
export type LifeArchive = { days: DayRecord[]; memory: LifeMemory | null; warnings: string[]; pendingDates: string[]; updatedAtMs: number | null; indexed: boolean };
type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('记录必须是 JSON 对象。');
  return value as JsonRecord;
};
const array = (value: unknown): unknown[] => { if (!Array.isArray(value)) throw new Error('记录中的列表格式不正确。'); return value; };
const strings = (value: unknown): string[] => array(value).map(item => { if (typeof item !== 'string') throw new Error('文字列表格式不正确。'); return item; });
const number = (value: unknown): number => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('记录中的时间或数值格式不正确。'); return value; };
const text = (value: unknown): string => { if (typeof value !== 'string') throw new Error('文字字段格式不正确。'); return value; };
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
const hashPattern = /^[a-f0-9]{64}$/;
export async function sha256(value: string) {
  if (!globalThis.crypto?.subtle) throw new Error('完整归档校验需要 HTTPS 页面。');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function dayHash(value: JsonRecord) {
  return sha256(JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'asOfMs'))));
}
export function normalizeLocalPath(path: string): string | null {
  const parts = path.replaceAll('\\', '/').split('/');
  if (parts.some(part => part === '..' || part === '.' || part === '')) throw new Error('文件路径包含无效目录。');
  const at = parts.indexOf('wo');
  if (at >= 0) return parts.slice(at).join('/');
  if (parts.length === 1 && ['index.json', 'memory.json'].includes(parts[0])) return 'wo/' + parts[0];
  if (parts.length === 1 && /^\d{4}-\d{2}-\d{2}\.json$/.test(parts[0])) return 'wo/days/' + parts[0];
  return null;
}
export function parseDay(raw: unknown, verified = false, pending = false): DayRecord {
  const value = record(raw);
  if (value.schemaVersion !== 1 || !validDate(value.date)) throw new Error('日期或日记录版本不兼容。');
  const timeZone = text(value.timeZone);
  try { new Intl.DateTimeFormat('zh-CN', { timeZone }).format(0); } catch { throw new Error('记录的时区无效。'); }
  const episodes = array(value.episodes).map(item => {
    const row = record(item), startMs = number(row.startMs), endMs = number(row.endMs);
    if (endMs < startMs) throw new Error('片段结束时间早于开始时间。');
    return { id: text(row.id), startMs, endMs, kind: text(row.kind), title: text(row.title), assertion: text(row.assertion), favorite: row.favorite === true, sources: strings(row.sources), qualityFlags: strings(row.qualityFlags) };
  }).sort((a, b) => a.startMs - b.startMs);
  const metrics = array(value.metrics).map(item => {
    const row = record(item);
    return { key: text(row.key), label: text(row.label), unit: text(row.unit), value: row.value === null ? null : number(row.value) };
  });
  return { date: value.date, timeZone, asOfMs: number(value.asOfMs), status: text(value.status), headline: text(value.headline), summary: strings(value.summary), episodes, metrics,
    facts: array(value.facts).map(item => { const row = record(item); return { id: text(row.id), type: text(row.type), value: text(row.value), assertion: text(row.assertion) }; }),
    coverage: array(value.coverage).map(item => { const row = record(item); if (typeof row.available !== 'boolean') throw new Error('来源覆盖状态无效。'); return { source: text(row.source), available: row.available }; }),
    warnings: strings(value.warnings), verified, pending };
}
export function parseMemory(raw: unknown): LifeMemory {
  const value = record(raw);
  if (value.schemaVersion !== 1) throw new Error('记忆版本不兼容。');
  const checkedDates = (input: unknown) => { const dates = strings(input); if (!dates.every(validDate)) throw new Error('记忆依据日期无效。'); return dates; };
  const observations = array(value.observations).map(item => { const row = record(item); return { text: text(row.text), dates: checkedDates(row.dates) }; });
  let review: LifeMemory['review'] = null;
  if (value.review !== null) { const row = record(value.review); if (!validDate(row.throughDate)) throw new Error('回顾日期无效。'); review = { text: text(row.text), throughDate: row.throughDate, dates: checkedDates(row.dates), model: text(row.model) }; }
  return { notes: text(value.notes), updatedAtMs: number(value.updatedAtMs), observations, review };
}

export async function readArchive(files: LocalSource[], options: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {}): Promise<LifeArchive> {
  const sources = new Map<string, LocalSource>();
  let bytes = 0;
  for (const file of files) {
    if (!file.path.endsWith('.json')) continue;
    const path = normalizeLocalPath(file.path);
    if (!path) continue;
    if (sources.has(path)) throw new Error('选择的文件包含重复路径，请选择同一份完整快照。');
    sources.set(path, file); bytes += file.size;
  }
  if (!sources.size) throw new Error('没有找到 wo 目录或日记录 JSON。请先解压导出的文件。');
  if (bytes > 256 * 1024 * 1024) throw new Error('本次文件超过256MiB，请减少导入日期。');
  const check = () => { if (options.signal?.aborted) throw new DOMException('已停止读取', 'AbortError'); };
  async function load(path: string) {
    check();
    const source = sources.get(path);
    if (!source) throw new Error('快照缺少被引用的文件。');
    const content = await source.text(); check(); return content;
  }
  async function restore(raw: JsonRecord): Promise<JsonRecord> {
    if (!['wo-day-parts', 'wo-day-text-parts'].includes(String(raw.format))) return raw;
    if (raw.schemaVersion !== 2 || !validDate(raw.date) || typeof raw.hash !== 'string' || !hashPattern.test(raw.hash)) throw new Error('日期分片目录无效。');
    const fields = strings(raw.fields), arrays = strings(raw.arrays), parts = array(raw.parts);
    if (!parts.length || new Set(fields).size !== fields.length || new Set(arrays).size !== arrays.length || !arrays.every(key => fields.includes(key))) throw new Error('日期分片字段无效。');
    const values = new Map<string, unknown>();
    const fragments: string[] = [];
    for (const [index, item] of parts.entries()) {
      const part = record(item), expectedPath = `wo/parts/${raw.date}/${raw.hash}/${String(index).padStart(5, '0')}.json`;
      if (part.path !== expectedPath || typeof part.hash !== 'string' || !hashPattern.test(part.hash)) throw new Error('日期分片顺序或路径无效。');
      const content = await load(expectedPath);
      if (await sha256(content) !== part.hash) throw new Error('分片内容校验失败。');
      const json = record(JSON.parse(content));
      if (raw.format === 'wo-day-text-parts') { if (Object.keys(json).length !== 1) throw new Error('文字分片格式无效。'); fragments.push(text(json.text)); }
      else for (const [key, value] of Object.entries(json)) {
        if (!fields.includes(key)) throw new Error('分片包含未声明字段。');
        if (arrays.includes(key)) values.set(key, [...(values.get(key) as unknown[] || []), ...array(value)]);
        else { if (values.has(key)) throw new Error('分片重复定义同一字段。'); values.set(key, value); }
      }
    }
    if (raw.format === 'wo-day-parts' && (values.size !== fields.length || fields.some(key => !values.has(key)))) throw new Error('分片缺少字段。');
    const result = raw.format === 'wo-day-text-parts' ? record(JSON.parse(fragments.join(''))) : Object.fromEntries(fields.map(key => [key, values.get(key)]));
    if (result.date !== raw.date || result.timeZone !== raw.timeZone || result.asOfMs !== raw.asOfMs || await dayHash(result) !== raw.hash) throw new Error('重建的日记录校验失败。');
    return result;
  }
  const warnings: string[] = [], days: DayRecord[] = [];
  let memory: LifeMemory | null = null, updatedAtMs: number | null = null, pendingDates: string[] = [], archiveZone: string | null = null;
  const indexed = sources.has('wo/index.json');
  if (indexed && !globalThis.crypto?.subtle) throw new Error('完整归档校验需要 HTTPS，请从正式站点打开网页回顾。');
  let entries: { date: string; path: string; hash: string | null }[], memoryEntry: JsonRecord | null = null;
  if (indexed) {
    const index = record(JSON.parse(await load('wo/index.json')));
    if ((index.schemaVersion !== 1 && index.schemaVersion !== 2) || index.source !== 'wo-life-records') throw new Error('索引版本或来源不兼容。');
    updatedAtMs = number(index.updatedAtMs);
    const zone = text(index.archiveZone);
    archiveZone = zone;
    entries = array(index.days).map(item => { const row = record(item); if (!validDate(row.date) || row.path !== `wo/days/${row.date}.json` || typeof row.hash !== 'string' || !hashPattern.test(row.hash)) throw new Error('索引中的日期、路径或哈希无效。'); return { date: row.date, path: row.path as string, hash: row.hash }; });
    if (new Set(entries.map(item => item.date)).size !== entries.length) throw new Error('索引包含重复日期。');
    pendingDates = index.pendingDates === undefined ? [] : strings(index.pendingDates);
    if (!pendingDates.every(validDate)) throw new Error('待更新日期格式无效。');
    if (index.memory !== null && index.memory !== undefined) { memoryEntry = record(index.memory); if (memoryEntry.path !== 'wo/memory.json' || typeof memoryEntry.hash !== 'string' || !hashPattern.test(memoryEntry.hash)) throw new Error('索引中的记忆路径或哈希无效。'); }
    // Bind every indexed day to the archive's stated timezone.
    if (zone.length > 100) throw new Error('归档时区无效。');
    try { new Intl.DateTimeFormat('zh-CN', { timeZone: zone }).format(0); } catch { throw new Error('归档时区无效。'); }
  } else {
    entries = [...sources.keys()].filter(path => /^wo\/days\/\d{4}-\d{2}-\d{2}\.json$/.test(path)).map(path => ({ date: path.slice(8, 18), path, hash: null }));
    warnings.push('未选择索引：仅显示所选日文件，无法确认是否为完整、最新的归档。');
  }
  for (const [position, entry] of entries.entries()) {
    check();
    try {
      const value = await restore(record(JSON.parse(await load(entry.path))));
      if (value.date !== entry.date || (archiveZone && value.timeZone !== archiveZone) || (entry.hash && await dayHash(value) !== entry.hash)) throw new Error('日记录哈希或时区与索引不一致。');
      days.push(parseDay(value, entry.hash !== null, pendingDates.includes(entry.date)));
    } catch (error) { if (options.signal?.aborted) throw error; warnings.push(`${entry.date} 未载入：缺少文件、内容校验失败或格式不兼容。`); }
    options.onProgress?.(position + 1, entries.length);
  }
  if (memoryEntry) {
    try { const content = await load('wo/memory.json'); if (await sha256(content) !== memoryEntry.hash) throw new Error('记忆哈希校验失败。'); memory = parseMemory(JSON.parse(content)); }
    catch (error) { if (options.signal?.aborted) throw error; warnings.push('记忆未载入：文件缺失、内容校验失败或格式不兼容。'); }
  }
  if (!days.length && !memory) throw new Error('没有可读取的有效记录。请检查索引、日期文件和所有分片是否来自同一份快照。');
  return { days: days.sort((a, b) => b.date.localeCompare(a.date)), memory, warnings, pendingDates, updatedAtMs, indexed };
}
