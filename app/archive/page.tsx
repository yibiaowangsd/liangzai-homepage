import Link from "next/link";
import type { Metadata } from "next";
import { MotionSurface } from "../experience/Motion";
export const metadata: Metadata = {
  title: "量仔小传",
  description:
    "测量、连接、守护。认识来自量子星的小小探索者，与奶龙共同守护秘密的旅程。",
};
const chapters = [
  {
    no: "01",
    title: "素因子风暴之前",
    year: "纪元前夜",
    image: "/assets/characters-v2/archive-origin.webp",
    alt: "量仔在实验室捕捉到异常信号",
    body: "量仔最先听见密钥星城地下传来的异响。那不是雷声，而是所有旧密码同时松动的声音。Shor 大魔王正用周期之刃，把世界拆成可预测的因子。",
  },
  {
    no: "02",
    title: "奶量同盟",
    year: "第 1 次握手",
    image: "/assets/characters-v2/archive-alliance-v2.webp",
    alt: "量仔与奶龙在通信隧道前握手",
    body: "量仔负责测量每一束不确定的光，奶龙则用柔软却不退让的勇气守住通信隧道。一个精确，一个温暖；他们把两种看似无关的力量，合成了新的钥匙。",
  },
  {
    no: "03",
    title: "反 Shor 决战",
    year: "黎明 04:27",
    image: "/assets/characters-v2/archive-battle.webp",
    alt: "量仔与奶龙并肩对抗 Shor 大魔王",
    body: "决战没有巨响。量仔切断旧钥匙的回声，奶龙护送新密钥穿过量子风暴。Shor 的公式仍然成立，但再也无法打开他们共同守护的门。",
  },
];
export default function Archive() {
  return (
    <main id="main-content">
      <MotionSurface>
        <section className="character-hero">
          <div>
            <p className="eyebrow" data-intro>
              <span className="status-light" /> PERSONAL FILE 000 / GUARDIAN
              ONLINE
            </p>
            <h1 data-title>
              量仔<span>LIANGZAI</span>
            </h1>
            <p className="lead" data-intro>
              一根寻找答案的天线。
              <br />
              一颗无法忽略朋友的心。
            </p>
            <Link href="/storybook" className="line-link" data-intro>
              进入他的宇宙冒险
            </Link>
            <dl className="character-stats" data-intro>
              {[
                ["型号", "Q–∞"],
                ["盟友", "奶龙"],
                ["宿敌", "SHOR"],
                ["状态", "在线"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="character-visual" data-intro>
            <img
              src="/assets/characters-v2/arsenal-liangzai-cutout.webp"
              alt="蓝白战甲、蓝色天线的量仔全身形象"
              width="1024"
              height="1536"
            />
            <span>
              <i>THE GUARDIAN</i>
              <i>Q–∞ / 001</i>
            </span>
          </div>
        </section>
        <section className="character-bio section-wrap" id="life">
          <div data-reveal>
            <p className="eyebrow">01 / THE ONE WHO MEASURES LIGHT</p>
            <h2>
              一台认真
              <br />
              测量世界的
              <br />
              <span className="silver-text">小小机器人</span>
            </h2>
          </div>
          <div data-reveal>
            <p>
              量仔诞生于一间彻夜亮灯的实验室。工程师给了他一双能看见微弱信号的眼睛，一根总在寻找答案的天线，以及一个无法忽略朋友呼救的心。
            </p>
            <p>
              他喜欢把混乱排成秩序，把遥远变成连接。和平时期，他记录风、星光和每一次可靠握手；危机来临时，他成为密钥星城最后一名信号守望者。
            </p>
            <dl>
              <div>
                <dt>专长</dt>
                <dd>测量 · 连接 · 守护</dd>
              </div>
              <div>
                <dt>能量</dt>
                <dd>一束青色可信之光</dd>
              </div>
              <div>
                <dt>弱点</dt>
                <dd>看见朋友难过会过载</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="chronicle" id="legend">
          <p className="eyebrow" data-reveal>
            02 / THE MILK × MEASURE ALLIANCE
          </p>
          <h2 data-reveal>
            让勇气
            <br />
            <span className="silver-text">比恐惧更难分解</span>
          </h2>
          {chapters.map((c) => (
            <article className="chronicle-entry" key={c.no}>
              <div className="chronicle-visual" data-reveal>
                <img
                  data-parallax="8"
                  src={c.image}
                  alt={c.alt}
                  loading="lazy"
                />
              </div>
              <div className="chronicle-copy" data-reveal>
                <span>
                  {c.no} / {c.year}
                </span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
          <details className="archive-log">
            <summary>
              展开战后记录<span aria-hidden="true">＋</span>
            </summary>
            <p>
              <span>04:21</span>Shor 周期阵列覆盖密钥星城。
            </p>
            <p>
              <span>04:23</span>量仔定位安全信道；旧密钥停止轮换。
            </p>
            <p>
              <span>04:25</span>奶龙抵达北侧隧道，奶量同盟完成第一次握手。
            </p>
            <p>
              <span>04:27</span>新密钥生效。城市灯光恢复，Shor 权限归零。
            </p>
          </details>
        </section>
        <section className="archive-now section-wrap" id="now">
          <div data-reveal>
            <p className="eyebrow">03 / AFTER THE ALGORITHM</p>
            <h2>
              英雄的日常
              <br />
              是守护每一个
              <br />
              <span className="silver-text">普通清晨</span>
            </h2>
            <p>
              清晨校准天线，测量第一束光。
              <br />
              午后和奶龙巡查仍在发热的旧隧道。
              <br />
              夜里保存所有人的晚安，不让任何一条丢失。
            </p>
            <Link className="line-link" href="/pqc-arsenal">
              探索量仔的密码图鉴
            </Link>
          </div>
          <img
            data-reveal
            src="/assets/characters-v2/archive-after.webp"
            alt="量仔与奶龙眺望恢复通信的城市"
            loading="lazy"
          />
        </section>
      </MotionSurface>
    </main>
  );
}
