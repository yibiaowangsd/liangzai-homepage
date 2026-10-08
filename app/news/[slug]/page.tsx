import Link from "next/link";
import { pageMetadata } from "../../site/metadata";
import { articleSections } from "../presentation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { newsListingHref, parseNewsContext, type NewsSearchParams } from "../navigation";
import {
  categoryLabels,
  formatNewsDate,
  getNewsDetail,
  parseTags,
} from "../news-api";

function NewsBody({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={"paragraph-" + blocks.length}>{paragraph.join(" ")}</p>);
    paragraph = [];
  };

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
      flushParagraph();
      flushBullets();
      return;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      bullets.push(line.slice(2));
      return;
    }
    flushBullets();
    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push(<h3 key={index}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push(<h2 key={index}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push(<h2 key={index}>{line.slice(2)}</h2>);
    } else {
      paragraph.push(line);
    }
  });
  flushBullets();
  flushParagraph();

  return <div className="article-body">{blocks}</div>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getNewsDetail((await params).slug);
  return item ? pageMetadata(item.title, item.summary || item.title, "/news/" + encodeURIComponent(item.slug), "news") : { title: "新闻未找到 · Yibiao" };
}

export default async function NewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<NewsSearchParams>;
}) {
  const { slug } = await params;
  const listingHref = newsListingHref(parseNewsContext(await searchParams));
  const item = await getNewsDetail(slug);
  if (!item || !item.content) notFound();

  const tags = parseTags(item.tags);
  const { intro, excerpt } = articleSections(item.content, item.summary || "");
  const readingMinutes = Math.max(1, Math.ceil((intro.length + excerpt.length) / 350));

  return (
    <main id="main-content" className="article-page">
      <article className="article-shell">
        <header className="article-header">
          <Link className="article-back" href={listingHref}>返回新闻</Link>
          <div className="article-kicker">
            <span>{categoryLabels[item.category] || item.category}</span>
          </div>
          <h1>{item.title}</h1>
          <div className="article-byline">
            <time dateTime={item.published_at}>日报日期 · {formatNewsDate(item.published_at)}</time>
            <span>{item.source_name || "原始来源"}</span>
            <span>约 {readingMinutes} 分钟阅读</span>
            {tags.map((tag) => <i key={tag}>{tag}</i>)}
          </div>
          <section className="article-observation" aria-label="量仔观察"><span className="article-takeaway-label">量仔观察</span><NewsBody content={intro} /></section>
          {item.summary && item.summary !== intro && <p className="article-deck">{item.summary}</p>}
          {item.source_url && <a className="editorial-link" href={item.source_url} target="_blank" rel="noreferrer">阅读原文 · {item.source_name}</a>}
        </header>

        <div className="article-layout">
          <div>
            <details className="article-source-excerpt"><summary>原文要点（展开）</summary><NewsBody content={excerpt} /></details>
          </div>
          <footer className="article-source">
            <h2>原始来源</h2>
            <p>{item.source_name || "原始来源"}</p>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noreferrer">
                阅读原文
              </a>
            )}
            <p>
              本站仅提供原始资料的简要要点与独立工程观察；完整论证请阅读原始链接。页首日期为本站日报日期。
            </p>
          </footer>
        </div>
      </article>
    </main>
  );
}
