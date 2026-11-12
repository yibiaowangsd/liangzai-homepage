import Link from "next/link";
import PageIntro from "../../milk/PageIntro";
import { notFound } from "next/navigation";
import { researchEntries } from "../entries";
import "../research.css";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = researchEntries.find(item => item.slug === slug);
  return { title: `${entry?.title || "研究未找到"} · 深度研究`, description: entry?.subtitle, alternates: { canonical: `https://wangyibiao.com/research/${slug}` } };
}
export default async function ResearchArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = researchEntries.find(item => item.slug === slug);
  if (!entry) notFound();
  return <main id="main-content" className="research-page research-article"><PageIntro
      latin="Notebook,"
      kicker={<>{entry.status} · <time dateTime={entry.date}>{entry.date}</time></>}
      title={entry.title}
      dynamicTitle
      back={<Link className="milk-intro-back" href="/research">全部研究</Link>}
      meta={entry.tags.map(tag => <span className="milk-chip" key={tag}>{tag}</span>)}
    >
      <p>{entry.subtitle}</p>
    </PageIntro>
    <div className="research-wrap">
    <div className="research-reading-layout"><nav className="research-toc" aria-label="本篇目录"><p>本篇路线</p><a href="#question">问题与结论</a><a href="#process">研究过程</a>{entry.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}<a href="#sources">原始来源</a><a href="#revisions">修订记录</a></nav>
    <article className="research-body"><section id="question" className="research-conclusions"><p className="research-kicker">本篇要回答的问题</p><h2>{entry.question}</h2><ul>{entry.summary.map(item => <li key={item}>{item}</li>)}</ul><p className="research-scope">证据边界：{entry.scope}</p></section>
    <section id="process"><h2>研究过程</h2><ol className="research-process">{entry.process.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></li>)}</ol></section>
    {entry.sections.map(section => <section id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs?.map(p => <p key={p}>{p}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}{section.table && <div className="research-table-wrap" role="region" aria-label={section.title} tabIndex={0}><table><thead><tr>{section.table.headers.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{section.table.rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}{section.code && <pre><code>{section.code}</code></pre>}</section>)}
    <section id="sources"><h2>原始来源与版本</h2><ol className="research-sources">{entry.sources.map(source => <li key={source.id} id={`source-${source.id}`}><a href={source.url} target="_blank" rel="noreferrer">[{source.id}] {source.title} ↗</a><p>{source.version}</p><p>{source.note}</p></li>)}</ol></section><section id="revisions"><h2>修订记录</h2>{entry.revisions.map((revision,i) => <p key={i}><time dateTime={revision.date}>{revision.date}</time> · {revision.detail}</p>)}<p className="research-scope">最后更新：{entry.updated}。本文为技术研究札记，不构成安全认证或生产部署承诺。</p></section><Link className="research-read" href="/research">返回研究记录</Link></article></div></div></main>;
}
