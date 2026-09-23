import type { Metadata } from "next";
import Link from "next/link";
import { MotionSurface } from "../experience/Motion";
export const metadata: Metadata = {
  title: "量仔背后的人 · Wang Yibiao",
  description:
    "从抗量子密码到安全协议，从工程实现到技术表达。认识量仔背后的探索者。",
};
const focus = [
  {
    n: "01",
    name: "抗量子密码",
    en: "POST-QUANTUM CRYPTOGRAPHY",
    body: "关注后量子算法的实现、安全评估与性能优化，让数学上的安全假设，走向可以验证、可以使用的工程实现。",
  },
  {
    n: "02",
    name: "安全协议与密码敏捷",
    en: "TLS / TLCP / SSH / IKE · IPSEC",
    body: "围绕安全协议的抗量子改造与迁移展开研发，关注算法与协议解耦、混合密钥协商，以及不同密码能力之间的灵活切换。",
  },
  {
    n: "03",
    name: "PQC 与 QKD 融合",
    en: "MULTIPLE ROOTS OF TRUST",
    body: "探索经典密码、后量子密码与量子密钥分发的协同使用，将密钥接入、协商流程与生命周期管理放在同一套工程视角下思考。",
  },
  {
    n: "04",
    name: "从实现，到表达",
    en: "ENGINEERING & COMMUNICATION",
    body: "关心算法库、JCE 接口、跨平台适配与测试验证，也关心如何把复杂的技术，讲成逻辑清晰、能够被理解的故事。",
  },
];
export default function About() {
  return (
    <main id="main-content">
      <MotionSurface>
        <section className="profile-hero">
          <div>
            <p className="eyebrow" data-intro>
              THE HUMAN BEHIND LIANGZAI
            </p>
            <h1 data-title>
              你好。
              <br />
              我是量仔
              <br />
              <em>背后的人。</em>
            </h1>
            <p className="profile-intro" data-intro>
              我关注抗量子密码与安全协议，也喜欢把抽象的技术变成看得见、摸得着的体验。量仔，是我连接技术与好奇心的一种方式。
            </p>
            <div className="profile-signature" data-intro>
              <span>WANG YIBIAO</span>
              <span>CRYPTOGRAPHY · ENGINEERING · CURIOSITY</span>
            </div>
          </div>
          <div className="identity-art" data-intro aria-label="WY 银色字母艺术">
            <span className="identity-monogram" aria-hidden="true">
              WY
            </span>
            <div className="identity-caption">
              <span>HUMAN / 001</span>
              <span>ALWAYS EXPLORING</span>
            </div>
          </div>
        </section>
        <section className="profile-quote">
          <p className="eyebrow" data-reveal>
            A PERSONAL PERSPECTIVE
          </p>
          <blockquote data-reveal>
            把复杂问题想清楚，
            <br />
            把安全能力做扎实，
            <br />
            <span>也把技术，讲得有温度。</span>
          </blockquote>
        </section>
        <section className="section-wrap">
          <div className="expertise-intro" data-reveal>
            <div>
              <p className="eyebrow">01 / WHAT I WORK ON</p>
              <h2>
                我的工作，
                <br />
                围绕可信连接展开。
              </h2>
            </div>
            <p>
              从算法原语，到协议握手，再到系统集成。
              <br />
              我更关心技术如何在真实环境里工作：能否兼容，能否迁移，能否经得起验证。
            </p>
          </div>
          {focus.map((f) => (
            <article className="expertise-row" key={f.n} data-reveal>
              <span>{f.n}</span>
              <div>
                <h3>{f.name}</h3>
                <small>{f.en}</small>
              </div>
              <p>{f.body}</p>
            </article>
          ))}
        </section>
        <section className="about-origin section-wrap">
          <div className="about-origin-art" data-reveal>
            <img
              src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
              alt="来自量子星的蓝白机器人量仔"
              loading="lazy"
            />
            <span>AN IDEA, WITH A LITTLE HEART.</span>
          </div>
          <div data-reveal>
            <p className="eyebrow">02 / WHY LIANGZAI</p>
            <h2>
              技术可以很深。
              <br />
              表达，可以很近。
            </h2>
            <p>
              量子、密码、安全协议——这些词，常常显得遥远。量仔给它们一个亲近的入口：一段冒险、一件武器、一次可以亲手操作的实验。
            </p>
            <p>
              我希望这里既能承载严谨的技术内容，也能保留探索未知的轻松与快乐。让好奇成为理解的开始。
            </p>
            <Link className="line-link" href="/archive">
              认识这个小小探索者
            </Link>
          </div>
        </section>
        <section className="contact-line" data-reveal>
          <p className="eyebrow">03 / KEEP THE CONVERSATION OPEN</p>
          <h2>保持好奇。继续创造。</h2>
          <p>更多代码与探索，留在 GitHub。</p>
          <a
            className="silver-button"
            data-magnetic
            href="https://github.com/yibiaowangsd"
            target="_blank"
            rel="noreferrer"
          >
            访问我的 GitHub
            <i aria-hidden="true" />
          </a>
        </section>
      </MotionSurface>
    </main>
  );
}
