import Link from "next/link";
import { pageMetadata } from "../site/metadata";
import SectionIndex from "../site/SectionIndex";
import archive from "../site/news-archive.json";
import { DensityControl, EditionPicker } from "./NewsControls";
import { newsListingHref, newsStoryHref, parseNewsContext, type NewsSearchParams } from "./navigation";
import { categoryLabels, coreCategories, formatEditionDate, getNewsEditions, parseTags, type NewsItem } from "./news-api";
import { topicTags, matchesTag, cleanSummary, sourceDate } from "./presentation";
export const metadata = pageMetadata("前沿新闻", "后量子密码、抗量子协议与标准动态：摘要、工程观察和原始来源。", "/news", "news");
function TopicDesk({category,items,listingHref}: {category:string;items:NewsItem[];listingHref:string}) {
  return <section className="compact-desk" id={category}><header><h2>{categoryLabels[category] || category}</h2><span>{items.length} 条</span></header>{!items.length && <p>本期没有匹配的条目。</p>}{items.map(item=>{
    const published=sourceDate(item,archive.sourceDates);
    return <article className="compact-news-row" key={item.slug}><Link className="news-card-link" href={newsStoryHref(item.slug,listingHref)} aria-labelledby={"title-"+item.slug}><div className="news-item-meta"><span>{item.source_name || "原始来源"}</span><span> · </span>{published ? <time dateTime={published}>{published}</time> : <span>来源日期未标注</span>}</div><h3 id={"title-"+item.slug}>{item.title}</h3><p>{cleanSummary(item.summary)}</p><ul className="news-keywords" aria-label="关键词">{parseTags(item.tags).slice(0,3).map(tag=><li key={tag}>{tag}</li>)}</ul></Link></article>;
  })}</section>;
}
export default async function NewsPage({searchParams}: {searchParams:Promise<NewsSearchParams>}) {
  const context=parseNewsContext(await searchParams);
  let payload:Awaited<ReturnType<typeof getNewsEditions>>|null=null;
  try {payload=await getNewsEditions(context.page,1);} catch { /* bounded retry state */ }
  const editions=payload?.data||[],meta=payload?.meta||{page:1,totalPages:1},newest=editions[0];
  const makeHref=(page:number,tag=context.tag)=>newsListingHref({page,tag});
  const listingHref=newsListingHref({page:meta.page,category:context.category,tag:context.tag});
  const categories=[...new Set([...coreCategories,...editions.flatMap(edition=>Object.keys(edition.topics))])];
  const pagination=<nav className="news-pagination" aria-label="新闻按日分页">{meta.page<meta.totalPages ? <Link href={makeHref(meta.page+1)}>← 较早</Link> : <span aria-disabled="true">← 较早</span>}<span>第 {meta.page} / {meta.totalPages} 期</span>{meta.page>1 ? <Link href={makeHref(meta.page-1)}>较新 →</Link> : <span aria-disabled="true">较新 →</span>}</nav>;
  const numbers=[...new Set([1,meta.page-1,meta.page,meta.page+1,meta.totalPages].filter(page=>page>0&&page<=meta.totalPages))].sort((a,b)=>a-b);
  return <main id="main-content" className="newsroom news-compact" data-density="compact">
    <section className="news-toolbar" aria-label="前沿新闻导航"><div className="news-toolbar-title"><h1>前沿新闻</h1><p>密码、协议与标准。先看要点，再追原始来源。</p></div><div className="news-heading-tools"><details className="news-method-tip"><summary>选编说明 ⓘ</summary><p>AI 辅助选编，优先标准、论文、官方发布与项目仓库。本站提供摘要与工程观察，完整内容请阅读原始来源。卡片日期为明确标注的原始来源日期，日报日期独立显示；未标注的日期不会用收录时间替代。</p></details><a href="/rss.xml">RSS 订阅</a></div></section>
    {newest && <div className="news-edition-controls">{pagination}<EditionPicker current={makeHref(meta.page)} options={Array.from({length:meta.totalPages},(_,i)=>{const page=i+1;const date=page===meta.page ? newest.date : archive.dates.indexOf(newest.date) >= 0 ? archive.dates[archive.dates.indexOf(newest.date)+page-meta.page] : undefined;return {href:makeHref(page),label:date ? `${date} · 第 ${page} 期` : `第 ${page} 期`};})}/><DensityControl /></div>}
    <SectionIndex className="section-index news-sections" label="新闻方向" items={[{id:"edition-start",label:"全部"},...categories.map(id=>({id,label:categoryLabels[id]||id}))]}/>
    <nav className="news-tags" aria-label="标签筛选"><Link href={newsListingHref({page:meta.page})} aria-current={!context.tag ? "page" : undefined}>全部标签</Link>{topicTags.map(tag=><Link href={makeHref(meta.page,tag)} key={tag} aria-current={context.tag===tag ? "page" : undefined}>{tag}</Link>)}</nav>
    {!payload ? <section className="news-state"><h2>新闻暂时无法载入</h2><p>读取超时或来源暂不可用，请重试。</p><a href={listingHref}>重试加载</a></section> : !newest ? <section className="news-state"><h2>下一版简报正在路上</h2></section> : editions.map(edition=>{
      const seen=new Set<string>();
      return <section className="edition" key={edition.date}><header className="edition-head" id="edition-start"><h2><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time></h2><p>日报日期 · 一天一页{context.tag ? " · "+context.tag : ""}</p></header>{categories.map(category=>{const items=(edition.topics[category]||[]).filter(item=>{if(seen.has(item.slug)||!matchesTag(item,context.tag))return false;seen.add(item.slug);return true;});return <TopicDesk key={category} category={category} items={items} listingHref={listingHref}/>;})}</section>;
    })}
    {newest && <>{pagination}<nav className="news-page-numbers" aria-label="新闻期数">{numbers.map((page,index)=><span key={page}>{index>0&&page-numbers[index-1]>1&&<span aria-hidden="true">… </span>}<Link href={makeHref(page)} aria-current={page===meta.page ? "page" : undefined}>{page===1 ? "第一页" : page===meta.totalPages ? "最后一页" : page}</Link></span>)}</nav></>}
  </main>;
}
