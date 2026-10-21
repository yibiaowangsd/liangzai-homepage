import Link from "next/link";
import { NEWS_API, categoryLabels } from "../news-api";
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
  return <main id="main-content" className="newsroom weekly-report">
    <header className="news-toolbar"><div><p className="news-eyebrow">LIANGZAI WEEKLY</p><h1>每周前沿</h1><p>每周五 08:10 · 北京时间 · 七天进展</p></div><Link href="/news">返回日报</Link></header>
    {report ? <>
      <section className="news-subscription-banner"><div><h2>{report.period_start.slice(0, 10)} — {report.date}</h2><p>{report.summary}</p></div></section>
      {sections.map(section => <section className="desk" key={section.label}><header className="desk-head"><h2>{section.label}</h2><strong>{section.items.length}</strong></header>
        {section.items.toSorted((a, b) => a.priority.localeCompare(b.priority)).map(item => <article className="weekly-event" key={item.slug}><span className="brief-no">{item.priority}</span><div><p className="desk-kicker">{priorityLabels[item.priority]} · {categoryLabels[item.category]}</p><h3><a href={item.source_url} target="_blank" rel="noreferrer">{item.title}</a></h3><p>{item.summary}</p><small>{item.priority_reason} · {item.source_name}</small><details><summary>阅读本周进展解读</summary><div className="article-body">{item.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details></div></article>)}
        {!section.items.length && <p>本周暂无头版头条。</p>}
      </section>)}
    </> : <section className="desk"><h2>周报准备中</h2><p>首期周报将于周五汇总完成后在这里发布。</p></section>}
  </main>;
}
