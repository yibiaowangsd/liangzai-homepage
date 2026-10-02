"use client";
import Link from "next/link";
import { useState } from "react";
const projects = [
  {
    n: "01",
    name: "把抽象，变成直觉。",
    subtitle: "密码图鉴",
    kind: "工程",
    href: "/pqc-arsenal",
    image: "/assets/pqc/ml-kem-studio-v2.webp",
    alt: "ML-KEM 晶格的空间结构",
    description: "从一个数学难题，到一次可靠连接。",
  },
  {
    n: "02",
    name: "让想象，有迹可循。",
    subtitle: "灵感观测站",
    kind: "想象",
    href: "/observatory",
    image: "/assets/cinematic/quantum-portal-v1.webp",
    alt: "金属圆环与冰蓝色量子光场",
    description: "在引力、共振与秩序之间，留下自己的作品。",
  },
  {
    n: "03",
    name: "勇气，也是一种算法。",
    subtitle: "星际漫游",
    kind: "想象",
    href: "/storybook",
    image: "/assets/book-v2/09-final-battle.webp",
    alt: "量仔与奶龙融合后的守护者迎战 Shor",
    description: "十一页星际冒险，关于未知，也关于并肩。",
  },
  {
    n: "04",
    name: "答案，亲手运行。",
    subtitle: "密码实验室",
    kind: "工程",
    href: "/pqc-practice",
    image: "/assets/pqc/ml-dsa-studio-v2.webp",
    alt: "数字签名的密码学视觉作品",
    description: "生成密钥、封装、签名与验证。让代码给出答案。",
  },
];
export default function ProjectAtlas() {
  const [filter, setFilter] = useState("全部"),
    [view, setView] = useState("画廊");
  const shown = projects.filter(
    (item) => filter === "全部" || item.kind === filter,
  );
  return (
    <section
      className="studio-projects"
      id="selected"
      aria-labelledby="selected-title"
    >
      <div className="studio-section-label">
        <span>01 / 作品与实验</span>
        <span>从好奇开始，以探索继续</span>
      </div>
      <div className="studio-project-heading">
        <h2 id="selected-title">
          一些认真，
          <br />
          <em>一些异想天开。</em>
        </h2>
        <div className="atlas-controls">
          <div role="group" aria-label="筛选作品">
            {["全部", "工程", "想象"].map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div role="group" aria-label="作品浏览方式">
            {["画廊", "索引"].map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={view === name}
                onClick={() => setView(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="studio-sr" role="status">
        {shown.length} 个作品，{view}视图
      </p>
      <div className="studio-project-grid" data-view={view}>
        {shown.map((item) => {
          const content = (
            <>
              <div className="studio-project-image">
                <img
                  src={item.image}
                  alt={item.alt}
                  width="1200"
                  height="800"
                  loading="lazy"
                />
                <span className="studio-project-disc" aria-hidden="true">
                  探索
                  <br />↗
                </span>
                <span className="studio-project-kind">
                  {item.kind} / {item.subtitle}
                </span>
              </div>
              <div className="studio-project-caption">
                <span>{item.n}</span>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="studio-project-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </>
          );
          return item.href === "/pqc-practice" ? (
            <a
              className="studio-project"
              href={item.href}
              key={item.n}
              aria-label={`进入密码实验室：${item.name}`}
            >
              {content}
            </a>
          ) : (
            <Link className="studio-project" href={item.href} key={item.n}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
