"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import ArtCanvas from "../observatory/ArtCanvas";
import { defaultArt } from "../observatory/art-state";

const worlds = [
  {
    name: "写一片星空",
    kind: "交互艺术",
    description: "引力、共振、晶格。亲手调节光场，把你的灵感定格，带走或分享。",
    href: "/observatory",
    action: "进入灵感观测站",
    image: "",
    alt: "由星光构成的生成式星系",
  },
  {
    name: "读一个故事",
    kind: "星际漫游",
    description: "量仔与奶龙的十一页冒险。关于未知，关于勇气，也关于并肩。",
    href: "/storybook",
    action: "开启星际漫游",
    image: "/assets/book-v2/08-fusion.webp",
    alt: "量仔与奶龙合体后的蓝金守护者",
  },
  {
    name: "让原理变成直觉",
    kind: "密码图鉴",
    description: "从数学的一个小问题，走近后量子密码的四种守护之力。",
    href: "/pqc-arsenal",
    action: "探索密码图鉴",
    image: "/assets/cinematic/quantum-portal-v1.webp",
    alt: "冰蓝色光芒环绕的金属量子门",
  },
  {
    name: "运行真正的算法",
    kind: "密码实验室",
    description:
      "选择参数、生成密钥、封装、签名与验证。用一次真实实验，理解安全如何发生。",
    href: "/pqc-practice",
    action: "进入密码实验室",
    image: "/assets/pqc/ml-kem-studio-v2.webp",
    alt: "ML-KEM 的晶格视觉作品",
  },
  {
    name: "认识一位守护者",
    kind: "量仔小传",
    description: "一根接收星光的天线，一颗始终在线的好奇心。这就是量仔。",
    href: "/archive",
    action: "阅读量仔小传",
    image: "/assets/characters-v2/archive-origin.webp",
    alt: "量仔的起源故事",
  },
];

export default function UniverseIndex() {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const world = worlds[selected];
  function navigate(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight")
      next = (index + 1) % worlds.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      next = (index - 1 + worlds.length) % worlds.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = worlds.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }
  return (
    <div className="universe-index">
      <div
        className="universe-choices"
        role="tablist"
        aria-label="选择探索目的地"
        aria-orientation="vertical"
      >
        {worlds.map((item, i) => (
          <button
            type="button"
            key={item.href}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            role="tab"
            id={`world-tab-${i}`}
            aria-controls="world-preview"
            aria-selected={i === selected}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(event) => navigate(event, i)}
          >
            <span className="universe-number">0{i + 1}</span>
            <span>
              <small>{item.kind}</small>
              <strong>{item.name}</strong>
            </span>
            <span className="universe-tab-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div
        id="world-preview"
        role="tabpanel"
        aria-labelledby={`world-tab-${selected}`}
        className="universe-preview"
      >
        <div
          className={`universe-image ${selected === 0 ? "universe-generative" : ""}`}
          key={world.href}
        >
          {selected === 0 ? (
            <>
              <ArtCanvas settings={defaultArt} />
              <noscript>
                <img
                  src="/assets/cinematic/quantum-portal-v1.webp"
                  alt="量子之门"
                />
              </noscript>
            </>
          ) : (
            <img
              src={world.image}
              alt={world.alt}
              loading="lazy"
              width="1200"
              height="800"
            />
          )}
          <span className="universe-image-tag">{world.kind}</span>
        </div>
        <div className="universe-preview-copy">
          <p>{world.description}</p>
          {world.href === "/pqc-practice" ? (
            <a className="universe-enter" href={world.href}>
              {world.action}
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <Link className="universe-enter" href={world.href}>
              {world.action}
              <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
