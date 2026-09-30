import Link from "next/link";
import { notFound } from "next/navigation";
import {
  categoryLabels,
  formatNewsDate,
  getNewsDetail,
  parseTags,
} from "../news-api";

function NewsBody({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`list-${blocks.length}`}>
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

  return <div className="news-prose">{blocks}</div>;
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
    <main id="main-content" className="news-detail-page">
      <article className="news-detail">
        <header>
          <Link className="news-back" href="/news">
            ← 返回每日前沿
          </Link>
          <p className="eyebrow">
            <span className="status-light" /> {categoryLabels[item.category] || item.category}
          </p>
          <h1>{item.title}</h1>
          {item.summary && <p className="news-detail-lead">{item.summary}</p>}
          <div className="news-detail-meta">
            <time dateTime={item.published_at}>{formatNewsDate(item.published_at)}</time>
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </header>

        <div className="news-detail-layout">
          <NewsBody content={item.content} />
          <aside className="news-source-card">
            <span>SOURCE / VERIFIED</span>
            <strong>{item.source_name || "原始来源"}</strong>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noreferrer">
                查看原始资料 ↗
              </a>
            )}
            <p>本文为基于原始资料整理的中文摘要与技术解读，请以来源页面为最终依据。</p>
          </aside>
        </div>
      </article>
    </main>
  );
}
