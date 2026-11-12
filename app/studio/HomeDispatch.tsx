import Link from "next/link";
import { newsStoryHref } from "../news/navigation";
import StoryImage from "../news/StoryImage";
import { categoryLabels, coreCategories, formatEditionDate, getFeaturedNews } from "../news/news-api";

export default async function HomeDispatch() {
  let edition: Awaited<ReturnType<typeof getFeaturedNews>> | null = null;
  try {
    edition = await getFeaturedNews(coreCategories.length, AbortSignal.timeout(2500));
  } catch {
    // The rest of the homepage remains usable when the news service is unavailable.
  }
  const items = edition?.data.slice(0, coreCategories.length) || [];
  if (!items.length) return <div className="mk-dispatch-empty"><p>暂时无法读取最新简报，请稍后重试。</p><Link className="milk-link" href="/news">前往新闻页</Link></div>;
  const [lead, ...rest] = items;
  return <div className="mk-dispatch">
    <p className="mk-dispatch-date"><span>最新一期</span><time dateTime={edition?.edition_date || undefined}>{edition?.edition_date ? formatEditionDate(edition.edition_date) : "前沿技术简报"}</time><span>本页精选 {items.length} 条</span></p>
    <article className="mk-lead">
      <Link href={newsStoryHref(lead.slug, "/news")}>
        <div className="mk-lead-image"><StoryImage item={lead} eager /></div>
        <p className="mk-story-meta">{categoryLabels[lead.category] || lead.category} · {lead.source_name || "原始来源"}</p>
        <h3>{lead.title}</h3>
        <p className="mk-lead-summary">{lead.summary}</p>
      </Link>
    </article>
    {rest.length > 0 && <ol className="mk-stories">{rest.map(item => <li key={item.slug}>
      <Link href={newsStoryHref(item.slug, "/news")}>
        <p className="mk-story-meta">{categoryLabels[item.category] || item.category} · {item.source_name || "原始来源"}</p>
        <h3>{item.title}</h3>
      </Link>
    </li>)}</ol>}
  </div>;
}
