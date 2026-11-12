import Link from "next/link";
import { NEWS_API, categoryLabels } from "../news-api";
import PageIntro from "../../milk/PageIntro";
import "./weekly.css";

type WeeklyItem = { slug: string; title: string; summary: string; content: string; category: string; priority: "P1" | "P2" | "P3"; priority_reason: string; front_page: boolean; source_url: string; source_name: string };
type WeeklyReport = { date: string; period_start: string; summary: string; items: WeeklyItem[] };
const priorityLabels = { P1: "重大", P2: "重要", P3: "关注" };

export const metadata = { title: "每周前沿 · 量仔", description: "每周五回顾七天实质进展，头版头条与各栏新闻分开呈现。" };

export default async function WeeklyPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const url = new URL("/api/news/weekly", NEWS_API);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) url.searchParams.set("date", date);
  let report: WeeklyReport | null = null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) report = (await response.json()).data;
  } catch { /* The empty state also covers an unavailable report service. */ }
  const sections = report ? [
    { label: "头版头条", items: report.items.filter(item => item.front_page) },
    ...Object.entries(categoryLabels).map(([category, label]) => ({ label: `其余新闻 · ${label}`, items: report.items.filter(item => !item.front_page && item.category === category) })).filter(section => section.items.length),
  ] : [];
  const total = report?.items.length ?? 0;
  const frontCount = report?.items.filter(item => item.front_page).length ?? 0;
  return <main id="main-content" className="newsroom weekly-report">
    <PageIntro
      latin="Friday,"
      kicker="每周前沿 · 周五 08:10 北京时间"
      title="七天，浓缩成一份"
      back={<Link className="milk-intro-back" href="/news">返回日报</Link>}
      meta={<><Link className="news-subscribe-link" href="/news/subscribe">订阅日报与周报</Link><Link href="/topics">按专题追踪进展</Link></>}
      aside={report ? <dl className="milk-intro-aside"><div><dt>头版头条</dt><dd>{frontCount}</dd></div><div><dt>本周进展</dt><dd>{total}</dd></div></dl> : undefined}
    >
      <p>每周五回看七天里的实质进展。头版头条单独成栏，其余新闻按栏目排列，每条标注重要程度与理由。</p>
    </PageIntro>
    {report ? <>
      <section className="weekly-summary" aria-labelledby="weekly-period">
        <p className="weekly-summary-label">本期范围</p>
        <h2 id="weekly-period"><time dateTime={report.period_start.slice(0, 10)}>{report.period_start.slice(0, 10)}</time> — <time dateTime={report.date}>{report.date}</time></h2>
        <p>{report.summary}</p>
      </section>
      {sections.map(section => <section className="desk" key={section.label}><header className="desk-head"><h3>{section.label}</h3><strong>{String(section.items.length).padStart(2, "0")}</strong></header>
        {section.items.toSorted((a, b) => a.priority.localeCompare(b.priority)).map(item => <article className="weekly-event" key={item.slug} data-priority={item.priority}><span className="weekly-priority">{item.priority}<small>{priorityLabels[item.priority]}</small></span><div><p className="desk-kicker">{categoryLabels[item.category]}</p><h4><a href={item.source_url} target="_blank" rel="noreferrer">{item.title}</a></h4><p>{item.summary}</p><small>{item.priority_reason} · {item.source_name}</small><details><summary>阅读本周进展解读</summary><div className="article-body">{item.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details></div></article>)}
        {!section.items.length && <p className="weekly-empty">本周暂无头版头条。</p>}
      </section>)}
    </> : <section className="news-state"><h2>周报准备中</h2><p>首期周报将于周五汇总完成后在这里发布。</p></section>}
  </main>;
}
