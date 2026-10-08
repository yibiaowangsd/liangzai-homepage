import Link from "next/link";
import { engineeringProjects } from "./site/projects";
import { MotionSurface } from "./experience/Motion";
import CinemaEntrance from "./studio/CinemaEntrance";
import HomeDispatch from "./studio/HomeDispatch";
import "./studio/home.css";

export default async function QuantumHome() {
  const signals = await HomeDispatch();
  return (
    <MotionSurface className="portal-film">
      <main id="main-content" className="portal-home">
        <section className="portal-hero" aria-labelledby="home-title">
          <img className="portal-backdrop" src="/assets/cinematic/vault-entrance-v2.webp" width="1672" height="941" alt="蓝色光线照亮的密码之门" fetchPriority="high" />
          <div className="portal-shade" />
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">Yibiao · 后量子密码工程</p>
            <h1 id="home-title">把后量子密码<br /><span>装进真实协议</span></h1>
            <p className="portal-hero-description">围绕 TLS / TLCP、SSH 与 IKE，探索混合密钥协商、<br className="portal-wide-break" />密码敏捷与互通验证，让算法走向可用的连接。</p>
            <div className="portal-actions">
              <a className="portal-button" href="/pqc-practice">动手验证算法</a>
              <a className="portal-text-link" href="#selected">了解协议工程方向</a>
            </div>
            <div className="portal-identity">
              <p>我是 Yibiao，在中电信量子集团从事抗量子密码与安全协议工作。</p>
              <div><Link href="/about">经历与技术方向</Link><a href="https://github.com/yibiaowangsd/liangzai-homepage" target="_blank" rel="noreferrer">查看本站源码</a></div>
            </div>
          </div>
          <div className="portal-hero-foot"><span>TLS / TLCP · SSH · IKE</span><CinemaEntrance /></div>
        </section>
        <section className="portal-tools portal-chapter" id="selected" aria-labelledby="tools-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">01</p><h2 id="tools-title">从算法，到协议</h2><p>关注一次握手如何建立密钥、完成认证，<br />也关注它如何兼容现有系统。</p></div>
          <div className="portal-projects" data-reveal>{engineeringProjects.map(project => <article key={project.title} className="portal-project-card">
            <p className="project-protocol">{project.protocol}</p><span className="project-status">{project.status}</span><h3>{project.title}</h3><p>{project.result}</p><strong className="project-metric">{project.metric}</strong><small>{project.note}</small><a className="portal-text-link" href={project.href}>{project.action}</a>
          </article>)}</div>
          <div className="portal-lab-scene" data-reveal>
            <div className="portal-lab-art"><img src="/assets/pqc/ml-kem-studio-v2.webp" width="1200" height="800" alt="蓝色高光下的金属晶格结构，呼应基于格的后量子算法" loading="lazy" decoding="async" /></div>
            <div className="portal-lab-copy">
              <h3>在浏览器里，<br />验证一次密钥封装</h3>
              <p>生成 ML-KEM 密钥，完成封装与解封，比较双方共享秘密。也可以导入测试向量，检查签名与验签结果。</p>
              <div className="portal-actions"><a className="portal-button" href="/pqc-practice">进入密码实验室</a><Link className="portal-text-link" href="/pqc-arsenal">阅读密码图鉴</Link></div>
              <div className="portal-lab-meta"><span>ML-KEM</span><span>ML-DSA</span><span>SLH-DSA</span><span>SM2</span></div>
            </div>
          </div>
        </section>
        <section className="portal-news portal-chapter" id="signal" aria-labelledby="signal-title">
          <div className="portal-section-heading" data-reveal><p className="portal-eyebrow">02</p><h2 id="signal-title">今日信号</h2><p>跟踪密码、协议与标准的新进展。<br />摘要与原始来源，帮助形成自己的判断。</p></div>
          {signals}
          <Link href="/news" className="portal-text-link portal-news-more">阅读完整技术简报</Link>
        </section>
        <aside className="portal-universe-card" aria-label="量仔宇宙"><img src="/assets/book-v2/09-final-battle.webp" width="180" height="120" alt="量仔与奶龙" loading="lazy" /><div><h2>量仔宇宙</h2><p>工程之外，留一点想象。角色故事与模型收藏在这里。</p></div><Link className="portal-text-link" href="/universe">进入量仔宇宙</Link></aside>
      </main>
    </MotionSurface>
  );
}
