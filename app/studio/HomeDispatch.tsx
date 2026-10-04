import Link from "next/link";
import { newsStoryHref } from "../news/navigation";
import StoryImage from "../news/StoryImage";
import { categoryLabels, formatEditionDate, getFeaturedNews } from "../news/news-api";

export default async function HomeDispatch() {
  let edition: Awaited<ReturnType<typeof getFeaturedNews>> | null = null;
  try {
    edition = await getFeaturedNews(3, AbortSignal.timeout(2500));
  } catch {
    // The rest of the homepage remains usable when the news service is unavailable.
  }
  const items = edition?.data.slice(0, 3) || [];
  if (!items.length) return <div className="portal-dispatch-empty"><p>暂时无法读取最新简报，请稍后重试。</p><Link href="/news">前往新闻页</Link></div>;
  return <div className="portal-dispatch">
    <div className="portal-dispatch-date"><span>最新一期</span><time dateTime={edition?.edition_date || undefined}>{edition?.edition_date ? formatEditionDate(edition.edition_date) : "前沿技术简报"}</time></div>
    <div className="portal-signal-grid">{items.map(item => <article key={item.slug} className="portal-signal-card">
      <Link href={newsStoryHref(item.slug, "/news")}>
        <div className="portal-dispatch-image"><StoryImage item={item} /></div>
        <p className="portal-signal-meta">{categoryLabels[item.category] || item.category} · {item.source_name || "原始来源"}</p>
        <h3>{item.title}</h3><p className="portal-signal-summary">{item.summary}</p>
      </Link>
    </article>)}</div>
  </div>;
}
