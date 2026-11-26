import type { Metadata } from "next";
import Link from "next/link";
import { MotionSurface } from "../experience/Motion";
import MilkSurface from "../milk/MilkSurface";
import FloatingIdentity from "./FloatingIdentity";
import { getSiteLanguage } from "../i18n/site-language";
import "./about.css";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getSiteLanguage();
  return messages.about.metadata;
}

const journey = [
  { id: "work", year: "2025" },
  { id: "master", year: "2022" },
  { id: "bachelor", year: "2018" },
] as const;
const focus = [
  { id: "pqc", verb: "量" },
  { id: "protocols", verb: "守" },
  { id: "engineering", verb: "合" },
] as const;
const projects = [
  { id: "home", href: "/" },
  { id: "algorithms", href: "/pqc-arsenal" },
  { id: "lab", href: "/pqc-practice" },
] as const;

export default async function About() {
  const { messages } = await getSiteLanguage();
  const about = messages.about;
  return (
    <main id="main-content" className="milk ab-page">
      <MotionSurface>
        <section className="ab-hero" aria-labelledby="profile-title">
          <div className="ab-hero-copy">
            <p className="ab-kicker"><i className="milk-latin">{about.hero.kicker}</i>{about.hero.label}</p>
            <h1 id="profile-title" className="milk-display"><span>{about.hero.hello}</span>Yibiao</h1>
            <p className="ab-intro">{about.hero.intro}</p>
            <p className="ab-bio">{about.hero.bio}</p>
            <div className="ab-actions">
              <a className="milk-button" href="#journey">{about.journey.label}</a>
              <a className="milk-link" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <div className="ab-hero-card">
            <FloatingIdentity copy={about.card} />
            <img className="ab-hero-naiwa" src="/assets/naiwa/wave.webp" width="760" height="1140" alt={about.hero.alt} fetchPriority="high" />
          </div>
        </section>
        <nav className="ab-index" aria-label={about.index.label}>
          <span>{about.index.note}</span>
          <div><a href="#journey">{about.journey.label}</a><a href="#focus">{about.focus.label}</a><a href="#projects">{about.projects.label}</a><a href="#contact">{about.contact.label}</a></div>
        </nav>

        <section id="journey" className="ab-section" aria-labelledby="journey-title">
          <header className="ab-head" data-reveal><p className="milk-time"><b>2018 →</b>{about.journey.label}</p><h2 id="journey-title" className="milk-display">{about.journey.title}</h2><p>{about.journey.description}</p></header>
          <ol className="ab-timeline">
            {journey.map(({ id, year }) => {
              const copy = about.journey[id];
              const current = id === "work";
              return <li key={id} data-current={current} data-reveal>
                <p className="ab-year milk-latin" aria-hidden="true">{year}</p>
                <div className="ab-period"><span>{copy.period}</span><small>{copy.type}</small></div>
                <div className="ab-place"><h3 className="milk-display">{copy.place}</h3>{current && <span>{about.journey.current}</span>}<p>{copy.detail}</p></div>
                <p className="ab-body">{copy.description}</p>
              </li>;
            })}
          </ol>
        </section>

        <section id="focus" className="ab-focus milk-on-cobalt" aria-labelledby="focus-title">
          <MilkSurface className="ab-focus-surface" />
          <div className="ab-focus-inner">
            <header className="ab-head" data-reveal><p className="milk-time"><b>{about.focus.kicker}</b>{about.focus.label}</p><h2 id="focus-title" className="milk-display">{about.focus.title}</h2><p>{about.focus.description}</p></header>
            <div className="ab-focus-grid">{focus.map(({ id, verb }) => {
              const copy = about.focus[id];
              return <article key={id} data-reveal>
                <span className="ab-verb milk-display" aria-hidden="true">{verb}</span>
                <p className="ab-who">{copy.role}</p>
                <h3 className="milk-display">{copy.title}</h3>
                <p>{copy.description}</p>
                <ul>{copy.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
              </article>;
            })}</div>
          </div>
        </section>

        <section id="projects" className="ab-section" aria-labelledby="projects-title">
          <header className="ab-head" data-reveal><p className="milk-time"><b>{about.projects.kicker}</b>{about.projects.label}</p><h2 id="projects-title" className="milk-display">{about.projects.title}</h2><p>{about.projects.description}</p></header>
          <div className="ab-projects">{projects.map(({ id, href }) => {
            const Tag = href === "/pqc-practice" ? "a" : Link;
            const copy = about.projects[id];
            return <Tag href={href} key={id} data-reveal><h3 className="milk-display">{copy.title}</h3><p>{copy.description}</p><span>{copy.action}<i aria-hidden="true">→</i></span></Tag>;
          })}</div>
        </section>

        <section id="contact" className="ab-contact milk-on-cobalt" aria-labelledby="contact-title">
          <img className="ab-contact-naiwa" src="/assets/naiwa/ask.webp" width="760" height="1140" alt={about.contact.alt} loading="lazy" decoding="async" />
          <div data-reveal>
            <p className="milk-time"><b>{about.contact.kicker}</b>{about.contact.label}</p>
            <h2 id="contact-title" className="milk-display">{about.contact.title}</h2>
            <p>{about.contact.description}</p>
            <a className="milk-button" data-tone="butter" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">{about.contact.action}</a>
          </div>
          <span className="ab-signature milk-latin" aria-label="WANG YIBIAO">WANG YIBIAO</span>
        </section>
      </MotionSurface>
    </main>
  );
}
