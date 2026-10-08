import archiveSlugs from "../site/news-index.json";
import { getNewsEditions } from "../news/news-api";
import { notes } from "../engineering/notes";
import { protocols } from "../engineering/protocols";
import { xml } from "../site/xml";
export async function GET() {
  const paths = ["/", "/about", "/news", "/pqc-arsenal", "/pqc-practice/index.html", "/pqc-practice/audit.html", "/models", "/storybook", "/archive", "/universe", "/en/about", "/en/pqc", "/pqc-practice/index-en.html", ...["ml-kem","ml-dsa","slh-dsa","fn-dsa"].flatMap(id=>["/pqc/"+id,"/en/pqc/"+id])];
  paths.push("/protocols", "/projects", "/benchmarks", "/lab/hybrid", "/lab/security", "/gm-pqc", "/migration", "/notes", "/tools", "/tools/packet-size", "/tools/certificates", "/parameters", "/contact", "/weekly", "/records", "/changelog", "/site-info", ...protocols.map(p=>"/protocols/"+p.slug), ...notes.map(n=>"/notes/"+n.slug));
  paths.push(...archiveSlugs.map(slug => "/news/"+encodeURIComponent(slug)));
  try {const edition=await getNewsEditions(1,1);for(const topic of Object.values(edition.data[0]?.topics || {}))for(const item of topic)paths.push("/news/"+encodeURIComponent(item.slug));} catch { /* Core routes remain discoverable during an upstream outage. */ }
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(paths)].map(path=>"<url><loc>"+xml("https://wangyibiao.com"+path)+"</loc></url>").join("")+"</urlset>",{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=300"}});
}
