import Link from "next/link";
import type { Metadata } from "next";
import {
  categoryLabels,
  formatNewsDate,
  getNewsList,
  parseTags,
} from "./news-api";

export const metadata: Metadata = {
  title: "前沿简报 · 量仔",
  description: "每日追踪后量子密码、抗量子协议、标准动态、网络安全与 AI 前沿。",
};

const categories = [
  ["", "全部"],
  ["pqc", "后量子密码"],
  ["protocol", "抗量子协议"],
  ["standards", "标准动态"],
  ["security", "网络安全"],
  ["ai", "AI 前沿"],
  ["industry", "产业动态"],
] as const;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = params.category && categoryLabels[params.category]
    ? params.category
    : "";

  let news: Awaited<ReturnType<typeof getNewsList>> = [];
  let failed = false;
  try {
    news = await getNewsList(category || undefined);
  } catch {
    failed = true;
  }

  return (
    <main id="main-content" className="news-page">
      <section className="news-hero">
        <div>
          <p className="eyebrow">
            <span className="status-light" /> LIANGZAI / DAILY FRONTIER
          </p>
          <h1>
            每日前沿
            <span>FRONTIER SIGNAL</span>
          </h1>
          <p className="news-hero-lead">
            从后量子密码到 AI，把每天真正值得留意的变化留下来。
            <br />
            信息来自原始标准、论文、官方发布与项目仓库。
          </p>
        </div>
        <aside className="news-hero-status" aria-label="简报状态">
          <span>LIVE FEED</span>
          <strong>{failed ? "OFFLINE" : "ONLINE"}</strong>
          <dl>
            <div>
              <dt>更新节奏</dt>
              <dd>每日 08:00</dd>
            </div>
            <div>
              <dt>当前条目</dt>
              <dd>{news.length.toString().padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>数据源</dt>
              <dd>Worker + D1</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="news-index">
        <header className="news-index-header">
          <div>
            <p className="eyebrow">01 / SIGNAL INDEX</p>
            <h2>今天发生了什么</h2>
          </div>
          <p>只保留有明确来源、可继续追踪的更新。</p>
        </header>

        <nav className="news-filters" aria-label="新闻分类">
          {categories.map(([value, label]) => {
            const active = category === value;
            const href = value ? `/news?category=${value}` : "/news";
            return (
              <Link
                key={value || "all"}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {failed ? (
          <div className="news-empty">
            <span>API / TEMPORARILY UNAVAILABLE</span>
            <h3>暂时没有收到数据</h3>
            <p>新闻 API 当前不可用，请稍后刷新。前端页面不会缓存错误结果。</p>
          </div>
        ) : news.length === 0 ? (
          <div className="news-empty">
            <span>NO SIGNAL YET</span>
            <h3>这个分类还没有内容</h3>
            <p>下一次自动简报写入 D1 后，这里会直接出现新条目。</p>
          </div>
        ) : (
          <div className="news-grid">
            {news.map((item, index) => {
              const tags = parseTags(item.tags);
              return (
                <article
                  className={`news-card${index === 0 ? " news-card-featured" : ""}`}
                  key={item.slug}
                >
                  <div className="news-card-meta">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <time dateTime={item.published_at}>
                      {formatNewsDate(item.published_at)}
                    </time>
                  </div>
                  <div>
                    <p className="news-category">
                      {categoryLabels[item.category] || item.category}
                    </p>
                    <h3>
                      <Link href={`/news/${item.slug}`}>{item.title}</Link>
                    </h3>
                    {item.summary && <p className="news-summary">{item.summary}</p>}
                  </div>
                  <footer>
                    <div className="news-tags">
                      {tags.slice(0, 4).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <Link className="news-read" href={`/news/${item.slug}`}>
                      阅读全文 <span aria-hidden="true">↗</span>
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="news-method">
        <p className="eyebrow">02 / HOW IT WORKS</p>
        <div>
          <h2>自动更新，但不自动降低标准。</h2>
          <p>
            每天先核对原始来源，再按标题、来源链接与主题去重。新内容进入 D1
            后，本页直接读取 API，因此不需要为每篇新闻重新构建前端。
          </p>
        </div>
      </section>
    </main>
  );
}
