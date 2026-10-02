import Link from "next/link";
import CinemaEntrance from "./studio/CinemaEntrance";
import "./studio/home.css";
export default function QuantumHome() {
    return <main id="main-content" className="portal-home">
    <section className="portal-hero" aria-labelledby="home-title">
      <img className="portal-backdrop" src="/assets/cinematic/vault-entrance-v2.webp" width="1672" height="941" alt="蓝色光线照亮的密码之门" fetchPriority="high"/>
      <div className="portal-shade"/>
      <div className="portal-caption"><span>YIBIAO / PERSONAL LAB</span><span>密码 · 工程 · 创造</span></div>
      <div className="portal-hero-copy"><p className="portal-eyebrow">你好，我是量仔。</p><h1 id="home-title">探索未知。<br /><em>亲手验证。</em></h1><p>从数学原理到真实代码，<br />在这里，想法可以运行。</p><div className="portal-actions"><a className="portal-button" href="/pqc-practice">进入密码实验室</a><Link className="portal-button portal-button-glass" href="/news">阅读每日新闻</Link></div></div>
      <div className="portal-hero-foot"><span>LIANGZAI <small>一份持续生长的个人实践</small></span><CinemaEntrance /></div>
    </section>
    <section className="portal-tools" id="selected" aria-labelledby="tools-title">
      <div className="portal-section-heading"><div><p className="portal-eyebrow">01 / 开始实践</p><h2 id="tools-title">从理解，到验证。</h2></div><p>把复杂的问题拆开，<br />让每一步都有迹可循。</p></div>
      <div className="portal-work-grid">
        <a className="portal-lab-card" href="/pqc-practice"><div className="portal-card-label"><span>密码实验室</span><span>IN YOUR BROWSER</span></div><h3>一次连接，<br />如何值得信任？</h3><p>生成密钥、封装共享秘密、签名与验签。<br />用真实算法完成一次端到端实验。</p><div className="portal-key-demo" aria-hidden="true"><span>BOB</span><div><i /><code>pk · ct · ss</code><i /></div><span>ALICE</span></div><div className="portal-card-bottom"><span>ML-KEM · ML-DSA · SM2 · HASH</span><b>开始实验</b></div></a>
        <Link className="portal-guide-card" href="/pqc-arsenal"><div className="portal-card-label"><span>密码图鉴</span><span>LEARN THE PRINCIPLES</span></div><img src="/assets/pqc/ml-kem-studio-v2.webp" alt="晶格密码结构" width="1200" height="800" loading="lazy"/><div className="portal-guide-copy"><h3>看懂算法背后的数学。</h3><p>从晶格、哈希树到数字签名，让原理变得可理解。</p><b>打开图鉴</b></div></Link>
      </div>
    </section>
    <section className="portal-news"><div><p className="portal-eyebrow">02 / 每日更新</p><h2>保持判断。<br /><em>跟上变化。</em></h2></div><div><p>后量子密码、协议、标准、网络安全与 AI。<br />从原始资料出发，读懂新闻背后的变化。</p><Link href="/news" className="portal-button">阅读前沿新闻</Link><div className="portal-news-topics"><span>密码</span><span>协议</span><span>标准</span><span>安全</span><span>AI</span></div></div></section>
    <section className="portal-world" aria-labelledby="world-title"><div className="portal-section-heading"><div><p className="portal-eyebrow">03 / 工作之外</p><h2 id="world-title">另一些，关于创造。</h2></div><Link href="/about" className="portal-inline">认识 Yibiao</Link></div><div className="portal-world-grid"><Link href="/models" className="portal-world-card"><div className="portal-model-photo"><img src="/assets/models/observatory/duo-front.webp" alt="量仔与奶龙模型" width="768" height="864" loading="lazy"/></div><div><span>MODEL GALLERY</span><h3>量仔与奶龙 · 模型鉴赏</h3><p>旋转、缩放，近距离欣赏两位伙伴。</p></div></Link><Link href="/storybook" className="portal-world-card"><img src="/assets/book-v2/09-final-battle.webp" alt="量仔与奶龙的星际冒险" width="1200" height="800" loading="lazy"/><div><span>THE STORY</span><h3>星际漫游</h3><p>十一页关于未知、勇气与并肩的冒险。</p></div></Link></div></section>
  </main>;
}
