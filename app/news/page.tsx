import Link from "next/link";
import type { Metadata } from "next";
import StoryImage from "./StoryImage";
import NewsDatePicker from "./NewsDatePicker";
import { newsListingHref, newsStoryHref, parseNewsContext, type NewsSearchParams } from "./navigation";
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
    "七个方向，每方向优先 3—5 条：后量子算法、抗量子迁移、抗量子协议、标准动态、网络安全、AI 前沿与 NGCC 公钥征集。",
};

function selectHighlights(topics: Record<string, NewsItem[]>, categories: readonly string[]) {
  const stories: NewsItem[] = [];
  const limit = Math.max(5, categories.filter(key => topics[key]?.length).length);
  // Take one story from every direction before filling any remaining slots.
  for (let index = 0; stories.length < limit; index += 1) {
    const round = categories.flatMap((key) => topics[key]?.slice(index, index + 1) || []);
    if (!round.length) break;
    stories.push(...round);
  }
  return stories.slice(0, limit);
}

function TopicDesk({
  category,
  items,
  listingHref,
}: {
  category: string;
  items: NewsItem[];
  listingHref: string;
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
            href={newsStoryHref(lead.slug, listingHref)}
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
              <Link href={newsStoryHref(lead.slug, listingHref)}>{lead.title}</Link>
            </h4>
            {lead.summary && <p>{lead.summary}</p>}
            <Link className="editorial-link" href={newsStoryHref(lead.slug, listingHref)}>
              阅读解读{" "}

            </Link>
          </div>
        </article>

        <div className="desk-briefs">
          {rest.map((item, index) => (
            <article className="brief-row" key={item.slug}>
              <span className="brief-no">
                {String(index + 2).padStart(2, "0")}
              </span>
              <div>
                <h4>
                  <Link href={newsStoryHref(item.slug, listingHref)}>{item.title}</Link>
                </h4>
                <p>{item.summary}</p>
                <small>{item.source_name || "原始来源"}</small>
              </div>
              <Link
                className="brief-thumb"
                href={newsStoryHref(item.slug, listingHref)}
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
  searchParams: Promise<NewsSearchParams>;
}) {
  const params = await searchParams;
  const { page: requestedPage, category, date } = parseNewsContext(params);

  let payload: Awaited<ReturnType<typeof getNewsEditions>> | null = null;
  let failed = false;

  try {
    payload = await getNewsEditions(requestedPage, 1, category, date);
  } catch {
    failed = true;
  }

  const editions = payload?.data || [];
  const meta = payload?.meta || {
    page: 1,
    pageSize: 1,
    totalDays: 0,
    totalPages: 1,
  };
  const newest = editions[0];
  const availableDates = meta.dates || editions.map(edition => edition.date);
  const selectedDate = newest?.date || date;
  const editionCategories = newest
    ? [...coreCategories, ...Object.keys(newest.topics).filter((key) => !coreCategories.includes(key as (typeof coreCategories)[number]))]
    : [...coreCategories];
  const heroStories = newest
    ? selectHighlights(newest.topics, category ? [category] : editionCategories)
    : [];
  const heroLead = heroStories[0];
  const heroSide = heroStories.slice(1);

  const makeHref = (pageNumber: number, nextCategory = category) =>
    newsListingHref({ page: pageNumber, category: nextCategory });
  const listingHref = newsListingHref({ page: meta.page, category, date });
  const categoryHref = (nextCategory?: string) => newsListingHref({ page: 1, category: nextCategory, date });

  const paginationPages = Array.from(
    { length: meta.totalPages },
    (_, index) => index + 1,
  ).filter((pageNumber) => Math.abs(pageNumber - meta.page) <= 2);

  return (
    <main id="main-content" className="newsroom">
      <section className="news-toolbar" aria-label="前沿新闻导航">
        <div className="news-toolbar-title">
          <h1>前沿新闻</h1>
        </div>
        {!failed && selectedDate && (
          <nav className="news-day-controls" aria-label="本期日期与日刊切换">
            <Link href={makeHref(Math.max(meta.page - 1, 1))} aria-label="查看较新一天" aria-disabled={meta.page <= 1} tabIndex={meta.page <= 1 ? -1 : undefined}>←</Link>
            <div>
              <NewsDatePicker key={selectedDate} date={selectedDate} dates={availableDates} category={category} />
              <span>{newest ? `${newest.total} 条 · 第 ${meta.page} / ${meta.totalPages} 期` : "该日期暂无日报"}</span>
            </div>
            <Link href={makeHref(Math.min(meta.page + 1, meta.totalPages))} aria-label="查看较早一天" aria-disabled={meta.page >= meta.totalPages} tabIndex={meta.page >= meta.totalPages ? -1 : undefined}>→</Link>
          </nav>
        )}
        <details className="news-category-menu">
          <summary>
            <span>{category ? categoryLabels[category] : "全部新闻"}</span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <nav aria-label="新闻方向">
            <Link href={categoryHref()} aria-current={!category ? "page" : undefined}>
              <span>全部新闻</span>
            </Link>
            {coreCategories.map((key) => (
              <Link
                key={key}
                href={categoryHref(key)}
                aria-current={category === key ? "page" : undefined}
              >
                <span>{categoryLabels[key]}</span>
              </Link>
            ))}
          </nav>
        </details>
      </section>

      <section className="news-subscription-banner" aria-labelledby="news-subscription-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg>
        <div><h2 id="news-subscription-title">让每天的前沿，直接抵达邮箱</h2><p>自选板块 · 每日一封 · 审核通过并确认邮箱后接收</p></div>
        <Link className="news-subscribe-link" href={category ? `/news/subscribe?category=${encodeURIComponent(category)}` : "/news/subscribe"}>订阅日报 <span aria-hidden="true">→</span></Link>
      </section>

      {failed ? (
        <section className="news-state">
          <h2>新闻暂时无法载入</h2>
          <p>请稍后刷新，继续阅读最新消息。</p>
        </section>
      ) : !newest ? (
        <section className="news-state">
          <h2>{date ? "该日期暂无日报" : "下一版简报正在路上"}</h2>
          {date ? <p>请选择日历中已发布的日期，或<Link href={newsListingHref({ page: 1, category })}>阅读最新一期</Link>。</p> : <p>自动发布完成后，这里会直接读取最新一期。</p>}
        </section>
      ) : (
        <>
          {heroLead && <section className="front-page">
            <div className="edition-label">
              <NewsDatePicker key={newest.date} date={newest.date} dates={availableDates} category={category} variant="stamp" />
              <strong>{formatEditionDate(newest.date)}</strong>
              <span>{newest.total} 条新闻</span>
            </div>

            <article className="lead-story">
              <Link
                className="lead-visual"
                href={newsStoryHref(heroLead.slug, listingHref)}
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
                  <Link href={newsStoryHref(heroLead.slug, listingHref)}>{heroLead.title}</Link>
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
                  href={newsStoryHref(heroLead.slug, listingHref)}
                >
                  阅读本期头条{" "}

                </Link>
              </div>
            </article>

            <aside className="front-deck" aria-label="本期重点">
              {heroSide.map((item, index) => (
                <article key={item.slug}>
                  <Link
                    className="deck-thumb"
                    href={newsStoryHref(item.slug, listingHref)}
                    aria-label={"阅读：" + item.title}
                  >
                    <StoryImage item={item} />
                  </Link>
                  <div>
                    <span>
                      {String(index + 2).padStart(2, "0")} /{" "}
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <h3>
                      <Link href={newsStoryHref(item.slug, listingHref)}>{item.title}</Link>
                    </h3>
                  </div>
                </article>
              ))}
            </aside>
          </section>}

          <div className="edition-stack">
            {editions.map((edition) => (
              <section className="edition" key={edition.date}>
                <header className="edition-head">
                  <div>
                    <NewsDatePicker key={edition.date} date={edition.date} dates={availableDates} category={category} variant="heading" />
                  </div>
                  <p>{edition.total} 条 · {category ? categoryLabels[category] : "当日全部新闻"} · 一天一页</p>
                </header>

                {(category ? [category] : editionCategories).map((key) => (
                  <TopicDesk
                    key={key}
                    category={key}
                    listingHref={listingHref}
                    items={edition.topics[key] || []}
                  />
                ))}
              </section>
            ))}
          </div>

          <nav className="news-pagination" aria-label="新闻按日分页">
            <Link
              href={makeHref(Math.max(meta.page - 1, 1))}
              aria-disabled={meta.page <= 1}
              className={meta.page <= 1 ? "is-disabled" : undefined}
              tabIndex={meta.page <= 1 ? -1 : undefined}
            >
              较新一天
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
              较早一天
            </Link>
          </nav>
        </>
      )}

      <footer className="news-method-note">
        <span>选编说明</span>
        <p>
          七个方向各优先选编 3—5 条，兼顾研究、实现、测试与部署。逐条阅读一手来源，
          标明原始日期；信息不足时说明覆盖缺口，不用重复旧闻凑数。
        </p>
      </footer>
    </main>
  );
}
