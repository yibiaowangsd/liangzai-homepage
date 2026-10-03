import Link from "next/link";
import { newsStoryHref } from "../news/navigation";
import StoryImage from "../news/StoryImage";
import { categoryLabels, formatEditionDate, getFeaturedNews } from "../news/news-api";

export default async function HomeDispatch() {
  let edition: Awaited<ReturnType<typeof getFeaturedNews>> | null = null;
  try {
    edition = await getFeaturedNews(3, AbortSignal.timeout(2500));
  } catch {
    // Reading the rest of the homepage must not depend on the news service.
  }
  const [lead, ...rest] = edition?.data.slice(0, 3) || [];
  if (!lead || !edition) return <div className="portal-dispatch-empty"><span>THE DAILY SIGNAL</span><p>每天五个方向，<br />连接技术与现实。</p><Link href="/news">打开前沿新闻</Link></div>;
  return <div className="portal-dispatch" data-reveal>
    <div className="portal-dispatch-date"><span>最新一期</span><time>{edition.edition_date ? formatEditionDate(edition.edition_date) : "前沿技术简报"}</time></div>
    <Link href={newsStoryHref(lead.slug, "/news")} className="portal-dispatch-lead"><div className="portal-dispatch-image"><StoryImage item={lead} /></div><span>{categoryLabels[lead.category] || lead.category} / {lead.source_name || "原始来源"}</span><h3>{lead.title}</h3><p>{lead.summary}</p></Link>
    <div className="portal-dispatch-briefs">{rest.map((item, i) => <Link href={newsStoryHref(item.slug, "/news")} key={item.slug}><span>0{i + 2}</span><h4>{item.title}</h4></Link>)}</div>
  </div>;
}
