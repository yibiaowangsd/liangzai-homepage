import Link from "next/link";
import { engineeringProjects } from "./site/projects";
import { notes } from "./notes/notes";
import { MotionSurface } from "./experience/Motion";
import HandshakeDemo from "./studio/HandshakeDemo";
import ProtocolStack from "./studio/ProtocolStack";
import HomeDispatch from "./studio/HomeDispatch";
import "./studio/home.css";

export default async function QuantumHome() {
  const signals = await HomeDispatch();
  return (
    <MotionSurface className="portal-film">
      <main id="main-content" className="portal-home">
        <section className="portal-hero" aria-labelledby="home-title">
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">YIBIAO / CRYPTOGRAPHY ENGINEERING</p>
            <p className="portal-identity">我是 Yibiao，在中电信量子集团从事抗量子密码与安全协议工作。</p>
            <h1 id="home-title">把后量子密码<br /><span>装进真实协议</span></h1>
            <p className="portal-hero-description">先在浏览器里验证一次密钥封装，再走向混合密钥协商、密码敏捷与互通验证。让算法走向可用的连接。</p>
            <p className="portal-trust"><code>1,184 B</code> 公钥 <span>+</span> <code>1,088 B</code> 密文<br /><small>ML-KEM-768 的材料尺寸，从可复现的数字开始。</small></p>
            <div className="portal-actions"><a className="portal-text-link" href="#selected">查看我的工程实践 <span aria-hidden="true">↓</span></a></div>
          </div>
          <HandshakeDemo />
          <div className="portal-hero-foot"><span>可运行的实验，可追溯的记录。</span><span lang="en">Run locally. Inspect the evidence.</span></div>
        </section>
        <section className="portal-tools portal-chapter" id="selected" aria-labelledby="work-title">
          <div className="portal-section-heading"><p className="portal-eyebrow">01 / SELECTED WORK</p><h2 id="work-title">工程实践</h2><p>三个可核查的切面：<br />算法材料、参数覆盖与接入记录。</p></div>
          <div className="portal-projects">{engineeringProjects.map((project, index) => <article key={project.title} className="portal-project-card">
            <div className="project-label"><span>0{index + 1}</span><span>{project.status}</span></div><strong className="project-metric">{project.metric}</strong><h3>{project.title}</h3><p>{project.result}</p><small>{project.note}</small><Link className="portal-text-link" href={project.href}>{project.action} <span aria-hidden="true">↗</span></Link>
          </article>)}</div>
          <a className="portal-text-link portal-lab-link" href="/pqc-practice">进入密码实验室 <span aria-hidden="true">↗</span></a>
        </section>
        <section className="portal-protocol portal-chapter" aria-labelledby="protocol-title">
          <div className="portal-section-heading"><p className="portal-eyebrow">02 / PROTOCOL MAP</p><h2 id="protocol-title">从算法，到协议</h2><p>一次运算只是起点。<br />每一层，都有需要回答的问题。</p></div>
          <ProtocolStack />
          <Link className="portal-text-link" href="/pqc-arsenal">阅读算法原理 <span aria-hidden="true">↗</span></Link>
        </section>
        <section className="portal-notes portal-chapter" aria-labelledby="notes-title">
          <div className="portal-section-heading"><p className="portal-eyebrow">03 / FIELD NOTES</p><h2 id="notes-title">实现之后，留下记录</h2><p>把材料、方法与验证边界写清楚。<br />每篇附英文摘要。</p></div>
          <div className="portal-note-list">{notes.map(note => <article key={note.slug}><time dateTime={note.date}>{note.date}</time><div><h3><Link href={`/notes/${note.slug}`}>{note.title} <span aria-hidden="true">↗</span></Link></h3><p>{note.summary}</p></div><span className="portal-note-category">{note.category}</span></article>)}</div>
          <Link className="portal-text-link" href="/notes">全部技术笔记</Link>
        </section>
        <section className="portal-news portal-chapter" id="signal" aria-labelledby="signal-title">
          <div className="portal-section-heading"><p className="portal-eyebrow">04 / SIGNALS</p><h2 id="signal-title">今日信号</h2><p>跟踪密码、协议与标准的新进展。<br />从简报回到原始来源。</p></div>
          {signals}
          <Link href="/news" className="portal-text-link portal-news-more">阅读完整技术简报 <span aria-hidden="true">↗</span></Link>
        </section>
        <aside className="portal-outside" aria-label="工程之外"><p className="portal-eyebrow">AFTER HOURS</p><div><h2>工程之外</h2><p>量仔是这里的吉祥物。故事与角色模型，留在量仔宇宙里。</p></div><Link className="portal-text-link" href="/universe">去看看 <span aria-hidden="true">↗</span></Link></aside>
      </main>
    </MotionSurface>
  );
}
