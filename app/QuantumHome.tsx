"use client";
import { useRef } from "react";
import Link from "next/link";
import {
  gsap,
  useGSAP,
  usePageMotion,
  useExperience,
} from "./experience/Motion";
import QuantumSculpture from "./experience/QuantumSculpture";
import FilmDialog from "./experience/FilmDialog";

const paths = [
  {
    no: "01",
    en: "THE STORY",
    name: "一场关于守护的\n宇宙冒险。",
    body: "量仔 × 奶龙。11 页故事，一次穿越未知的旅程。",
    href: "/storybook",
    image: "/assets/book-v2/08-fusion.webp",
    alt: "量仔与奶龙合体后的蓝金守护者",
  },
  {
    no: "02",
    en: "THE ARSENAL",
    name: "面向未来的\n安全感。",
    body: "从数学直觉，到后量子密码的四种守护之力。",
    href: "/pqc-arsenal",
    image: "/assets/cinematic/quantum-portal-v1.webp",
    alt: "冰蓝色光芒环绕的金属量子门",
  },
  {
    no: "03",
    en: "THE GUARDIAN",
    name: "小小量仔。\n大有可为。",
    body: "一根接收星光的天线，一颗始终在线的好奇心。",
    href: "/archive",
    image: "/assets/characters-v2/arsenal-liangzai-cutout.webp",
    alt: "量仔的蓝白战甲全身形象",
  },
];
export default function QuantumHome() {
  const root = useRef<HTMLElement>(null),
    hero = useRef<HTMLElement>(null),
    track = useRef<HTMLDivElement>(null),
    chapter = useRef<HTMLElement>(null);
  const { enabled } = useExperience();
  usePageMotion(root);
  useGSAP(
    () => {
      if (!enabled) return;
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1101px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: hero.current,
                start: "top top",
                end: "bottom top",
                scrub: 1,
              },
            })
            .to(".portal-image", { scale: 1.14, yPercent: 12 }, 0)
            .to(".portal-copy", { yPercent: 26, opacity: 0.2 }, 0)
            .to(".hero-guardian", { yPercent: -16, rotation: 4 }, 0);
          const rail = track.current!;
          gsap.to(rail, {
            x: () =>
              -Math.max(
                0,
                rail.scrollWidth - chapter.current!.clientWidth + 96,
              ),
            ease: "none",
            scrollTrigger: {
              trigger: chapter.current,
              start: "top 78px",
              end: () =>
                `+=${Math.max(650, rail.scrollWidth - chapter.current!.clientWidth)}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
        },
        root,
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
  return (
    <main ref={root} id="main-content" className="cinematic-home">
      <section ref={hero} className="portal-hero" aria-labelledby="home-title">
        <div className="portal-scene" aria-hidden="true">
          <img
            className="portal-image"
            src="/assets/cinematic/quantum-portal-v1.webp"
            alt=""
            width="1672"
            height="941"
            fetchPriority="high"
          />
          <div className="portal-shade" />
        </div>
        <div className="portal-copy">
          <p className="eyebrow" data-intro>
            <span className="status-light" /> A LITTLE CURIOSITY. AN INFINITE
            UNIVERSE.
          </p>
          <h1 id="home-title" data-title>
            让想象，
            <br />
            <em>穿越边界。</em>
          </h1>
          <p className="hero-summary" data-intro>
            走近量子世界。
            <br />
            和量仔一起，把未知变成可能。
          </p>
          <div className="hero-actions" data-intro>
            <Link className="silver-button" data-magnetic href="/storybook">
              <span>开启探索</span>
              <i aria-hidden="true" />
            </Link>
            <FilmDialog />
          </div>
        </div>
        <div className="hero-guardian" data-intro>
          <img
            src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
            alt="蓝白战甲的量仔，漂浮在量子门前"
            width="1024"
            height="1536"
          />
          <span>LIANGZAI / Q–∞</span>
        </div>
        <div className="hero-baseline">
          <a href="#worlds">
            <i aria-hidden="true" />
            向下，发现更多
          </a>
          <span>EST. IN CURIOSITY</span>
          <span>01 — 05 / EXPLORE THE UNKNOWN</span>
        </div>
      </section>
      <section
        className="manifesto section-wrap"
        aria-labelledby="manifesto-title"
      >
        <p className="eyebrow" data-reveal>
          BEYOND WHAT YOU KNOW
        </p>
        <h2 id="manifesto-title" data-reveal>
          世界很大。
          <br />
          好奇心，<span className="silver-text">可以更大。</span>
        </h2>
        <div className="manifesto-bottom" data-reveal>
          <span className="orbital-symbol" aria-hidden="true">
            ✳
          </span>
          <p>
            这里是量仔的探索宇宙。
            <br />
            让深奥的科学有温度，让看不见的技术被看见。
            <br />
            一个故事，一次实验，一个通向未来的入口。
          </p>
        </div>
      </section>
      <section
        id="worlds"
        ref={chapter}
        className="worlds-section"
        aria-labelledby="worlds-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / ENTER THE UNIVERSE</p>
            <h2 id="worlds-title">
              三个世界。<em>无限可能。</em>
            </h2>
          </div>
          <span className="micro-label">滚动探索 · 点击进入</span>
        </div>
        <div className="world-track" ref={track}>
          {paths.map((p, i) => (
            <Link
              className={`world-card world-card-${i}`}
              href={p.href}
              key={p.no}
            >
              <div className="world-card-image">
                <img src={p.image} alt={p.alt} loading="lazy" />
              </div>
              <div className="world-card-top">
                <span>{p.en}</span>
                <span>{p.no} / 03</span>
              </div>
              <div className="world-card-copy">
                <h3>{p.name}</h3>
                <p>{p.body}</p>
                <span className="card-enter">
                  进入这个世界<span aria-hidden="true">＋</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section
        className="field-section section-wrap"
        id="lab"
        aria-labelledby="field-title"
      >
        <div className="field-copy" data-reveal>
          <p className="eyebrow">02 / MAKE THE INVISIBLE VISIBLE</p>
          <h2 id="field-title">
            触碰。
            <br />
            改变。
            <br />
            <em>感受共振。</em>
          </h2>
          <p>
            有些世界，需要亲手探索。
            <br />
            移动指针，切换形态，看粒子在秩序与想象之间流动。
          </p>
          <Link className="line-link" href="/pqc-arsenal#math">
            从直觉，走进密码学
          </Link>
          <small>交互艺术 · 不表示真实量子态</small>
        </div>
        <QuantumSculpture />
      </section>
      <section className="cinema-banner" aria-labelledby="cinema-title">
        <img
          data-parallax="10"
          src="/assets/book-v2/09-final-battle.webp"
          alt="靓龙以晶格剑和护盾迎战 Shor"
          loading="lazy"
        />
        <div className="cinema-vignette" />
        <div className="cinema-copy" data-reveal>
          <p className="eyebrow">03 / COURAGE IS A SHARED SECRET</p>
          <h2 id="cinema-title">
            所有伟大的冒险，
            <br />
            都始于<span>并肩。</span>
          </h2>
          <p>精确与勇气相遇。新的力量，从此诞生。</p>
          <Link className="silver-button" data-magnetic href="/storybook">
            进入量子星守护者
            <i aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="human-teaser section-wrap">
        <div data-reveal>
          <p className="eyebrow">04 / THE HUMAN BEHIND THE SIGNAL</p>
          <h2>
            量仔背后，
            <br />
            是一个<span className="silver-text">认真探索的人。</span>
          </h2>
        </div>
        <div className="human-teaser-copy" data-reveal>
          <p>
            在算法与协议之间，寻找安全的答案。
            <br />
            在技术与表达之间，让复杂的事变得易懂。
          </p>
          <Link className="line-link" href="/about">
            认识量仔背后的人
          </Link>
          <span>CRYPTOGRAPHY / ENGINEERING / CURIOSITY</span>
        </div>
      </section>
    </main>
  );
}
