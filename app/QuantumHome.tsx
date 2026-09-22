"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import s from "./QuantumHome.module.css";

const modes = [
  {
    name: "探索",
    en: "CURIOUS BY NATURE",
    title: "每一个问号，都是新世界的入口。",
    description:
      "跟着量仔，把陌生的量子世界变成一场看得见、玩得懂的探索。从一个故事开始，让好奇心带你走得更远。",
    color: "#8edfff",
    image: "/assets/characters-v2/archive-origin.webp",
    alt: "量仔探索量子世界的起源档案",
    href: "/archive",
    action: "认识量仔",
  },
  {
    name: "守护",
    en: "BRAVE BY DESIGN",
    title: "面对未知，也有向前的勇气。",
    description:
      "当 Shor 大魔王来袭，量仔选择寻找新的答案。走进 PQC 武器库，了解密钥封装与数字签名各自的任务。",
    color: "#bda9ff",
    image: "/assets/characters-v2/archive-battle.webp",
    alt: "量仔迎战 Shor 大魔王的故事画面",
    href: "/pqc-arsenal",
    action: "探索 PQC 武器库",
  },
  {
    name: "同行",
    en: "BETTER TOGETHER",
    title: "最强大的超能力，是有你同行。",
    description:
      "一个负责精确，一个负责勇敢。和量仔、奶龙一起翻开量子星的冒险，见证老朋友再次并肩的高光时刻。",
    color: "#ffe0a3",
    image: "/assets/characters-v2/archive-alliance-v2.webp",
    alt: "量仔和奶龙并肩同行",
    href: "/storybook",
    action: "翻开他们的故事",
  },
] as const;

export default function QuantumHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const mode = modes[active];

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", close);
      desktop.removeEventListener("change", resize);
    };
  }, [menuOpen]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      paused ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    heroRef.current?.style.setProperty(
      "--px",
      `${((event.clientX - rect.left) / rect.width - 0.5) * 14}px`,
    );
    heroRef.current?.style.setProperty(
      "--py",
      `${((event.clientY - rect.top) / rect.height - 0.5) * 10}px`,
    );
  }
  function reset() {
    heroRef.current?.style.setProperty("--px", "0px");
    heroRef.current?.style.setProperty("--py", "0px");
  }

  return (
    <div className={s.site} data-motion={paused ? "paused" : "active"}>
      <a className={s.skip} href="#main-content">
        跳到主要内容
      </a>
      <header className={s.header}>
        <div className={s.navbar}>
          <Link href="/" className={s.brand} aria-label="量仔首页">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" width="30" height="30" alt="" />
            <span>
              量仔<small>LIANGZAI</small>
            </span>
          </Link>
          <nav className={s.desktopNav} aria-label="主导航">
            <a href="#universe">探索宇宙</a>
            <Link href="/storybook">动画故事</Link>
            <Link href="/pqc-arsenal">PQC 武器库</Link>
            <Link href="/archive">关于量仔</Link>
          </nav>
          <Link href="/storybook" className={s.navCta}>
            开启冒险 <span aria-hidden="true">↗</span>
          </Link>
          <button
            ref={menuRef}
            className={s.menuButton}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "关闭" : "菜单"}
          </button>
        </div>
        <nav
          id="mobile-navigation"
          className={s.mobileNav}
          aria-label="移动端导航"
          hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        >
          <a href="#universe">
            探索宇宙 <span aria-hidden="true">↗</span>
          </a>
          <Link href="/storybook">
            动画故事 <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/pqc-arsenal">
            PQC 武器库 <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/archive">
            关于量仔 <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>
                <span className={s.liveDot} aria-hidden="true" /> HELLO, QUANTUM
                WORLD
              </p>
              <h1 id="hero-title">
                小小量仔。
                <br />
                <span>大有可为。</span>
              </h1>
              <p className={s.description}>
                来自量子星，生来充满好奇。
                <br />
                和我一起，把未来变成一场冒险。
              </p>
              <div className={s.actions}>
                <Link href="/storybook" className={s.primary}>
                  进入量子宇宙 <span aria-hidden="true">↗</span>
                </Link>
                <a href="#universe" className={s.secondary}>
                  发现更多 <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className={s.signature}>
                <span>好奇心驱动</span>
                <i aria-hidden="true" />
                <span>勇气永远在线</span>
              </div>
            </div>
            <div
              ref={heroRef}
              className={s.visual}
              onPointerMove={move}
              onPointerLeave={reset}
            >
              <div className={s.glow} aria-hidden="true" />
              <span className={s.watermark} aria-hidden="true">
                Q.
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={s.guardian}
                src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
                width="1024"
                height="1536"
                alt="量仔：白色战甲、蓝色天线与发光双眼的量子星守护者"
                fetchPriority="high"
              />
              <div className={s.characterLabel}>
                <i aria-hidden="true" />
                <span>
                  LIANGZAI<small>你的量子探索搭子</small>
                </span>
              </div>
              <span className={s.coordinate} aria-hidden="true">
                ORIGIN / QUANTUM STAR
              </span>
            </div>
          </div>
          <div className={s.heroBottom}>
            <a href="#universe" className={s.scrollCue}>
              <span aria-hidden="true">↓</span> 向下探索，可能不止一种
            </a>
            <button
              className={s.motionButton}
              aria-pressed={paused}
              onClick={() => {
                reset();
                setPaused(!paused);
              }}
            >
              {paused ? "开启动效" : "暂停动效"}
              <span aria-hidden="true">{paused ? "＋" : "Ⅱ"}</span>
            </button>
          </div>
        </section>

        <section
          id="universe"
          className={s.universe}
          aria-labelledby="universe-title"
        >
          <div className={s.sectionHeading}>
            <div>
              <p className={s.kicker}>A UNIVERSE OF POSSIBILITIES</p>
              <h2 id="universe-title">
                一个量仔。<span>不止一种可能。</span>
              </h2>
            </div>
            <p>
              从奇妙故事，到硬核知识。
              <br />
              选一个入口，开启你的探索。
            </p>
          </div>
          <div className={s.cards}>
            <Link href="/storybook" className={`${s.card} ${s.storyCard}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/book-v2/00-cover.webp"
                width="1600"
                height="900"
                alt="量仔与奶龙站在发光的量子星前"
                loading="lazy"
              />
              <div className={s.cardTop}>
                <span>01 / THE STORY</span>
                <span className={s.pill}>互动动画书</span>
              </div>
              <div className={s.storyCopy}>
                <span>勇气、友谊，还有一点量子魔法。</span>
                <h3>量子星守护者</h3>
                <p>和量仔、奶龙一起，迎战 Shor 大魔王。</p>
                <span className={s.cardLink}>
                  翻开故事 <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
            <Link href="/pqc-arsenal" className={`${s.card} ${s.arsenalCard}`}>
              <div className={s.cardTop}>
                <span>02 / THE LAB</span>
                <span className={s.pill}>知识也有超能力</span>
              </div>
              <div className={s.arsenalArt} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/pqc/ml-kem-zine-030d4365.webp"
                  width="640"
                  height="1067"
                  loading="lazy"
                  alt=""
                />
              </div>
              <div className={s.arsenalCopy}>
                <p className={s.miniLabel}>MEET YOUR NEXT SUPERPOWER</p>
                <h3>PQC 武器库</h3>
                <p>让抽象的密码学，变得触手可及。</p>
                <div className={s.tags}>
                  <span>ML-KEM</span>
                  <span>ML-DSA</span>
                  <span>+ 2</span>
                </div>
                <span className={s.cardLink}>
                  探索四件武器 <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          </div>
          <Link href="/archive" className={s.archiveStrip}>
            <div>
              <span className={s.archiveIndex}>03 / THE ORIGINAL</span>
              <h3>
                想更了解我？<span>翻开量仔档案。</span>
              </h3>
            </div>
            <span className={s.archiveLink}>
              从初次苏醒，到并肩作战 <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </section>

        <section
          className={s.personality}
          aria-labelledby="personality-title"
          style={{ "--mode-color": mode.color } as CSSProperties}
        >
          <div className={s.personalityInner}>
            <div>
              <p className={s.kicker}>MORE THAN A LITTLE ROBOT</p>
              <h2 id="personality-title">
                我的内核，
                <br />
                不只有科技。
              </h2>
              <div className={s.modeButtons} aria-label="了解量仔的三种特质">
                {modes.map((item, index) => (
                  <button
                    key={item.name}
                    aria-pressed={active === index}
                    aria-controls="personality-panel"
                    onClick={() => setActive(index)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div
                id="personality-panel"
                className={s.modePanel}
                aria-live="polite"
                aria-atomic="true"
              >
                <p className={s.modeEnglish}>{mode.en}</p>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <Link href={mode.href}>
                  {mode.action} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
            <figure className={s.personalityVisual}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={mode.image}
                src={mode.image}
                alt={mode.alt}
                width="1536"
                height="1024"
                loading="lazy"
              />
              <figcaption>
                <span>THE LIANGZAI SPIRIT</span>
                <span>0{active + 1} / 03</span>
              </figcaption>
            </figure>
          </div>
        </section>
        <section className={s.closing} aria-labelledby="closing-title">
          <p className={s.kicker}>STAY CURIOUS. GO FURTHER.</p>
          <h2 id="closing-title">
            下一站，<span>一起出发。</span>
          </h2>
          <p>宇宙很大，好奇心更大。你的故事，从这里开始。</p>
          <Link href="/storybook" className={s.primary}>
            量仔，带我去看看 <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
      <footer className={s.footer}>
        <Link href="/" className={s.footerBrand}>
          量仔 <span>LIANGZAI</span>
        </Link>
        <p>来自量子星，连接每一种可能。</p>
        <nav aria-label="页脚导航">
          <Link href="/archive">角色档案</Link>
          <Link href="/pqc-arsenal">PQC 武器库</Link>
          <a href="#main-content">回到顶部 ↑</a>
        </nav>
      </footer>
    </div>
  );
}
