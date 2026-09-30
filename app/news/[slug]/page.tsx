import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  categoryEnglish,
  categoryLabels,
  coverFor,
  formatNewsDate,
  getNewsDetail,
  parseTags,
} from "../news-api";

function NewsBody({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={"list-" + blocks.length}>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>,
    );
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      return;
    }
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }
    flushBullets();
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={index}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      blocks.push(<h2 key={index}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      blocks.push(<h2 key={index}>{line.slice(2)}</h2>);
    } else {
      blocks.push(<p key={index}>{line}</p>);
    }
  });
  flushBullets();

  return <div className="article-body">{blocks}</div>;
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getNewsDetail(slug);
  if (!item || !item.content) notFound();

  const tags = parseTags(item.tags);

  return (
    <main id="main-content" className="article-page">
      <article className="article-shell">
        <header className="article-header">
          <Link className="article-back" href="/news">← 返回每日前沿</Link>
          <div className="article-kicker">
            <span>{categoryEnglish[item.category] || "FRONTIER"}</span>
            <span>{categoryLabels[item.category] || item.category}</span>
          </div>
          <h1>{item.title}</h1>
          <p className="article-deck">{item.summary}</p>
          <div className="article-byline">
            <time dateTime={item.published_at}>{formatNewsDate(item.published_at)}</time>
            <span>{item.source_name || "原始来源"}</span>
            {tags.map((tag) => <i key={tag}>{tag}</i>)}
          </div>
        </header>

        <figure className="article-hero-image">
          <img src={coverFor(item)} alt="" aria-hidden="true" />
          <figcaption>
            <span>LIANGZAI / EDITORIAL VISUAL</span>
            <span>{item.source_name || "SOURCE"}</span>
          </figcaption>
        </figure>

        <section className="article-summary">
          <span>EDITOR&apos;S SUMMARY</span>
          <h2>一句话看懂</h2>
          <p>{item.summary}</p>
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noreferrer">
              阅读原始资料 <span aria-hidden="true">↗</span>
            </a>
          )}
        </section>

        <div className="article-layout">
          <NewsBody content={item.content} />
          <aside className="source-rail">
            <span>ORIGINAL SOURCE</span>
            <strong>{item.source_name || "原始来源"}</strong>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noreferrer">
                打开原文 ↗
              </a>
            )}
            <p>
              本页是基于原始资料整理的中文摘要与技术解读。涉及标准状态、性能数据和产品能力时，以原始页面为最终依据。
            </p>
          </aside>
        </div>
      </article>
    </main>
  );
}
