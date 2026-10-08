import { notes } from "../../engineering/notes";
import { xml } from "../../site/xml";
export function GET() {
  const entries = notes
    .map((note) => {
      const url = "https://wangyibiao.com/notes/" + note.slug;
      return `<item><title>${xml(note.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${xml(note.summary)}</description><pubDate>${new Date(note.date + "T00:00:00Z").toUTCString()}</pubDate></item>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Yibiao · 工程笔记</title><link>https://wangyibiao.com/notes</link><description>算法验证、协议接入与迁移实践的长文</description><language>zh-CN</language><atom:link href="https://wangyibiao.com/notes/rss.xml" rel="self" type="application/rss+xml"/>${entries}</channel></rss>`,
    {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
