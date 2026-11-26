import Link from "next/link";
import { Suspense } from "react";
import { MotionSurface } from "./experience/Motion";
import HomeDispatch from "./studio/HomeDispatch";
import Greeting from "./milk/Greeting";
import NaiwaAsks from "./milk/NaiwaAsks";
import MilkSurface from "./milk/MilkSurface";
import { coreCategories } from "./news/news-api";
import { getSiteLanguage } from "./i18n/site-language";
import "./milk/home.css";

const day = [
  { time: "08:10", section: "morning" },
  { time: "14:00", section: "noon" },
  { time: "18:30", section: "family" },
  { time: "21:30", section: "night" },
] as const;

const family = [
  { id: "liangzai", verb: "量", image: "/assets/characters-v2/arsenal-liangzai-cutout.webp", width: 1024, height: 1536 },
  { id: "naiwa", verb: "守", image: "/assets/naiwa/stand.webp", width: 760, height: 1140 },
] as const;

export default async function QuantumHome() {
  const { messages } = await getSiteLanguage();
  const home = messages.home;
  return (
    <MotionSurface className="mk-film">
      <main id="main-content" className="milk mk-home">
        <section className="mk-hero milk-on-cobalt" aria-labelledby="home-title">
          <div className="mk-hero-copy">
            <Greeting copy={home.greeting} />
            <h1 id="home-title" className="milk-display">{home.hero.title}</h1>
            <p className="mk-lede">{home.hero.description}</p>
            <div className="mk-actions">
              <Link className="milk-button" data-tone="butter" href="/news">{home.hero.news}</Link>
              <Link className="milk-link" href="/about">{home.hero.about}</Link>
              <Link className="milk-link" href="/play">{home.hero.play}</Link>
            </div>
          </div>
          <NaiwaAsks copy={home.naiwa} />
          <nav className="mk-day" aria-label={home.day.label}>
            {day.map(({ section, time }) => {
              const [part, label] = home.day[section];
              return <a key={section} href={`#${section}`}><b className="milk-latin">{time}</b><span><small>{part}</small>{label}</span></a>;
            })}
          </nav>
          <MilkSurface className="mk-hero-surface" />
        </section>

        <section className="mk-section mk-morning" id="morning" aria-labelledby="morning-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>08:10</b>{home.morning.time}</p>
            <h2 id="morning-title" className="milk-display">{home.morning.title}</h2>
            <p>{home.morning.description}</p>
          </header>
          <nav className="mk-topics" aria-label={home.morning.categories}>{coreCategories.map(category => <Link key={category} href={`/news?category=${category}`}>{messages.chrome.categories[category]}</Link>)}</nav>
          <Suspense fallback={<div className="mk-dispatch-empty" role="status"><p>{home.morning.loading}</p><Link className="milk-link" href="/news">{home.morning.loadingLink}</Link></div>}><HomeDispatch /></Suspense>
          <div className="mk-morning-foot">
            <div><Link href="/news" className="milk-link">{home.morning.briefing}</Link><Link href="/tracking" className="milk-link">{home.morning.tracking}</Link><Link href="/topics" className="milk-link">{home.morning.topics}</Link></div>
            <div className="mk-subscribe"><p>{home.morning.subscribe}<span>{home.morning.approval}</span></p><Link href="/news/subscribe" className="milk-button">{home.morning.subscribeLink}</Link></div>
          </div>
        </section>

        <section className="mk-section mk-noon" id="noon" aria-labelledby="noon-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>14:00</b>{home.noon.time}</p>
            <h2 id="noon-title" className="milk-display">{home.noon.title}</h2>
            <p>{home.noon.description}</p>
          </header>
          <div className="mk-lab" data-reveal>
            <div className="mk-lab-copy">
              <p className="mk-lab-kicker milk-latin">{home.noon.kicker}</p>
              <h3 className="milk-display">{home.noon.labTitle}</h3>
              <p>{home.noon.labDescription}</p>
              <div className="mk-actions"><a className="milk-button" data-tone="milk" href="/pqc-practice">{home.noon.lab}</a><Link className="milk-link" href="/pqc-arsenal">{home.noon.algorithms}</Link></div>
              <ul className="mk-lab-meta" aria-label={home.noon.available}><li>ML-KEM</li><li>ML-DSA</li><li>SLH-DSA</li><li>SM2</li></ul>
            </div>
            <div className="mk-lab-stage" aria-hidden="true">
              <span className="mk-lab-key" data-side="a">pk</span><span className="mk-lab-key" data-side="b">ct</span>
              <img src="/assets/characters-v2/arsenal-liangzai-cutout.webp" width="1024" height="1536" alt="" loading="lazy" decoding="async" />
            </div>
          </div>
          <dl className="mk-engineering" data-reveal>
            {Object.entries(home.noon.engineering).map(([key, [title, description]]) => (
              <div key={key}><dt>{title}</dt><dd>{description}</dd></div>
            ))}
          </dl>
          <p className="mk-more" data-reveal>{home.noon.more}<Link className="milk-link" href="/research">{home.noon.research}</Link><Link className="milk-link" href="/topics">{home.noon.topics}</Link></p>
        </section>

        <section className="mk-section mk-family" id="family" aria-labelledby="family-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>18:30</b>{home.family.time}</p>
            <h2 id="family-title" className="milk-display">{home.family.title}</h2>
            <p>{home.family.description}</p>
          </header>
          <ul className="mk-family-grid">
            {family.map(member => {
              const copy = home.family[member.id];
              return <li key={member.id} data-member={member.id} data-reveal>
                <Link href={`/archive#${member.id}`}>
                  <span className="mk-family-verb milk-display" aria-hidden="true">{member.verb}</span>
                  <img src={member.image} width={member.width} height={member.height} alt={copy.alt} loading="lazy" decoding="async" />
                  <div><p className="milk-latin">{copy.role}</p><h3 className="milk-display">{copy.name}</h3><p>{copy.description}</p><span className="mk-family-action">{copy.action}<i aria-hidden="true"> →</i></span></div>
                </Link>
              </li>;
            })}
          </ul>
          <p className="mk-more" data-reveal>{home.family.more}<Link className="milk-link" href="/models">{home.family.models}</Link><Link className="milk-link" href="/archive">{home.family.archive}</Link></p>
        </section>

        <section className="mk-night milk-on-night" id="night" aria-labelledby="night-title">
          <MilkSurface className="mk-night-surface" />
          <div className="mk-night-inner">
            <div className="mk-night-copy" data-reveal>
              <p className="milk-time"><b>21:30</b>{home.night.time}</p>
              <h2 id="night-title" className="milk-display">{home.night.title}</h2>
              <p>{home.night.description}</p>
              <div className="mk-actions"><Link className="milk-button" data-tone="butter" href="/storybook">{home.night.story}</Link><Link className="milk-link" href="/archive">{home.night.archive}</Link></div>
            </div>
            <figure className="mk-night-book" data-reveal>
              <img className="mk-night-cover" src="/assets/book-v2/00-cover.webp" width="1600" height="900" alt={home.night.coverAlt} loading="lazy" decoding="async" />
              <img className="mk-night-listener" src="/assets/naiwa/book.webp" width="760" height="1140" alt={home.night.listenerAlt} loading="lazy" decoding="async" />
            </figure>
          </div>
        </section>
      </main>
    </MotionSurface>
  );
}
