import type { Metadata } from "next";
import Link from "next/link";
import { MotionSurface } from "../experience/Motion";
import MilkSurface from "../milk/MilkSurface";
import FloatingIdentity from "./FloatingIdentity";
import "./about.css";

export const metadata: Metadata = {
  title: "关于我 Wang Yibiao",
  description: "Yibiao 的个人主页。2018 至 2025 年在山东大学学习网络空间安全，现就职于中电信量子集团，关注抗量子密码、安全协议与密码工程。",
};

const journey = [
  { year: "2025", period: "2025 至今", type: "工作", place: "中电信量子集团", detail: "抗量子密码与安全协议", body: "将对密码与安全的研究延伸到工程实践，关注抗量子协议改造、密码敏捷，以及 PQC 与 QKD 的融合应用。", current: true },
  { year: "2022", period: "2022—2025", type: "硕士", place: "山东大学", detail: "网络空间安全", body: "继续在网络空间安全领域学习与研究，从本科阶段的专业积累走向更深入的探索。", current: false },
  { year: "2018", period: "2018—2022", type: "本科", place: "山东大学", detail: "网络空间安全", body: "在山大开启网络空间安全的学习之路，也是我走近密码学与安全技术的起点。", current: false },
];
const focus = [
  { verb: "量", who: "量仔管的那部分", title: "抗量子密码", text: "关注后量子算法实现、测试验证与性能优化，让密码算法在真实系统中运行起来。", tags: ["算法实现", "测试验证", "性能优化"] },
  { verb: "守", who: "奶蛙管的那部分", title: "安全协议", text: "围绕 TLS、TLCP、SSH 与 IKE 协议，探索抗量子迁移、混合密钥协商与密码敏捷。", tags: ["协议改造", "混合协商", "密码敏捷"] },
  { verb: "合", who: "两个一起管的那部分", title: "密码工程", text: "关心 PQC 与 QKD 如何协同，也关心算法库、接口与跨平台适配如何衔接成可用的能力。", tags: ["PQC 与 QKD", "算法库", "系统集成"] },
];
const projects = [
  { title: "量仔的数字世界", text: "用角色、故事和交互，把抽象的技术变成一个可以探索的世界。", href: "/", action: "探索首页" },
  { title: "密码图鉴", text: "从直觉走向原理，用可视化理解后量子密码背后的数学问题。", href: "/pqc-arsenal", action: "阅读图鉴" },
  { title: "密码实验室", text: "把算法带进浏览器，亲手完成一次密钥封装或签名验证。", href: "/pqc-practice", action: "开始实验" },
];

export default function About() {
  return (
    <main id="main-content" className="milk ab-page">
      <MotionSurface>
        <section className="ab-hero" aria-labelledby="profile-title">
          <div className="ab-hero-copy">
            <p className="ab-kicker"><i className="milk-latin">About,</i>关于我</p>
            <h1 id="profile-title" className="milk-display"><span>你好 我是</span>Yibiao</h1>
            <p className="ab-intro">从山大出发<br />在密码与安全的世界里继续探索</p>
            <p className="ab-bio">我在山东大学完成了网络空间安全专业的本科与硕士学习，现在中电信量子集团工作。这里记录我的技术探索，也收藏一些关于代码、设计与好奇心的尝试。</p>
            <div className="ab-actions">
              <a className="milk-button" href="#journey">我的经历</a>
              <a className="milk-link" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <div className="ab-hero-card">
            <FloatingIdentity />
            <img className="ab-hero-naiwa" src="/assets/naiwa/wave.webp" width="760" height="1140" alt="一手拿着奶瓶、一手挥着打招呼的奶蛙" fetchPriority="high" />
          </div>
        </section>
        <nav className="ab-index" aria-label="个人主页目录">
          <span>一份仍在续写的个人记录</span>
          <div><a href="#journey">我的经历</a><a href="#focus">技术方向</a><a href="#projects">个人项目</a><a href="#contact">找到我</a></div>
        </nav>

        <section id="journey" className="ab-section" aria-labelledby="journey-title">
          <header className="ab-head" data-reveal><p className="milk-time"><b>2018 →</b>我的经历</p><h2 id="journey-title" className="milk-display">一路走来</h2><p>七年山大学习时光<br />从网络空间安全走向量子安全实践</p></header>
          <ol className="ab-timeline">
            {journey.map(item => <li key={item.period} data-current={item.current} data-reveal>
              <p className="ab-year milk-latin" aria-hidden="true">{item.year}</p>
              <div className="ab-period"><span>{item.period}</span><small>{item.type}</small></div>
              <div className="ab-place"><h3 className="milk-display">{item.place}</h3>{item.current && <span>现在</span>}<p>{item.detail}</p></div>
              <p className="ab-body">{item.body}</p>
            </li>)}
          </ol>
        </section>

        <section id="focus" className="ab-focus milk-on-cobalt" aria-labelledby="focus-title">
          <MilkSurface className="ab-focus-surface" />
          <div className="ab-focus-inner">
            <header className="ab-head" data-reveal><p className="milk-time"><b>Now,</b>技术方向</p><h2 id="focus-title" className="milk-display">我正在关注</h2><p>从算法到协议<br />再到可以落地的工程实现</p></header>
            <div className="ab-focus-grid">{focus.map(item => <article key={item.title} data-reveal>
              <span className="ab-verb milk-display" aria-hidden="true">{item.verb}</span>
              <p className="ab-who">{item.who}</p>
              <h3 className="milk-display">{item.title}</h3>
              <p>{item.text}</p>
              <ul>{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
            </article>)}</div>
          </div>
        </section>

        <section id="projects" className="ab-section" aria-labelledby="projects-title">
          <header className="ab-head" data-reveal><p className="milk-time"><b>After hours,</b>个人项目</p><h2 id="projects-title" className="milk-display">工作之外的创造</h2><p>把好奇心写进代码<br />把想法做成可以体验的作品</p></header>
          <div className="ab-projects">{projects.map(item => {
            const Tag = item.href === "/pqc-practice" ? "a" : Link;
            return <Tag href={item.href} key={item.title} data-reveal><h3 className="milk-display">{item.title}</h3><p>{item.text}</p><span>{item.action}<i aria-hidden="true">→</i></span></Tag>;
          })}</div>
        </section>

        <section id="contact" className="ab-contact milk-on-cobalt" aria-labelledby="contact-title">
          <img className="ab-contact-naiwa" src="/assets/naiwa/ask.webp" width="760" height="1140" alt="歪着头、举起一只手的奶蛙" loading="lazy" decoding="async" />
          <div data-reveal>
            <p className="milk-time"><b>Hello,</b>找到我</p>
            <h2 id="contact-title" className="milk-display">很高兴在这里遇见你</h2>
            <p>如果你也对密码、安全或有趣的技术表达感兴趣<br />欢迎来 GitHub 看看我的代码与项目</p>
            <a className="milk-button" data-tone="butter" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">访问我的 GitHub</a>
          </div>
          <span className="ab-signature milk-latin" aria-label="WANG YIBIAO">WANG YIBIAO</span>
        </section>
      </MotionSurface>
    </main>
  );
}
