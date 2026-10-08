import Link from "next/link";
import { pageMetadata } from "../site/metadata";
import { newsListingHref, newsStoryHref, parseNewsContext, type NewsSearchParams } from "./navigation";
import { categoryLabels, coreCategories, formatEditionDate, getNewsEditions, type NewsItem } from "./news-api";
import { primaryCategories, topicTags, matchesTag } from "./presentation";
export const metadata = pageMetadata("前沿新闻", "后量子密码、抗量子协议与标准动态：摘要、工程观察和原始来源。", "/news", "news");
function TopicDesk({ category, items, listingHref }: {category: string; items: NewsItem[]; listingHref: string}) {
  if (!items.length) return null;
  return <section className="compact-desk" id={category}><header><h2>{categoryLabels[category] || category}</h2><span>{items.length} 条</span></header>{items.map(item => <article className="compact-news-row" key={item.slug}><div><h3><Link href={newsStoryHref(item.slug, listingHref)}>{item.title}</Link></h3><p>{item.summary}</p><small>{item.source_name || "原始来源"}</small></div></article>)}</section>;
}
export default async function NewsPage({ searchParams }: { searchParams: Promise<NewsSearchParams> }) {
  const context = parseNewsContext(await searchParams);
  let payload: Awaited<ReturnType<typeof getNewsEditions>> | null = null;
  try { payload = await getNewsEditions(context.page, 1, context.category); } catch { /* Render a bounded, usable error state. */ }
  const editions = payload?.data || [];
  const meta = payload?.meta || {page: 1, totalPages: 1};
  const newest = editions[0];
  const makeHref = (page: number, category = context.category, tag = context.tag) => newsListingHref({page, category, tag});
  const listingHref = makeHref(meta.page);
  const visibleCategories = context.category ? [context.category] : [...primaryCategories];
  const extras = [...new Set([...coreCategories, ...editions.flatMap(edition => Object.keys(edition.topics))])].filter(key => !primaryCategories.includes(key as (typeof primaryCategories)[number]));
  return <main id="main-content" className="newsroom news-compact">
    <section className="news-toolbar" aria-label="前沿新闻导航"><div className="news-toolbar-title"><h1>前沿新闻</h1><p>密码、协议与标准。先看要点，再追原始来源。</p></div><details className="news-category-menu"><summary>{context.category ? categoryLabels[context.category] : "密码与协议"}</summary><nav aria-label="新闻方向"><Link href={newsListingHref({page:1,tag:context.tag})}>默认三类</Link>{coreCategories.map(key => <Link href={makeHref(1, key)} key={key} aria-current={context.category===key ? "page" : undefined}>{categoryLabels[key]}</Link>)}</nav></details></section>
    <nav className="news-tags" aria-label="标签筛选"><Link href={newsListingHref({page:context.page,category:context.category})} aria-current={!context.tag ? "page" : undefined}>全部标签</Link>{topicTags.map(tag => <Link href={makeHref(context.page, context.category, tag)} key={tag} aria-current={context.tag===tag ? "page" : undefined}>{tag}</Link>)}</nav>
    {!payload ? <section className="news-state"><h2>新闻暂时无法载入</h2><p>请稍后刷新。</p></section> : !newest ? <section className="news-state"><h2>下一版简报正在路上</h2></section> : editions.map(edition => {
      const items = (key: string) => (edition.topics[key] || []).filter(item => matchesTag(item, context.tag));
      const shown = visibleCategories.reduce((n,key) => n + items(key).length, 0);
      return <section className="edition" key={edition.date}><header className="edition-head"><h2><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time></h2><p>{shown} 条重点 · 一天一页{context.tag ? " · " + context.tag : ""}</p></header>{visibleCategories.map(key => <TopicDesk key={key} category={key} items={items(key)} listingHref={listingHref} />)}{!shown && <p className="news-state">本期重点没有匹配此标签的内容。</p>}{!context.category && extras.map(key => <details className="news-extra" key={key}><summary>{categoryLabels[key]} <span>{items(key).length} 条</span></summary><TopicDesk category={key} items={items(key)} listingHref={listingHref} /></details>)}</section>;
    })}
    {newest && <nav className="news-pagination" aria-label="新闻按日分页"><Link href={makeHref(Math.max(1,meta.page-1))} aria-disabled={meta.page===1} tabIndex={meta.page===1?-1:undefined}>较新一天</Link><span>第 {meta.page} / {meta.totalPages} 期</span><Link href={makeHref(Math.min(meta.totalPages,meta.page+1))} aria-disabled={meta.page===meta.totalPages} tabIndex={meta.page===meta.totalPages?-1:undefined}>较早一天</Link></nav>}
    <footer className="news-method-note"><span>选编说明</span><p>优先标准、论文、官方发布与项目仓库。本站提供摘要与工程观察，完整内容请阅读原始来源。标签筛选作用于当前一期；日报日期与来源发布日期分别标示。</p><a href="/rss.xml">RSS 订阅</a></footer>
  </main>;
}
