import Link from "next/link";
import type { Metadata } from "next";
import StoryImage from "./StoryImage";
import {
  categoryLabels,
  coreCategories,
  formatEditionDate,
  getNewsEditions,
  parseTags,
  type NewsItem,
} from "./news-api";

export const metadata: Metadata = {
  title: "每日前沿 · 量仔",
  description:
    "每天五个方向、每个方向五条：后量子密码、抗量子协议、标准动态、网络安全与 AI 前沿。",
};

function TopicDesk({
  category,
  items,
}: {
  category: string;
  items: NewsItem[];
}) {
  if (!items.length) return null;
  const lead = items[0];
  const rest = items.slice(1);

  return (
    <section className="desk" id={category}>
      <header className="desk-head">
        <div>
          <h3>{categoryLabels[category] || category}</h3>
        </div>
        <strong>{items.length.toString().padStart(2, "0")}</strong>
      </header>

      <div className="desk-layout">
        <article className="desk-lead">
          <Link
            className="desk-lead-image"
            href={"/news/" + lead.slug}
            aria-label={"阅读：" + lead.title}
          >
            <StoryImage item={lead} />
            <span>{lead.source_name || "原始来源"}</span>
          </Link>
          <div className="desk-lead-copy">
            <p className="desk-kicker">
              {categoryLabels[lead.category] || lead.category}
            </p>
            <h4>
              <Link href={"/news/" + lead.slug}>{lead.title}</Link>
            </h4>
            {lead.summary && <p>{lead.summary}</p>}
            <Link className="editorial-link" href={"/news/" + lead.slug}>
              阅读解读{" "}

            </Link>
          </div>
        </article>

        <div className="desk-briefs">
          {rest.slice(0, 4).map((item, index) => (
            <article className="brief-row" key={item.slug}>
              <span className="brief-no">
                {String(index + 2).padStart(2, "0")}
              </span>
              <div>
                <h4>
                  <Link href={"/news/" + item.slug}>{item.title}</Link>
                </h4>
                <p>{item.summary}</p>
                <small>{item.source_name || "原始来源"}</small>
              </div>
              <Link
                className="brief-thumb"
                href={"/news/" + item.slug}
                aria-label={"阅读：" + item.title}
              >
                <StoryImage item={item} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Math.max(
    Number.parseInt(params.page || "1", 10) || 1,
    1,
  );
  const category =
    params.category &&
    coreCategories.includes(params.category as (typeof coreCategories)[number])
      ? params.category
      : undefined;

  let payload: Awaited<ReturnType<typeof getNewsEditions>> | null = null;
  let failed = false;

  try {
    payload = await getNewsEditions(requestedPage, 3, category);
  } catch {
    failed = true;
  }

  const editions = payload?.data || [];
  const meta = payload?.meta || {
    page: 1,
    pageSize: 3,
    totalDays: 0,
    totalPages: 1,
  };
  const newest = editions[0];
  const heroStories = newest
    ? coreCategories.flatMap((key) => newest.topics[key] || []).slice(0, 6)
    : [];
  const heroLead = heroStories[0];
  const heroSide = heroStories.slice(1, 5);

  const makeHref = (pageNumber: number, nextCategory = category) => {
    const query = new URLSearchParams();
    if (pageNumber > 1) query.set("page", String(pageNumber));
    if (nextCategory) query.set("category", nextCategory);
    const suffix = query.toString();
    return suffix ? "/news?" + suffix : "/news";
  };

  const paginationPages = Array.from(
    { length: meta.totalPages },
    (_, index) => index + 1,
  ).filter((pageNumber) => Math.abs(pageNumber - meta.page) <= 2);

  return (
    <main id="main-content" className="newsroom">
      <section className="news-toolbar" aria-label="前沿新闻导航">
        <div className="news-toolbar-title">
          <h1>前沿新闻</h1>
          <span>THE DAILY SIGNAL</span>
        </div>
        <details className="news-category-menu">
          <summary>
            <span>{category ? categoryLabels[category] : "全部新闻"}</span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <nav aria-label="新闻方向">
            <Link href="/news" aria-current={!category ? "page" : undefined}>
              <span>全部新闻</span>
            </Link>
            {coreCategories.map((key) => (
              <Link
                key={key}
                href={makeHref(1, key)}
                aria-current={category === key ? "page" : undefined}
              >
                <span>{categoryLabels[key]}</span>
              </Link>
            ))}
          </nav>
        </details>
      </section>

      {failed ? (
        <section className="news-state">
          <h2>新闻暂时无法载入</h2>
          <p>请稍后刷新，继续阅读最新消息。</p>
        </section>
      ) : !newest || !heroLead ? (
        <section className="news-state">
          <h2>下一版简报正在路上</h2>
          <p>自动发布完成后，这里会直接读取最新一期。</p>
        </section>
      ) : (
        <>
          <section className="front-page">
            <div className="edition-label">
              <time dateTime={newest.date}>
                {newest.date.replaceAll("-", ".")}
              </time>
              <strong>{formatEditionDate(newest.date)}</strong>
              <span>{newest.total} 条新闻</span>
            </div>

            <article className="lead-story">
              <Link
                className="lead-visual"
                href={"/news/" + heroLead.slug}
                aria-label={"阅读：" + heroLead.title}
              >
                <StoryImage item={heroLead} eager />
                <span className="image-label">
                  {heroLead.source_name || "原始来源"}
                </span>
              </Link>
              <div className="lead-copy">
                <p className="lead-kicker">
                  {categoryLabels[heroLead.category] || heroLead.category}
                </p>
                <h2>
                  <Link href={"/news/" + heroLead.slug}>{heroLead.title}</Link>
                </h2>
                {heroLead.summary && <p>{heroLead.summary}</p>}
                <div className="lead-meta">
                  {parseTags(heroLead.tags)
                    .slice(0, 4)
                    .map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                </div>
                <Link
                  className="editorial-link"
                  href={"/news/" + heroLead.slug}
                >
                  阅读今日头条{" "}

                </Link>
              </div>
            </article>

            <aside className="front-deck" aria-label="今日重点">
              {heroSide.map((item, index) => (
                <article key={item.slug}>
                  <Link
                    className="deck-thumb"
                    href={"/news/" + item.slug}
                    aria-label={"阅读：" + item.title}
                  >
                    <StoryImage item={item} />
                  </Link>
                  <div>
                    <span>
                      {String(index + 2).padStart(2, "0")} /{" "}
                      {categoryLabels[item.category]}
                    </span>
                    <h3>
                      <Link href={"/news/" + item.slug}>{item.title}</Link>
                    </h3>
                  </div>
                </article>
              ))}
            </aside>
          </section>

          <div className="edition-stack">
            {editions.map((edition) => (
              <section className="edition" key={edition.date}>
                <header className="edition-head">
                  <div>
                    <h2>{formatEditionDate(edition.date)}</h2>
                  </div>
                  <p>{edition.total} 条 · 五个方向各取最值得关注的更新</p>
                </header>

                {(category ? [category] : coreCategories).map((key) => (
                  <TopicDesk
                    key={key}
                    category={key}
                    items={edition.topics[key] || []}
                  />
                ))}
              </section>
            ))}
          </div>

          <nav className="news-pagination" aria-label="新闻分页">
            <Link
              href={makeHref(Math.max(meta.page - 1, 1))}
              aria-disabled={meta.page <= 1}
              className={meta.page <= 1 ? "is-disabled" : undefined}
              tabIndex={meta.page <= 1 ? -1 : undefined}
            >
              更新新闻
            </Link>
            <div>
              {paginationPages.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={makeHref(pageNumber)}
                  aria-current={pageNumber === meta.page ? "page" : undefined}
                >
                  {pageNumber}
                </Link>
              ))}
            </div>
            <Link
              href={makeHref(Math.min(meta.page + 1, meta.totalPages))}
              aria-disabled={meta.page >= meta.totalPages}
              className={
                meta.page >= meta.totalPages ? "is-disabled" : undefined
              }
              tabIndex={meta.page >= meta.totalPages ? -1 : undefined}
            >
              历史新闻
            </Link>
          </nav>
        </>
      )}

      <footer className="news-method-note">
        <span>选编说明</span>
        <p>
          默认优先原始标准、论文、官方博客与项目仓库。每日五个方向各 5 条； 当
          24 小时内信息不足时向前回溯，但保留真实来源日期，不用旧闻冒充新发布。
        </p>
      </footer>
    </main>
  );
}
