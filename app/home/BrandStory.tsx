"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { m } from "framer-motion";
import { Reveal, useMotionPreference } from "./Motion";
import s from "../QuantumHome.module.css";

const modes = [
  {
    name: "探索",
    en: "CURIOUS BY NATURE",
    title: "每一个问号，都是新世界的入口。",
    description:
      "来自量子星，生来充满好奇。量仔把复杂的科学变成看得见、玩得懂的探索，让每个人都能走近未来。",
    image: "archive-origin.webp",
    alt: "量仔探索量子世界的起源档案",
    href: "/archive",
    action: "认识量仔",
  },
  {
    name: "守护",
    en: "BRAVE BY DESIGN",
    title: "面对未知，也有向前的勇气。",
    description:
      "当 Shor 大魔王来袭，量仔选择寻找新的答案。从密钥封装到数字签名，和量仔一起了解抗量子密码的力量。",
    image: "archive-battle.webp",
    alt: "量仔迎战 Shor 大魔王",
    href: "/pqc-arsenal",
    action: "探索 PQC 武器库",
  },
  {
    name: "同行",
    en: "BETTER TOGETHER",
    title: "最强大的超能力，是有你同行。",
    description:
      "一个负责精确，一个负责勇敢。和量仔、奶龙一起翻开量子星的冒险，见证老朋友再次并肩的高光时刻。",
    image: "archive-alliance-v2.webp",
    alt: "量仔和奶龙并肩同行",
    href: "/storybook",
    action: "翻开他们的故事",
  },
];

export default function BrandStory() {
  const [active, setActive] = useState(0);
  const { enabled } = useMotionPreference();
  const mode = modes[active];
  return (
    <section id="about" className={s.about} aria-labelledby="about-title">
      <div className={s.aboutInner}>
        <Reveal className={s.aboutCopy}>
          <p className={s.kicker}>05 / MEET LIANGZAI</p>
          <h2 id="about-title">
            小小量仔。
            <br />
            <span>大有可为。</span>
          </h2>
          <div className={s.modeButtons} aria-label="了解量仔的三种特质">
            {modes.map((item, index) => (
              <button
                key={item.name}
                aria-pressed={active === index}
                aria-controls="brand-panel"
                onClick={() => setActive(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div
            id="brand-panel"
            className={s.brandPanel}
            aria-live="polite"
            aria-atomic="true"
          >
            <p className={s.modeEnglish}>{mode.en}</p>
            <h3>{mode.title}</h3>
            <p>{mode.description}</p>
            <Link href={mode.href}>
              {mode.action}
              <ArrowUpRight size={17} aria-hidden />
            </Link>
          </div>
        </Reveal>
        <Reveal className={s.aboutVisual} delay={0.1}>
          <m.figure
            key={mode.image}
            initial={enabled ? { opacity: 0.5, scale: 1.025 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: enabled ? 0.6 : 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/assets/characters-v2/${mode.image}`}
              alt={mode.alt}
              width="1536"
              height="1024"
              loading="lazy"
            />
            <figcaption>
              <span>THE LIANGZAI SPIRIT</span>
              <span>0{active + 1} / 03</span>
            </figcaption>
          </m.figure>
        </Reveal>
      </div>
    </section>
  );
}
