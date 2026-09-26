import type { Metadata } from "next";
import Link from "next/link";
import { MotionSurface } from "../experience/Motion";
import styles from "./profile.module.css";

export const metadata: Metadata = {
  title: "关于我 Wang Yibiao",
  description: "Yibiao 的个人主页。2018 至 2025 年在山东大学学习网络空间安全，现就职于中电信量子集团，关注抗量子密码、安全协议与密码工程。",
};

const journey = [
  { period: "2025 至今", type: "工作", place: "中电信量子集团", detail: "抗量子密码与安全协议", body: "将对密码与安全的研究延伸到工程实践，关注抗量子协议改造、密码敏捷，以及 PQC 与 QKD 的融合应用。", current: true },
  { period: "2022—2025", type: "硕士", place: "山东大学", detail: "网络空间安全", body: "继续在网络空间安全领域学习与研究，从本科阶段的专业积累走向更深入的探索。", current: false },
  { period: "2018—2022", type: "本科", place: "山东大学", detail: "网络空间安全", body: "在山大开启网络空间安全的学习之路，也是我走近密码学与安全技术的起点。", current: false },
];
const focus = [
  { n: "01", title: "抗量子密码", text: "关注后量子算法实现、测试验证与性能优化，让密码算法在真实系统中运行起来。", tags: ["算法实现", "测试验证", "性能优化"] },
  { n: "02", title: "安全协议", text: "围绕 TLS、TLCP、SSH 与 IKE 协议，探索抗量子迁移、混合密钥协商与密码敏捷。", tags: ["协议改造", "混合协商", "密码敏捷"] },
  { n: "03", title: "密码工程", text: "关心 PQC 与 QKD 如何协同，也关心算法库、接口与跨平台适配如何衔接成可用的能力。", tags: ["PQC 与 QKD", "算法库", "系统集成"] },
];
const projects = [
  { no: "01", title: "量仔的数字世界", text: "用角色、故事和交互，把抽象的技术变成一个可以探索的世界。", href: "/", action: "探索首页" },
  { no: "02", title: "密码图鉴", text: "从直觉走向原理，用可视化理解后量子密码背后的数学问题。", href: "/pqc-arsenal", action: "阅读图鉴" },
  { no: "03", title: "密码实验室", text: "把算法带进浏览器，亲手完成一次密钥封装或签名验证。", href: "/pqc-practice", action: "开始实验" },
];

export default function About() {
  return (
    <main id="main-content" className={styles.profile}>
      <MotionSurface>
        <section className={styles.hero} aria-labelledby="profile-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker} data-intro>关于我</p>
            <h1 id="profile-title" data-title><span>你好 我是</span><br />Yibiao</h1>
            <p className={styles.intro} data-intro>从山大出发<br />在密码与安全的世界里继续探索</p>
            <p className={styles.bio} data-intro>我在山东大学完成了网络空间安全专业的本科与硕士学习，现在中电信量子集团工作。这里记录我的技术探索，也收藏一些关于代码、设计与好奇心的尝试。</p>
            <div className={styles.actions} data-intro>
              <a className="silver-button" href="#journey">我的经历<i aria-hidden="true" /></a>
              <a className="line-link" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <aside className={styles.identity} data-intro aria-label="个人名片">
            <div className={styles.cardTop}><span>WANG YIBIAO</span><span className={styles.status}>持续探索中</span></div>
            <span className={styles.monogram} aria-hidden="true">WY</span>
            <div className={styles.cardBottom}>
              <p>密码学与工程实践</p>
              <dl><div><dt>现在</dt><dd>中电信量子集团</dd></div><div><dt>毕业于</dt><dd>山东大学</dd></div><div><dt>关注</dt><dd>抗量子密码与安全协议</dd></div></dl>
            </div>
          </aside>
        </section>
        <nav className={styles.index} aria-label="个人主页目录">
          <span>一份仍在续写的个人记录</span>
          <div><a href="#journey">我的经历</a><a href="#focus">技术方向</a><a href="#projects">个人项目</a><a href="#contact">找到我</a></div>
        </nav>
        <section id="journey" className={styles.section} aria-labelledby="journey-title">
          <div className={styles.sectionHead} data-reveal><p className={styles.kicker}>01 我的经历</p><h2 id="journey-title">一路走来</h2><p>七年山大学习时光<br />从网络空间安全走向量子安全实践</p></div>
          <ol className={styles.timeline}>
            {journey.map((item) => <li key={item.period} data-reveal>
              <div className={styles.period}><span>{item.period}</span><small>{item.type}</small></div>
              <div className={`${styles.timelineBody} ${item.current ? styles.current : ""}`}>
                <div className={styles.place}><h3>{item.place}</h3>{item.current && <span>现在</span>}</div>
                <p className={styles.detail}>{item.detail}</p><p className={styles.description}>{item.body}</p>
              </div>
            </li>)}
          </ol>
        </section>
        <section id="focus" className={styles.section} aria-labelledby="focus-title">
          <div className={styles.sectionHead} data-reveal><p className={styles.kicker}>02 技术方向</p><h2 id="focus-title">我正在关注</h2><p>从算法到协议<br />再到可以落地的工程实现</p></div>
          <div className={styles.focusGrid}>{focus.map((item) => <article className={styles.focusCard} key={item.n} data-reveal><span className={styles.number}>{item.n}</span><h3>{item.title}</h3><p>{item.text}</p><ul>{item.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></article>)}</div>
        </section>
        <section id="projects" className={styles.section} aria-labelledby="projects-title">
          <div className={styles.sectionHead} data-reveal><p className={styles.kicker}>03 个人项目</p><h2 id="projects-title">工作之外的创造</h2><p>把好奇心写进代码<br />把想法做成可以体验的作品</p></div>
          <div className={styles.projects}>{projects.map((item) => <Link href={item.href} className={styles.project} key={item.no} data-reveal><span className={styles.number}>{item.no}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><span className={styles.projectAction}>{item.action}<i aria-hidden="true" /></span></Link>)}</div>
        </section>
        <section id="contact" className={styles.contact} aria-labelledby="contact-title" data-reveal><p className={styles.kicker}>04 找到我</p><h2 id="contact-title">很高兴在这里遇见你</h2><p>如果你也对密码、安全或有趣的技术表达感兴趣<br />欢迎来 GitHub 看看我的代码与项目</p><a className="silver-button" href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">访问我的 GitHub<i aria-hidden="true" /></a><span className={styles.signature}>WANG YIBIAO</span></section>
      </MotionSurface>
    </main>
  );
}
