"use client";
import { useEffect, useRef, useState } from "react";
import { readArchive, type LifeArchive, type Episode } from "./archive";

const assertion: Record<string, string> = { RECORDED: "已记录", CONFIRMED: "本人确认", INFERRED: "推测", PLANNED: "计划", UNKNOWN: "待确认" };
const sourceNames: Record<string, string> = { SENSOR: "传感器", PHOTO: "照片", MEDIA: "相册", USAGE: "应用使用", LOCATION: "位置", CALENDAR: "日历", HEALTH: "健康来源", NOTIFICATION: "通知" };
const formatTime = (ms: number, timeZone: string) => new Intl.DateTimeFormat('zh-CN', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
const formatSnapshot = (ms: number, timeZone: string) => new Intl.DateTimeFormat('zh-CN', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(ms);

export default function LifeReview() {
  const [archive, setArchive] = useState<LifeArchive | null>(null);
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Episode | null>(null);
  const [range, setRange] = useState(7);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const clearOnLeave = () => { request.current++; controller.current?.abort(); setArchive(null); setSelected(null); setQuery(""); setDate(""); setStatus(""); setLoading(false); };
    const returned = (event: PageTransitionEvent) => { if (event.persisted) clearOnLeave(); };
    window.addEventListener('pagehide', clearOnLeave);
    window.addEventListener('pageshow', returned);
    return () => { controller.current?.abort(); window.removeEventListener('pagehide', clearOnLeave); window.removeEventListener('pageshow', returned); };
  }, []);
  function clear() {
    request.current++; controller.current?.abort(); setArchive(null); setSelected(null); setQuery(""); setDate(""); setStatus("本页记录已清空。"); setLoading(false);
  }
  async function choose(files: FileList | null) {
    if (!files?.length) return;
    const current = ++request.current;
    controller.current?.abort(); controller.current = new AbortController();
    setArchive(null); setSelected(null); setDate(""); setQuery(""); setLoading(true); setStatus("正在读取并校验所选文件…");
    try {
      const value = await readArchive(Array.from(files, file => ({ path: file.webkitRelativePath || file.name, size: file.size, text: () => file.text() })), {
        signal: controller.current.signal,
        onProgress: (done, total) => { if (current === request.current) setStatus(`正在校验日期 ${done} / ${total}`); },
      });
      if (current !== request.current) return;
      setArchive(value); setDate(value.days[0]?.date || "");
      setStatus(`已载入 ${value.days.length} 天${value.memory ? "及已有记忆" : ""}。${value.warnings.length ? `有 ${value.warnings.length} 项文件或覆盖提示。` : ""}`);
    } catch (error) { if (current === request.current) setStatus(error instanceof Error && error.name !== 'AbortError' ? error.message : "已停止读取。"); }
    finally { if (current === request.current) setLoading(false); }
  }
  const day = archive?.days.find(item => item.date === date);
  const index = archive?.days.findIndex(item => item.date === date) ?? -1;
  const searches = query.trim() ? archive?.days.flatMap(item => item.episodes.filter(episode => `${item.date} ${episode.title} ${episode.sources.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).map(episode => ({ date: item.date, episode }))) || [] : [];
  const compare = archive?.days.slice(0, range) || [];
  const keys = [...new Map(compare.flatMap(item => item.metrics).map(metric => [metric.key, metric])).values()].slice(0, 3);
  const memory = archive?.memory;
  return <>
    <section className="wo-import" aria-label="选择自己的记录"><div><h2>从自己的记录开始</h2><p>选择导出并解压的 <code>wo</code> 文件夹，或单独选择日记录 JSON。文件仅在本页内存读取，关闭或离开页面后清空。</p></div><div className="wo-import-actions"><label className="wo-file-button">选择记录文件夹<input type="file" multiple disabled={loading} {...{ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>} onChange={event => { void choose(event.target.files); event.target.value = ""; }} /></label><label className="wo-file-button secondary">选择 JSON 文件<input type="file" multiple accept=".json,application/json" disabled={loading} onChange={event => { void choose(event.target.files); event.target.value = ""; }} /></label>{(archive || loading) && <button type="button" onClick={clear}>{loading ? "停止读取" : "清空本页记录"}</button>}</div></section>
    <p className="wo-status" role="status" aria-live="polite">{status || "无需登录，也不需要填写 GitHub 令牌或 AI 密钥。"}</p>
    {!archive && <section className="wo-empty"><p className="wo-eyebrow">让今天成为回忆</p><h2>在更大的屏幕上，<br />回看自己的时间</h2><p>按天浏览生活片段，比较多日记录，查看已有回顾及其依据日期。<br />这里不会自动访问你的手机或私有仓库。</p><details><summary>如何准备文件？</summary><p>「我」App 开启数据互通后，可从自己的私有数据仓库下载同一提交的归档并解压，选择其中的 wo 文件夹。完整文件夹包含索引、日期文件、可能存在的分片和记忆。</p><p>单独选择日文件也能阅读，但不能验证归档是否完整。同步文件不包含照片原图，本页不会补造缺失的照片或活动。</p><a href="https://github.com/yibiaowangsd/myapp/blob/main/docs/ChatGPT_Data_Link.md" target="_blank" rel="noreferrer">查看 App 数据互通说明</a></details></section>}
    {archive && <>
      {archive.warnings.length > 0 && <details className="wo-warnings" open><summary>文件与覆盖提示（{archive.warnings.length}）</summary><ul>{archive.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
      {archive.pendingDates.length > 0 && <p className="wo-warning">待更新日期：{archive.pendingDates.join('、')}。这些日期可能仍是旧快照，不能按最新状态理解。</p>}
      <div className="wo-toolbar"><div className="wo-date-nav"><button type="button" aria-label="较早的记录日" disabled={!archive.days[index + 1]} onClick={() => { setDate(archive.days[index + 1].date); setSelected(null); }}>较早一天</button><label>回顾日期<select value={date} onChange={event => { setDate(event.target.value); setSelected(null); }}>{archive.days.map(item => <option value={item.date} key={item.date}>{item.date}</option>)}</select></label><button type="button" aria-label="较新的记录日" disabled={index <= 0} onClick={() => { setDate(archive.days[index - 1].date); setSelected(null); }}>较新一天</button></div><label className="wo-search">搜索所有已载入日期<input type="search" placeholder="日期、片段或来源" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      {query.trim() && <section className="wo-search-results"><h2>跨日搜索 · {searches.length} 项片段</h2>{searches.slice(0, 100).map(({ date: foundDate, episode }) => <button type="button" key={foundDate + episode.id} onClick={() => { setDate(foundDate); setSelected(episode); setQuery(""); }}><time>{foundDate}</time><strong>{episode.title}</strong><span>{assertion[episode.assertion] || "待确认"}</span></button>)}{!searches.length && <p>当前文件中没有匹配片段。没有记录不代表没有活动。</p>}{searches.length > 100 && <p>显示前100项，请增加关键词缩小范围。</p>}</section>}
      {day && <><section className="wo-day-heading"><div><p className="wo-eyebrow">{day.date} · {day.timeZone}</p><h2>{day.headline || "这一天的片段"}</h2>{day.summary.map((line, i) => <p key={i}>{line}</p>)}</div><div className="wo-snapshot"><span>{day.verified ? "已核对索引哈希" : "单日文件 · 未经索引校验"}</span><span>记录快照：{formatSnapshot(day.asOfMs, day.timeZone)}</span>{day.pending && <strong>待更新的历史快照</strong>}</div></section>
      <div className="wo-metrics">{day.metrics.map(metric => <div key={metric.key}><span>{metric.label}</span><strong>{metric.value === null ? "未知" : metric.value.toLocaleString('zh-CN')}<small>{metric.value === null ? "" : metric.unit}</small></strong></div>)}</div>
      <section className="wo-timeline-section" aria-labelledby="wo-film-title"><div className="wo-section-heading"><h2 id="wo-film-title">生活片段</h2><p>左右滚动回看，点击片段查看来源。键盘聚焦后可用方向键滚动。</p></div><div className="wo-film" role="region" aria-label={`${day.date} 生活时间轴`} tabIndex={0}>{day.episodes.map((episode, i) => <button className={`wo-event ${i % 2 ? "below" : "above"}`} key={episode.id} type="button" onClick={() => setSelected(episode)} aria-pressed={selected?.id === episode.id}><time>{formatTime(episode.startMs, day.timeZone)} — {formatTime(episode.endMs, day.timeZone)}</time><strong>{episode.title}</strong><span>{assertion[episode.assertion] || "待确认"}{episode.favorite ? " · 已收藏" : ""}</span><small>{Math.max(0, Math.round((episode.endMs - episode.startMs) / 60000))} 分钟</small></button>)}{!day.episodes.length && <p className="wo-no-events">当前文件没有生活片段。请结合来源覆盖情况理解，不代表当天没有活动。</p>}</div></section>
      {selected && <section className="wo-detail" aria-label="片段详情"><div><h2>{selected.title}</h2><button type="button" onClick={() => setSelected(null)}>关闭详情</button></div><p>{formatTime(selected.startMs, day.timeZone)} — {formatTime(selected.endMs, day.timeZone)} · {assertion[selected.assertion] || "待确认"}</p><p>来源：{selected.sources.map(source => sourceNames[source] || source).join('、') || "未注明"}</p>{selected.qualityFlags.length > 0 && <p>质量标记：{selected.qualityFlags.join('、')}</p>}<p>本页仅呈现记录文件已有的内容，不将推测改写为确认事实。</p></section>}
      <details className="wo-coverage"><summary>当天事实与来源覆盖</summary><div>{day.facts.map(fact => <p key={fact.id}><span>{assertion[fact.assertion] || "待确认"}</span> {fact.value}</p>)}<ul>{day.coverage.map((item, i) => <li key={i}>{sourceNames[item.source] || item.source}：{item.available ? "有来源覆盖" : "缺少来源覆盖"}</li>)}</ul>{day.warnings.map((warning, i) => <p className="wo-warning" key={i}>{warning}</p>)}</div></details></>}
      <section className="wo-comparison"><div className="wo-section-heading"><h2>多日对照</h2><label>记录范围<select value={range} onChange={event => setRange(Number(event.target.value))}><option value={7}>最近7个记录日</option><option value={30}>最近30个记录日</option><option value={365}>最近365个记录日</option></select></label></div><p>缺失的指标显示为未知；记录日之间可能有未导入或未采集的日期。</p><div className="wo-table-scroll" tabIndex={0} role="region" aria-label="多日指标对照"><table><thead><tr><th scope="col">日期</th><th scope="col">片段</th>{keys.map(metric => <th scope="col" key={metric.key}>{metric.label}（{metric.unit}）</th>)}</tr></thead><tbody>{compare.map(item => <tr key={item.date}><th scope="row"><button type="button" onClick={() => { setDate(item.date); setSelected(null); }}>{item.date}</button></th><td>{item.episodes.length}</td>{keys.map(key => { const metric = item.metrics.find(value => value.key === key.key); return <td key={key.key}>{metric?.value === null || metric?.value === undefined ? "未知" : metric.value.toLocaleString('zh-CN')}</td>; })}</tr>)}</tbody></table></div></section>
      <section className="wo-memory"><div className="wo-section-heading"><h2>已有记忆与回顾</h2><span>保留原有依据日期</span></div>{!memory ? <p>本次文件没有可读取的记忆，不能据此判断手机中是否存在记忆。</p> : <><div className="wo-memory-grid"><article><h3>本人填写的偏好</h3><p className="wo-preserve">{memory.notes || "当前快照未填写偏好。"}</p></article><article><h3>已有 AI 回顾</h3>{memory.review ? <><p className="wo-preserve">{memory.review.text}</p><small>截至 {memory.review.throughDate} · {memory.review.model}</small><p>依据：{memory.review.dates.join('、')}</p></> : <p>当前快照没有回顾。</p>}</article></div><h3>历史观察 · AI 推断</h3><ul className="wo-observations">{memory.observations.map((observation, i) => <li key={i}><p>{observation.text}</p><small>依据：{observation.dates.join('、')}</small>{observation.dates.some(item => !archive.days.some(day => day.date === item)) && <small>部分依据日期未包含在本次有效文件中。</small>}</li>)}</ul>{!memory.observations.length && <p>当前快照没有历史观察。</p>}<p>观察属于已有 AI 推断，本页不生成新结论，也不会把文件自动写入 ChatGPT 账号记忆。</p></>}</section>
    </>}
  </>;
}
