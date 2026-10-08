import { weeklyIssues } from "../../engineering/weekly";
import { xml } from "../../site/xml";
export function GET() {
  const items = weeklyIssues
    .map((issue) => {
      const url = "https://wangyibiao.com/weekly#" + issue.id;
      return `<item><title>${xml(issue.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${xml(issue.summary)}</description><pubDate>${new Date(issue.date + "T00:00:00Z").toUTCString()}</pubDate></item>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Yibiao · 工程周报</title><link>https://wangyibiao.com/weekly</link><description>站点工程进展与公开实验</description><language>zh-CN</language><atom:link href="https://wangyibiao.com/weekly/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
