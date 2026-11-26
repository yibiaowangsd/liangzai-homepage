import Link from "next/link";
import { newsStoryHref } from "../news/navigation";
import StoryImage from "../news/StoryImage";
import { coreCategories, formatEditionDate, getFeaturedNews } from "../news/news-api";
import { defaultLocale, formatMessage } from "../i18n/locales";
import { getSiteLanguage } from "../i18n/site-language";

export default async function HomeDispatch() {
  const { locale, messages } = await getSiteLanguage();
  const copy = messages.home.morning;
  const categories: Record<string, string> = messages.chrome.categories;
  let edition: Awaited<ReturnType<typeof getFeaturedNews>> | null = null;
  try {
    edition = await getFeaturedNews(coreCategories.length, AbortSignal.timeout(2500));
  } catch {
    // The rest of the homepage remains usable when the news service is unavailable.
  }
  const items = edition?.data.slice(0, coreCategories.length) || [];
  if (!items.length) return <div className="mk-dispatch-empty"><p>{copy.unavailable}</p><Link className="milk-link" href="/news">{copy.newsLink}</Link></div>;
  const [lead, ...rest] = items;
  const date = edition?.edition_date;
  return <div className="mk-dispatch">
    <p className="mk-dispatch-date">
      <span>{copy.latest}</span>
      {date ? <time dateTime={date}>{formatEditionDate(date, locale)}</time> : <span>{copy.edition}</span>}
      <span>{formatMessage(copy.featured, { count: items.length })}</span>
      {copy.articleLanguage && <span>{copy.articleLanguage}</span>}
    </p>
    <article className="mk-lead">
      <Link href={newsStoryHref(lead.slug, "/news")}>
        <div className="mk-lead-image"><StoryImage item={lead} eager /></div>
        <p className="mk-story-meta">{Object.hasOwn(categories, lead.category) ? categories[lead.category] : lead.category} · {lead.source_name || copy.source}</p>
        <h3 lang={defaultLocale}>{lead.title}</h3>
        <p className="mk-lead-summary" lang={defaultLocale}>{lead.summary}</p>
      </Link>
    </article>
    {rest.length > 0 && <ol className="mk-stories">{rest.map(item => <li key={item.slug}>
      <Link href={newsStoryHref(item.slug, "/news")}>
        <p className="mk-story-meta">{Object.hasOwn(categories, item.category) ? categories[item.category] : item.category} · {item.source_name || copy.source}</p>
        <h3 lang={defaultLocale}>{item.title}</h3>
      </Link>
    </li>)}</ol>}
  </div>;
}
