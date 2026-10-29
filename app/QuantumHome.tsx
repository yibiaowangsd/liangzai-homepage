import Link from "next/link";
import { Suspense } from "react";
import { MotionSurface } from "./experience/Motion";
import CinemaEntrance from "./studio/CinemaEntrance";
import HomeDispatch from "./studio/HomeDispatch";
import { categoryLabels, coreCategories } from "./news/news-api";
import "./studio/home.css";

export default function QuantumHome() {
  return (
    <MotionSurface className="portal-film">
      <main id="main-content" className="portal-home">
        <section className="portal-hero" aria-labelledby="home-title">
          <img className="portal-backdrop" src="/assets/cinematic/vault-entrance-v2.webp" width="1672" height="941" alt="蓝色光线照亮的密码之门" fetchPriority="high" />
          <div className="portal-shade" />
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">量仔 · 每日技术前沿</p>
            <h1 id="home-title">前沿新闻<br /><span>看见技术的新进展</span></h1>
            <p className="portal-hero-description">追踪后量子密码、抗量子协议与迁移，<br className="portal-wide-break" />关注标准、网络安全、AI 与 NGCC 公钥征集的新进展。</p>
            <div className="portal-actions">
              <Link className="portal-button" href="/news">阅读最新简报</Link>
              <a className="portal-text-link" href="#signal">浏览本期精选</a>
            </div>
            <div className="portal-identity">
              <p>从研究、标准、产业与部署追踪新进展，提供专题解读与快讯，保留原文链接。</p>
              <div><Link href="/news/subscribe">订阅每日简报</Link><Link href="/about">认识 Yibiao</Link></div>
            </div>
          </div>
          <div className="portal-hero-foot"><span>后量子密码 · 协议 · 标准 · 网络安全 · AI</span><CinemaEntrance /></div>
        </section>
        <section className="portal-news portal-chapter" id="signal" aria-labelledby="signal-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">01</p><h2 id="signal-title">最新简报</h2><p>跟踪各个方向的新进展。<br />阅读要点与解读，查阅原始来源。</p></div>
          <nav className="portal-topic-nav" aria-label="新闻栏目">{coreCategories.map(category => <Link key={category} href={`/news?category=${category}`}>{categoryLabels[category]}</Link>)}</nav>
          <Suspense fallback={<div className="portal-dispatch-empty" role="status"><p>正在读取最新简报…</p><Link href="/news">阅读前沿新闻</Link></div>}><HomeDispatch /></Suspense>
          <div className="portal-news-actions">
            <Link href="/topics" className="portal-text-link">按算法与协议追踪后续进展</Link>
            <Link href="/news" className="portal-text-link">阅读完整技术简报</Link>
            <div><p>按板块订阅，每天在邮箱或群聊读前沿。<span>申请审核通过后接收。</span></p><Link href="/news/subscribe" className="portal-subscribe-button">订阅日报 <span aria-hidden="true">→</span></Link></div>
          </div>
        </section>
        <section className="portal-tools portal-chapter" id="selected" aria-labelledby="tools-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">02</p><h2 id="tools-title">从算法，到协议</h2><p>关注一次握手如何建立密钥、完成认证，<br />也关注它如何兼容现有系统。</p></div>
          <dl className="portal-engineering" data-reveal>
            <div><dt>混合密钥协商</dt><dd>经典算法与 ML-KEM 如何组合，如何将共享秘密接入协议密钥派生。</dd></div>
            <div><dt>密码敏捷</dt><dd>让算法选择、参数配置与协议协商衔接，支持逐步迁移。</dd></div>
            <div><dt>互通与性能</dt><dd>从标准向量、跨实现验证到握手耗时，检查正确性与工程代价。</dd></div>
          </dl>
          <div className="portal-lab-scene" data-reveal>
            <div className="portal-lab-art"><img src="/assets/pqc/ml-kem-studio-v2.webp" width="1200" height="800" alt="蓝色高光下的金属晶格结构，呼应基于格的后量子算法" loading="lazy" decoding="async" /></div>
            <div className="portal-lab-copy">
              <h3>在浏览器里，<br />验证一次密钥封装</h3>
              <p>生成 ML-KEM 密钥，完成封装与解封，比较双方共享秘密。也可以导入测试向量，检查签名与验签结果。</p>
              <div className="portal-actions"><a className="portal-button" href="/pqc-practice">进入密码实验室</a><Link className="portal-text-link" href="/pqc-arsenal">阅读算法原理</Link></div>
              <div className="portal-lab-meta"><span>ML-KEM</span><span>ML-DSA</span><span>SLH-DSA</span><span>SM2</span></div>
            </div>
          </div>
        </section>
        <section className="portal-world portal-chapter" id="world" aria-labelledby="world-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">03</p><h2 id="world-title">工程之外，一点想象</h2><p>量仔与奶龙的角色故事，<br />是这个个人网站的另一面。</p></div>
          <div className="portal-story-scene" data-reveal>
            <img src="/assets/book-v2/09-final-battle.webp" width="1200" height="800" alt="量仔与奶龙并肩踏上星际冒险" loading="lazy" decoding="async" />
            <div className="portal-story-shade" />
            <div className="portal-story-copy"><h3>量仔与奶龙的<br />星际漫游</h3><p>十一页插画故事，配合逐页旁白。<br />给理性的世界，留一点想象。</p><div className="portal-actions"><Link className="portal-button" href="/storybook">阅读角色故事</Link><Link className="portal-text-link" href="/models">旋转查看角色模型</Link></div></div>
          </div>
        </section>
      </main>
    </MotionSurface>
  );
}
