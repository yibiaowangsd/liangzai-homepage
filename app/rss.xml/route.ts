import { getNewsEditions, categoryLabels } from "../news/news-api";
import { primaryCategories } from "../news/presentation";
import { xml } from "../site/xml";
export async function GET(){
  let items: Awaited<ReturnType<typeof getNewsEditions>>["data"]=[];
  try{items=(await getNewsEditions(1,1)).data;}catch{return new Response("News feed temporarily unavailable",{status:503,headers:{"retry-after":"300"}});}
  const entries=items.flatMap(edition=>primaryCategories.flatMap(category=>edition.topics[category] || []));
  const body=entries.map(item=>{const link="https://wangyibiao.com/news/"+encodeURIComponent(item.slug);return `<item><title>${xml(item.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(item.summary || "")}</description><category>${xml(categoryLabels[item.category] || item.category)}</category><pubDate>${new Date(item.published_at).toUTCString()}</pubDate></item>`;}).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Yibiao · 前沿新闻</title><link>https://wangyibiao.com/news</link><description>后量子密码、抗量子协议与标准动态</description><language>zh-CN</language><atom:link href="https://wangyibiao.com/rss.xml" rel="self" type="application/rss+xml"/>${body}</channel></rss>`,{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public, max-age=300"}});
}
