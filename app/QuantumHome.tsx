import Link from "next/link";
import { Suspense } from "react";
import { MotionSurface } from "./experience/Motion";
import NewsGate from "./experience/NewsGate";
import CinemaEntrance from "./studio/CinemaEntrance";
import HomeDispatch from "./studio/HomeDispatch";
import "./studio/home.css";

export default function QuantumHome() {
  return (
    <MotionSurface className="portal-film">
      <main id="main-content" className="portal-home">
        <section className="portal-hero" aria-labelledby="home-title">
          <img className="portal-backdrop" src="/assets/cinematic/vault-entrance-v2.webp" width="1672" height="941" alt="蓝色光线照亮的密码之门" fetchPriority="high" />
          <div className="portal-shade" />
          <div className="portal-caption"><span>YIBIAO / PERSONAL LAB</span><span>密码 · 工程 · 创造</span></div>
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">你好，我是量仔。</p>
            <h1 id="home-title">探索未知<br /><em>亲手验证</em></h1>
            <p>从数学原理到真实代码，<br />在这里，想法可以运行。</p>
            <div className="portal-actions">
              <a className="portal-button" href="/pqc-practice">进入密码实验室</a>
              <Link className="portal-button portal-button-glass" href="/news">阅读每日新闻</Link>
            </div>
          </div>
          <div className="portal-hero-foot"><span>LIANGZAI <small>一份持续生长的个人实践</small></span><div><a href="#selected">向下探索</a><CinemaEntrance /></div></div>
        </section>
        <nav className="portal-quickstart" aria-label="从这里开始">
          <a href="#selected"><span>01 / 实践</span><strong>让原理发生</strong><p>从数学直觉，到一次真实的验证</p></a>
          <a href="#signal"><span>02 / 前沿</span><strong>保持自己的判断</strong><p>从原始资料，读懂每一次变化</p></a>
          <a href="#world"><span>03 / 创造</span><strong>去想象之外</strong><p>角色、故事，与未知世界的相遇</p></a>
        </nav>
        <div className="portal-edition-slot"><NewsGate /></div>
        <section className="portal-tools portal-chapter" id="selected" aria-labelledby="tools-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">01 / THE PRACTICE</p><h2 id="tools-title">从理解，到验证</h2><p>把复杂的问题拆开，<br />让每一步都有迹可循。</p></div>
          <div className="portal-lab-scene" data-reveal>
            <div className="portal-lab-art"><img src="/assets/pqc/ml-kem-studio-v2.webp" width="1200" height="800" alt="金属与晶格交织的后量子密码结构" loading="lazy" data-parallax="5" /></div>
            <div className="portal-lab-copy">
              <p className="portal-eyebrow">CRYPTOGRAPHY / IN YOUR BROWSER</p>
              <h3>一次连接，<br />如何值得信任？</h3>
              <p>生成密钥、封装共享秘密、签名与验签。<br />用真实算法完成一次端到端实验。</p>
              <div className="portal-actions"><a className="portal-button" href="/pqc-practice">开始密码实验</a><Link className="portal-text-link" href="/pqc-arsenal">先理解算法原理</Link></div>
              <div className="portal-lab-meta"><span>ML-KEM</span><span>ML-DSA</span><span>SM2</span><span>HASH</span></div>
            </div>
          </div>
          <Link href="/pqc-arsenal" className="portal-chapter-note"><span>密码图鉴</span><p>从晶格、哈希树到数字签名，看懂算法背后的数学。</p><strong>打开图鉴</strong></Link>
        </section>
        <section className="portal-news portal-chapter" id="signal" aria-labelledby="signal-title">
          <div className="portal-news-intro" data-reveal><p className="portal-eyebrow">02 / THE DAILY SIGNAL</p><h2 id="signal-title">保持判断<br /><em>跟上变化</em></h2><p>后量子密码、协议、标准、网络安全与 AI。<br />从原始资料出发，读懂新闻背后的变化。</p><Link href="/news" className="portal-text-link">阅读完整技术简报</Link></div>
          <Suspense fallback={<div className="portal-dispatch-empty"><span>THE DAILY SIGNAL</span><p>每天一份前沿技术简报</p><Link href="/news">打开前沿新闻</Link></div>}><HomeDispatch /></Suspense>
        </section>
        <section className="portal-world" id="world" aria-labelledby="world-title">
          <div className="portal-story-scene">
            <img src="/assets/book-v2/09-final-battle.webp" width="1200" height="800" alt="量仔与奶龙并肩踏上星际冒险" loading="lazy" data-parallax="4" />
            <div className="portal-story-shade" />
            <div className="portal-story-copy" data-reveal><p className="portal-eyebrow">03 / BEYOND THE ORDINARY</p><h2 id="world-title">未知很远<br /><em>一起出发</em></h2><p>十一页关于未知、勇气与并肩的冒险。<br />给理性的世界，留一点想象。</p><Link className="portal-button portal-button-glass" href="/storybook">进入星际漫游</Link></div>
            <div className="portal-story-caption"><span>LIANGZAI × MILK DRAGON</span><Link href="/archive">阅读量仔的角色档案</Link></div>
          </div>
          <div className="portal-world-grid">
            <Link href="/models" className="portal-world-card portal-model-card" data-reveal><div className="portal-model-photo"><img src="/assets/models/observatory/duo-front.webp" width="768" height="864" alt="量仔与奶龙的双人模型" loading="lazy" /></div><div><span>THE CHARACTERS</span><h3>近一点，<br />认识两位伙伴</h3><p>旋转、缩放，探索每一个细节。</p><strong>打开模型鉴赏</strong></div></Link>
            <Link href="/about" className="portal-world-card portal-author-card" data-reveal><span>THE PERSON BEHIND</span><h3>你好，<br />我是 Yibiao</h3><p>从山大出发，在密码与安全的世界里继续探索。<br />这里收藏我的技术实践，也收藏那些还在生长的想法。</p><strong>认识我</strong><small>保持认真。保持好奇。</small></Link>
          </div>
        </section>
      </main>
    </MotionSurface>
  );
}
