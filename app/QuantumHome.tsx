"use client";
import Link from "next/link";
import { useRef } from "react";
import { usePageMotion } from "./experience/Motion";
import { useHomeEffects } from "./experience/HomeEffects";
import { HomeGuardian, HomeSculpture } from "./experience/HomeVisuals";
import FlowField from "./studio/FlowField";
import ProjectAtlas from "./studio/ProjectAtlas";
import "./studio/home.css";
export default function QuantumHome() {
  const root = useRef<HTMLElement>(null),
    { models, particles } = useHomeEffects();
  usePageMotion(root);
  return (
    <main
      ref={root}
      id="main-content"
      className="studio-home"
      data-home-effects={models || particles ? "active" : "lite"}
    >
      <section className="studio-hero" aria-labelledby="home-title">
        <div className="studio-hero-topline">
          <span>Yibiao 的个人空间</span>
          <span>密码工程 × 数学 × 想象力</span>
          <span>
            持续探索中 <i />
          </span>
        </div>
        <h1
          id="home-title"
          className="studio-wordmark"
          aria-label="量仔，好奇心不设限"
        >
          LIANGZAI<span aria-hidden="true">∞</span>
        </h1>
        <div className="studio-hero-body">
          <div className="studio-hero-statement">
            <p>你好，我是量仔。</p>
            <h2>
              好奇心，
              <br />
              不设限。
            </h2>
            <p>
              在严谨的数学里找浪漫，
              <br />
              在真实的代码里造世界。
            </p>
            <a className="studio-text-link" href="#selected">
              向下探索 <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="studio-hero-art">
            <FlowField />
            <img
              className="studio-hero-mascot"
              src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
              width="1024"
              height="1536"
              alt="站在蓝色数学纽结中的量仔"
              fetchPriority="high"
            />
            <span className="studio-art-note">用鼠标，轻轻拨动这个世界。</span>
          </div>
          <div className="studio-hero-aside">
            <span>
              这里的每个入口，
              <br />
              都值得亲自打开。
            </span>
            <Link className="studio-round-link" href="/observatory">
              <span>
                进入
                <br />
                灵感现场
              </span>
              <b aria-hidden="true">↗</b>
            </Link>
            <span className="studio-small-mark">
              量仔
              <br />
              好奇心实验室
            </span>
          </div>
        </div>
        <div className="studio-hero-bottom">
          <span>01 — 08 / 自由探索</span>
          <span>保持认真，也保持一点天真。</span>
          <a href="#selected" aria-label="浏览作品与实验">
            向下滚动 ↓
          </a>
        </div>
      </section>
      <ProjectAtlas />
      <section className="studio-manifesto" aria-labelledby="manifesto-title">
        <div className="studio-section-label">
          <span>02 / 关于这个地方</span>
          <span>不止于技术</span>
        </div>
        <div className="studio-manifesto-body">
          <p>
            这是我的工作之外，
            <br />
            也是好奇心的延长线。
          </p>
          <h2 id="manifesto-title" data-reveal>
            有些问题，
            <br />
            需要<span>严密的证明。</span>
            <br />
            有些世界，
            <br />
            值得<em>大胆地想象。</em>
          </h2>
          <Link className="studio-text-link" href="/about">
            认识屏幕背后的人 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section
        className="studio-character"
        id="liangzai"
        aria-labelledby="character-title"
      >
        <div className="studio-section-label">
          <span>03 / 认识你的同行者</span>
          <span>量仔 · 奶龙 · 一起向前</span>
        </div>
        <div className="studio-character-heading">
          <h2 id="character-title">
            小小的身体。
            <br />
            <em>装着整个宇宙。</em>
          </h2>
          <p>
            轻点量仔三次，唤醒星云。
            <br />
            再长按，让散落的光凝聚成形。
          </p>
        </div>
        <div className="studio-guardian-theatre">
          <HomeGuardian />
        </div>
        <div className="studio-character-bottom">
          <span>测量 · 连接 · 守护</span>
          <Link href="/archive">翻开量仔的档案 ↗</Link>
          <Link href="/storybook">开启星际漫游 ↗</Link>
        </div>
      </section>
      <section className="studio-play" aria-labelledby="play-title">
        <div className="studio-play-copy">
          <p className="studio-kicker">04 / 给灵感一点空间</p>
          <h2 id="play-title">
            先触碰，
            <br />
            再理解。
          </h2>
          <p>
            移动、聚拢、释放。
            <br />
            让一个小小的动作，改变眼前的秩序。
          </p>
          <Link className="studio-text-link" href="/observatory">
            把你的灵感带走 <span aria-hidden="true">↗</span>
          </Link>
          <small>生成式交互艺术</small>
        </div>
        <HomeSculpture />
      </section>
      <section className="studio-journal" aria-labelledby="journal-title">
        <div className="studio-section-label">
          <span>05 / 向外看看</span>
          <span>保持与世界的连接</span>
        </div>
        <div>
          <h2 id="journal-title">
            变化正在发生。
            <br />
            <em>别错过下一束信号。</em>
          </h2>
          <p>
            密码、协议、标准、安全与 AI。
            <br />
            阅读新闻，也追问它为什么重要。
          </p>
          <Link className="studio-pill" href="/news">
            阅读前沿新闻 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <span className="studio-journal-type" aria-hidden="true">
          WHAT’S
          <br />
          NEXT?
        </span>
      </section>
    </main>
  );
}
