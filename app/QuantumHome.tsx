"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AudioLines,
  BookOpen,
  Box,
  CircleDot,
  Fingerprint,
  Layers3,
  Mouse,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navigation from "./home/Navigation";
import QuantumField from "./home/QuantumField";
import QuantumLab from "./home/QuantumLab";
import BrandStory from "./home/BrandStory";
import { ActionLink, RollingLabel, TextLink } from "./home/Actions";
import {
  Counter,
  MotionProvider,
  MotionToggle,
  ReadingProgress,
  Reveal,
} from "./home/Motion";
import s from "./QuantumHome.module.css";

const algorithms = ["ML-KEM", "ML-DSA", "SLH-DSA", "FN-DSA"];

function Hero() {
  const [field, setField] = useState<"orbit" | "sphere">("orbit");
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.heroAmbient} aria-hidden />
      <div className={s.heroInner}>
        <div className={s.heroCopy}>
          <a href="#lab" className={s.announcement}>
            <span className={s.statusDot} />
            量子探索实验室，现已开启
          </a>
          <p className={s.heroEyebrow}>
            A SMALL EXPLORER. AN INFINITE UNIVERSE.
          </p>
          <h1 id="hero-title">
            <span>好奇无界。</span>
            <span className={s.heroAccent}>未来可期。</span>
          </h1>
          <p className={s.heroDescription}>
            让复杂科技，变成触手可及的奇遇。
            <br />
            和量仔一起，探索量子世界的无限可能。
          </p>
          <div className={s.actions}>
            <ActionLink href="/storybook">开启量子之旅</ActionLink>
            <TextLink href="#lab">探索技术实验室</TextLink>
          </div>
          <div className={s.heroSignature}>
            <span />
            好奇心驱动
            <span className={s.signatureDivider} />
            生来向未来
          </div>
        </div>
        <div className={s.heroVisual}>
          <div className={s.fieldGlow} aria-hidden />
          <QuantumField mode={field} />
          <div className={s.guardianFloat}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={s.guardian}
              src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
              width="1024"
              height="1536"
              fetchPriority="high"
              alt="白色战甲、蓝色天线的量仔，悬浮在量子粒子场中央"
            />
          </div>
          <div className={s.visualCaption}>
            <span className={s.crosshair} aria-hidden>
              +
            </span>
            <div>
              LIANGZAI / 量仔<small>来自量子星的探索者</small>
            </div>
          </div>
          <div className={s.fieldCoordinates} aria-hidden>
            QUANTUM FIELD / 001
            <br />
            STATE: CURIOUS
          </div>
          <div
            className={s.fieldControl}
            aria-label="粒子场形态"
            data-selected={field === "orbit" ? 0 : 1}
          >
            <button
              aria-pressed={field === "orbit"}
              onClick={() => setField("orbit")}
            >
              <CircleDot size={14} aria-hidden />
              量子环
            </button>
            <button
              aria-pressed={field === "sphere"}
              onClick={() => setField("sphere")}
            >
              <Box size={14} aria-hidden />
              星球
            </button>
          </div>
          <span className={s.fieldHint}>移动指针，感受量子场</span>
        </div>
      </div>
      <div className={s.heroBottom}>
        <a href="#universe" className={s.scrollCue}>
          <span>
            <Mouse size={17} strokeWidth={1.3} aria-hidden />
          </span>
          向下探索<small>SCROLL TO DISCOVER</small>
        </a>
        <span className={s.heroBottomBrand}>科技有深度，好奇无边界。</span>
        <MotionToggle />
      </div>
    </section>
  );
}

function Universe() {
  return (
    <section
      id="universe"
      className={s.universe}
      aria-labelledby="universe-title"
    >
      <div className={s.container}>
        <Reveal className={s.sectionHeading}>
          <div>
            <p className={s.kicker}>01 / A UNIVERSE OF POSSIBILITIES</p>
            <h2 id="universe-title">
              不止想象。
              <br />
              <span>现在，亲自探索。</span>
            </h2>
          </div>
          <p>
            从沉浸故事到硬核密码学，
            <br />
            每一次好奇，都有新的入口。
          </p>
        </Reveal>
        <div className={s.bento}>
          <Reveal className={s.storyCell}>
            <Link href="/storybook" className={`${s.bentoCard} ${s.storyCard}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/book-v2/00-cover.webp"
                width="1600"
                height="900"
                alt="量仔与奶龙站在发光的量子星前"
                loading="lazy"
              />
              <div className={s.cardTop}>
                <span>
                  <BookOpen size={14} aria-hidden />
                  THE STORY
                </span>
                <span className={s.cardPill}>11 页互动故事</span>
              </div>
              <div className={s.storyCopy}>
                <p>勇气、友谊，还有一点量子魔法。</p>
                <h3>
                  欢迎来到
                  <br />
                  量子星。
                </h3>
                <span>和量仔、奶龙一起，迎战 Shor 大魔王。</span>
                <div className={s.cardLink}>
                  <RollingLabel>翻开量子星守护者</RollingLabel>
                  <span className={s.cardIndex} aria-hidden>
                    01 / STORY
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
          <Reveal className={s.arsenalCell} delay={0.08}>
            <Link
              href="/pqc-arsenal"
              className={`${s.bentoCard} ${s.arsenalCard}`}
            >
              <div className={s.cardTop}>
                <span>
                  <ShieldCheck size={14} aria-hidden />
                  THE ARSENAL
                </span>
              </div>
              <div className={s.arsenalVisual} aria-hidden>
                <div className={s.algorithmStack}>
                  <div>
                    <ShieldCheck size={32} strokeWidth={1} />
                    <code>ML-KEM</code>
                  </div>
                  <div>
                    <Fingerprint size={32} strokeWidth={1} />
                    <code>ML-DSA</code>
                  </div>
                  <div>
                    <Layers3 size={32} strokeWidth={1} />
                    <code>SLH-DSA</code>
                  </div>
                </div>
              </div>
              <div className={s.arsenalCopy}>
                <span className={s.miniLabel}>POST-QUANTUM CRYPTOGRAPHY</span>
                <h3>
                  未来的安全感，
                  <br />
                  从这里开始。
                </h3>
                <p>认识 4 种抗量子算法，找到你的守护之力。</p>
                <span className={s.inlineLink}>
                  <RollingLabel>进入 PQC 武器库</RollingLabel>
                </span>
              </div>
            </Link>
          </Reveal>
          <Reveal className={s.signalCell} delay={0.12}>
            <a href="#lab" className={`${s.bentoCard} ${s.signalCard}`}>
              <div className={s.cardTop}>
                <span>
                  <ScanLine size={14} aria-hidden />
                  MAKE IT VISIBLE
                </span>
              </div>
              <div className={s.signalArt} aria-hidden>
                <AudioLines size={86} strokeWidth={0.8} />
                <div>
                  <span>ek</span>
                  <i />
                  <span>K</span>
                </div>
              </div>
              <h3>
                让秘密，
                <br />
                在眼前发生。
              </h3>
              <p>点一步，读懂一次密钥封装。</p>
            </a>
          </Reveal>
          <Reveal className={s.archiveCell} delay={0.18}>
            <Link href="/archive" className={`${s.bentoCard} ${s.archiveCard}`}>
              <div className={s.cardTop}>
                <span>THE ORIGINAL</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/characters-v2/archive-hero.webp"
                width="1122"
                height="1402"
                alt="量仔的纸感角色档案"
                loading="lazy"
              />
              <div>
                <span className={s.miniLabel}>PERSONAL FILE 000</span>
                <h3>认识量仔。</h3>
                <p>小小身躯，大大宇宙。</p>
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className={s.stats} aria-label="探索内容一览">
      <div className={s.container}>
        <Reveal className={s.statsInner}>
          <div className={s.statsIntro}>
            <p className={s.kicker}>02 / MORE TO EXPLORE</p>
            <h2>
              把好奇，
              <br />
              变成看得见的收获。
            </h2>
            <p>这里的每一个数字，都是一个探索起点。</p>
          </div>
          <Counter
            value={4}
            label="种抗量子算法"
            detail="封装 · 签名 · 参数探索"
          />
          <Counter
            value={11}
            label="页沉浸式故事"
            detail="翻页 · 旁白 · 量子冒险"
          />
          <Counter
            value={3}
            label="种探索方式"
            detail="故事 · 知识 · 角色档案"
          />
        </Reveal>
      </div>
    </section>
  );
}

function Laboratory() {
  return (
    <section id="lab" className={s.lab} aria-labelledby="lab-title">
      <div className={s.container}>
        <Reveal className={s.sectionHeading}>
          <div>
            <p className={s.kicker}>03 / UNDER THE SURFACE</p>
            <h2 id="lab-title">
              看不见的科技。
              <br />
              <span>看得懂的力量。</span>
            </h2>
          </div>
          <p>
            从一个公钥，到一次信任。
            <br />
            亲手切换步骤，看懂密码学如何工作。
          </p>
        </Reveal>
        <Reveal>
          <QuantumLab />
        </Reveal>
        <Reveal className={s.algorithmRail}>
          <TextLink href="/pqc-arsenal#weapons">继续深入武器库</TextLink>
          <div>
            {algorithms.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeaturedStory() {
  return (
    <section className={s.featured} aria-labelledby="featured-title">
      <div className={s.container}>
        <Reveal className={s.featuredHeading}>
          <p className={s.kicker}>04 / BEYOND THE ORDINARY</p>
          <h2 id="featured-title">
            每一次突破，<span>都有故事。</span>
          </h2>
          <TextLink href="/storybook">发现完整故事</TextLink>
        </Reveal>
        <Reveal>
          <Link className={s.cinematic} href="/storybook">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/book-v2/08-fusion.webp"
              alt="量仔与奶龙合体为靓龙，在量子宇宙中并肩守护"
              width="1600"
              height="900"
              loading="lazy"
            />
            <span className={s.cinematicLabel}>
              <Sparkles size={14} aria-hidden />
              THE POWER OF TOGETHER
            </span>
            <div className={s.cinematicCopy}>
              <p>量子星守护者 / 高光时刻</p>
              <h3>
                一份勇气。
                <br />
                无限可能。
              </h3>
              <span>当精确与勇敢相遇，新的力量就此诞生。</span>
            </div>
            <span className={s.cinematicButton}>
              <BookOpen size={17} strokeWidth={1.3} aria-hidden />
              <RollingLabel>进入故事</RollingLabel>
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className={s.closing} aria-labelledby="closing-title">
      <div className={s.closingGlow} aria-hidden />
      <Reveal>
        <p className={s.kicker}>THE FUTURE IS AN OPEN QUESTION.</p>
        <h2 id="closing-title">
          保持好奇。
          <br />
          <span>下一站，无限。</span>
        </h2>
        <p>宇宙很大，好奇心更大。你的故事，从这里开始。</p>
        <ActionLink href="/storybook">量仔，带我去看看</ActionLink>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerTop}>
        <div>
          <Link href="/" className={s.footerBrand}>
            量仔<span>LIANGZAI</span>
          </Link>
          <p>来自量子星，连接每一种可能。</p>
        </div>
        <nav aria-label="页脚导航">
          <TextLink href="/storybook">量仔故事</TextLink>
          <TextLink href="/pqc-arsenal">PQC 武器库</TextLink>
          <TextLink href="/archive">角色档案</TextLink>
          <TextLink href="#main-content">回到顶部</TextLink>
        </nav>
      </div>
      <div className={s.footerBottom}>
        <span>LIANGZAI · STAY CURIOUS. GO FURTHER.</span>
        <span>
          <i />
          好奇心，永远在线。
        </span>
      </div>
    </footer>
  );
}

export default function QuantumHome() {
  return (
    <MotionProvider>
      <a className={s.skip} href="#main-content">
        跳到主要内容
      </a>
      <ReadingProgress />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Universe />
        <Stats />
        <Laboratory />
        <FeaturedStory />
        <BrandStory />
        <Closing />
      </main>
      <Footer />
    </MotionProvider>
  );
}
