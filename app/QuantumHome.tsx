"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePageMotion } from "./experience/Motion";
import { useHomeEffects } from "./experience/HomeEffects";
import {
  HomeAtmosphere,
  HomeGuardian,
  HomeSculpture,
} from "./experience/HomeVisuals";
import UniverseIndex from "./experience/UniverseIndex";
import "./experience/home-universe.css";

export default function QuantumHome() {
  const root = useRef<HTMLElement>(null);
  const { models, particles } = useHomeEffects();
  usePageMotion(root, models || particles);
  useEffect(() => {
    document.documentElement.classList.add("liangzai-home-active");
    return () =>
      document.documentElement.classList.remove("liangzai-home-active");
  }, []);

  return (
    <main
      ref={root}
      id="main-content"
      className="cinematic-home universe-home"
      data-home-effects={models || particles ? "active" : "lite"}
    >
      <HomeAtmosphere />
      <section className="portal-hero" aria-labelledby="home-title">
        <div className="hero-coordinate" aria-hidden="true">
          <span>好奇心坐标</span>
          <b>∞</b>
          <span>正在向未知靠近</span>
        </div>
        <HomeGuardian />
        <div className="portal-copy">
          <p className="eyebrow">
            <span className="status-light" /> 量仔的数字宇宙 · 始于好奇
          </p>
          <h1 id="home-title">
            让想象
            <br />
            <em>穿越边界</em>
            <span className="hero-title-dot">。</span>
          </h1>
          <p className="hero-summary">
            把深奥的科学变成直觉，
            <br />
            把遥远的未来，变成一次亲手的探索。
          </p>
          <div className="hero-actions">
            <Link className="silver-button" data-magnetic href="/observatory">
              创作你的星空<span aria-hidden="true">↗</span>
            </Link>
            <a className="hero-secondary" href="#worlds">
              选择探索路线<span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-invitation">
            你好，我是 Yibiao。这里住着代码、故事和一点想象力。
          </p>
        </div>
        <div className="hero-baseline">
          <Link href="/storybook">
            <span className="hero-route-number">01</span>
            <span>
              <small>跟随量仔</small>
              <strong>读一个星际故事</strong>
            </span>
            <span className="hero-route-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <a href="/pqc-practice">
            <span className="hero-route-number">02</span>
            <span>
              <small>走进密码工程</small>
              <strong>动手运行真实算法</strong>
            </span>
            <span className="hero-route-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <Link href="/news">
            <span className="hero-route-number">03</span>
            <span>
              <small>捕捉前沿信号</small>
              <strong>看看世界的新进展</strong>
            </span>
            <span className="hero-route-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </section>

      <section
        id="worlds"
        className="universe-worlds section-wrap"
        aria-labelledby="worlds-title"
      >
        <div className="universe-section-heading" data-reveal>
          <div>
            <p className="eyebrow">01 / 探索索引</p>
            <h2 id="worlds-title">
              一个宇宙，<em>不止一种入口。</em>
            </h2>
          </div>
          <p>
            从你感兴趣的地方开始。
            <br />
            剩下的，交给好奇心。
          </p>
        </div>
        <UniverseIndex />
      </section>

      <section
        className="field-section section-wrap"
        id="lab"
        aria-labelledby="field-title"
      >
        <div className="field-copy" data-reveal>
          <p className="eyebrow">02 / 让看不见的，被看见</p>
          <h2 id="field-title">
            一次触碰，
            <br />
            <em>一场共振。</em>
          </h2>
          <p>
            移动、聚拢、释放。
            <br />
            感受粒子如何在秩序与想象之间流动。
          </p>
          <Link className="line-link" href="/observatory">
            去观测站，创造更多可能 <span aria-hidden="true">↗</span>
          </Link>
          <small>交互艺术 · 不表示真实量子态</small>
        </div>
        <HomeSculpture />
      </section>

      <section
        className="home-engineering section-wrap"
        aria-labelledby="engineering-title"
      >
        <div className="home-engineering-heading" data-reveal>
          <p className="eyebrow">03 / 想象之外，还有真实</p>
          <h2 id="engineering-title">
            不止看见。
            <br />
            <em>也能亲手验证。</em>
          </h2>
          <p>
            从一个数学问题出发，
            <br />
            走到一把密钥、一份签名、一次真实的运行。
          </p>
        </div>
        <div className="engineering-links">
          <Link className="engineering-link" href="/pqc-arsenal">
            <span>理解原理</span>
            <h3>密码图鉴</h3>
            <p>用直觉走近 ML-KEM、ML-DSA、SLH-DSA 与 FN-DSA。</p>
            <span className="engineering-cta">
              从数学，走进密码学 <b aria-hidden="true">↗</b>
            </span>
          </Link>
          <a className="engineering-link" href="/pqc-practice">
            <span>运行与验证</span>
            <h3>密码实验室</h3>
            <p>在浏览器里运行 WASM 实现，亲手完成封装、签名与校验。</p>
            <span className="engineering-cta">
              进入密码实验室 <b aria-hidden="true">↗</b>
            </span>
          </a>
          <Link className="engineering-link" href="/news">
            <span>持续观察</span>
            <h3>前沿新闻</h3>
            <p>密码、协议、标准、安全与 AI。跟进正在发生的技术变化。</p>
            <span className="engineering-cta">
              阅读前沿解读 <b aria-hidden="true">↗</b>
            </span>
          </Link>
        </div>
      </section>

      <section className="cinema-banner" aria-labelledby="cinema-title">
        <img
          data-parallax="8"
          src="/assets/book-v2/09-final-battle.webp"
          alt="靓龙以晶格剑和护盾迎战 Shor"
          loading="lazy"
          width="1536"
          height="1024"
        />
        <div className="cinema-vignette" />
        <div className="cinema-copy" data-reveal>
          <p className="eyebrow">04 / 关于并肩的故事</p>
          <h2 id="cinema-title">
            所有伟大的冒险
            <br />
            都始于<span>并肩</span>
          </h2>
          <p>精确与勇气相遇。新的力量，从此诞生。</p>
          <Link className="silver-button" data-magnetic href="/storybook">
            开启星际漫游<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section
        className="human-teaser section-wrap"
        aria-labelledby="human-title"
      >
        <div data-reveal>
          <p className="eyebrow">05 / 在代码与星光之间</p>
          <h2 id="human-title">
            好奇心的背后，
            <br />
            <span className="silver-text">也有一个真实的我。</span>
          </h2>
        </div>
        <div className="human-teaser-copy" data-reveal>
          <p>
            我是 Yibiao，毕业于山东大学网络空间安全专业。
            <br />
            现在中电信量子集团，从事抗量子密码与安全协议相关研发。
          </p>
          <Link className="line-link" href="/about">
            了解我的经历 <span aria-hidden="true">↗</span>
          </Link>
          <span>密码工程 · 交互设计 · 保持好奇</span>
        </div>
      </section>
    </main>
  );
}
