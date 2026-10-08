import fallbackSignals from "../site/home-signals.json";
import Link from "next/link";
import { newsStoryHref } from "../news/navigation";
import { categoryLabels, formatEditionDate, formatNewsDate, getFeaturedNews } from "../news/news-api";
import { selectHomeSignals, signalSummary } from "../site/home-signals";

export default async function HomeDispatch() {
  let edition: Awaited<ReturnType<typeof getFeaturedNews>> = fallbackSignals;
  let snapshot = false;
  try {
    edition = await getFeaturedNews(5, AbortSignal.timeout(800));
    if (!edition || !selectHomeSignals(edition.data).length) throw new Error("Empty briefing");
  } catch {
    edition = fallbackSignals; // The dated build snapshot keeps first content useful during an upstream outage.
    snapshot = true;
  }
  const items = selectHomeSignals(edition.data);
  return <div className="portal-dispatch">
    <div className="portal-dispatch-date"><span>{snapshot ? "最新接口暂不可用 · 显示构建快照" : "简报更新于"}</span><time dateTime={edition.edition_date || undefined}>{edition.edition_date ? formatEditionDate(edition.edition_date) : "日期待确认"}</time><p>AI 辅助选编，按主题汇集一手来源。下方为本站收录时间，原文日期见详情。</p></div>
    <div className="portal-signal-grid">{items.map(item => <article key={item.slug} className="portal-signal-card">
      <span className="portal-signal-category">{categoryLabels[item.category] || item.category}</span>
      <h3><Link href={newsStoryHref(item.slug, "/news")}>{item.title}</Link></h3>
      <p className="portal-signal-summary">{signalSummary(item.summary)}</p>
      <p className="portal-signal-meta"><span>{item.source_url && /^https?:\/\//.test(item.source_url) ? <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_name || "原始来源"} ↗</a> : item.source_name || "原始来源"}</span><time dateTime={item.published_at}>收录 {formatNewsDate(item.published_at)}</time></p>
    </article>)}</div>
  </div>;
}
