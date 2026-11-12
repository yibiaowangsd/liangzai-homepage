import type { Metadata } from "next";
import PageIntro from "../milk/PageIntro";
import Link from "next/link";
import { researchEntries } from "./entries";
import "./research.css";
export const metadata: Metadata = {
  title: "深度研究 · 量仔",
  description: "每天沿一个问题深入：公开研究过程、原始证据、协议设计分析和可复现实验计划。",
  alternates: { canonical: "https://wangyibiao.com/research" },
};
export default function ResearchPage() {
  return <main id="main-content" className="research-page">
    <PageIntro
      latin="Notebook,"
      kicker="深度研究 · 密码协议、工程验证与设计探索"
      title={<>一天，一个问题，<br /><em>把它研究透</em></>}
      naiwa={{ src: "/assets/naiwa/peek.webp", width: 760, height: 1140, alt: "举着放大镜凑近看的奶蛙" }}
      meta={<span className="milk-chip" data-tone="accent">{researchEntries.length} 篇研究札记</span>}
    >
      <p>不止记录发生了什么，更追问为什么成立、边界在哪里，以及怎样验证。这里保存每日专题的研究过程与阶段成果。</p>
    </PageIntro>
    <div className="research-wrap">
    <section className="research-principles" aria-label="研究方法"><div><span>01 / 问题</span><p>从可回答的具体问题开始，不拼接新闻。</p></div><div><span>02 / 证据</span><p>回到原始文本，区分标准、作者主张与分析。</p></div><div><span>03 / 验证</span><p>留下可执行的测试，未实测就明确标注。</p></div></section>
    <section className="research-archive" aria-labelledby="research-archive-title"><div className="research-section-heading"><h2 id="research-archive-title">研究记录</h2><Link href="/topics">查看技术进展档案</Link></div>{researchEntries.map((entry, i) => <article className="research-card" key={entry.slug}><div className="research-card-index">{String(researchEntries.length - i).padStart(2, "0")}<time dateTime={entry.date}>{entry.date}</time></div><div><p className="research-kicker">{entry.status}</p><h3><Link href={`/research/${entry.slug}`}>{entry.title}</Link></h3><p>{entry.subtitle}</p><div className="research-tags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div><Link className="research-read" href={`/research/${entry.slug}`}>阅读过程与成果 <span aria-hidden="true">→</span></Link></div></article>)}</section>
    <aside className="research-note">研究不是既定结论。每篇保留证据边界与修订记录；实验计划不等于已完成实验，设计线索不代表新颖性或可专利性。</aside>
    </div>
  </main>;
}
