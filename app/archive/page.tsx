import Link from "next/link";
import type { Metadata } from "next";
import { MotionSurface } from "../experience/Motion";
import MilkSurface from "../milk/MilkSurface";
import "./archive.css";

export const metadata: Metadata = {
  title: "量仔小传",
  description: "测量、连接、守护。认识来自量子星的小小探索者量仔，和抱着奶瓶、一步不退的奶蛙。",
};

const chapters = [
  { time: "纪元前夜", title: "素因子风暴之前", image: "/assets/characters-v2/archive-origin.webp", alt: "量仔在实验室捕捉到异常信号", body: "量仔最先听见密钥星城地下传来的异响。那不是雷声，而是所有旧密码同时松动的声音。Shor 大魔王正用周期之刃，把世界拆成可预测的因子。" },
  { time: "第 1 次握手", title: "奶量同盟", image: "/assets/characters-v2/archive-alliance-v2.webp", alt: "量仔与奶蛙在通信隧道前握手", body: "量仔负责测量每一束不确定的光，奶蛙则用柔软却不退让的勇气守住通信隧道。一个精确，一个温暖；他们把两种看似无关的力量，合成了新的钥匙。" },
  { time: "黎明 04:27", title: "反 Shor 决战", image: "/assets/characters-v2/archive-battle.webp", alt: "量仔与奶蛙并肩对抗 Shor 大魔王", body: "决战没有巨响。量仔切断旧钥匙的回声，奶蛙护送新密钥穿过量子风暴。Shor 的公式仍然成立，但再也无法打开他们共同守护的门。" },
];
const log = [
  ["04:21", "Shor 周期阵列覆盖密钥星城。"],
  ["04:23", "量仔定位安全信道；旧密钥停止轮换。"],
  ["04:25", "奶蛙抵达北侧隧道，奶量同盟完成第一次握手。"],
  ["04:27", "新密钥生效。城市灯光恢复，Shor 权限归零。"],
];

export default function Archive() {
  return (
    <main id="main-content" className="milk ar-page">
      <MotionSurface>
        <section className="ar-hero" id="liangzai" aria-labelledby="liangzai-title">
          <div className="ar-hero-copy">
            <p className="ar-file"><i className="milk-latin">File 001,</i>角色档案 001 · 一位来自量子星的朋友</p>
            <h1 id="liangzai-title" className="milk-display"><small>测量世界，也守护你</small>量仔</h1>
            <p className="ar-lead">一根寻找答案的天线。<br />一颗无法忽略朋友的心。</p>
            <dl className="ar-stats">
              {[["型号", "Q–∞"], ["盟友", "奶蛙"], ["宿敌", "SHOR"], ["状态", "在线"]].map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}
            </dl>
            <div className="ar-actions"><Link href="/storybook" className="milk-button">进入他的宇宙冒险</Link><a href="#naiwa" className="milk-link">下一份：奶蛙</a></div>
          </div>
          <figure className="ar-portrait" data-tone="pale">
            <span className="ar-verb milk-display" aria-hidden="true">量</span>
            <img src="/assets/characters-v2/arsenal-liangzai-cutout.webp" alt="蓝白战甲、蓝色天线的量仔全身形象" width="1024" height="1536" fetchPriority="high" />
            <figcaption><span>THE ONE WHO MEASURES</span><span>Q–∞ / 001</span></figcaption>
          </figure>
        </section>

        <section className="ar-bio" aria-labelledby="liangzai-bio">
          <h2 id="liangzai-bio" className="milk-display" data-reveal>一台认真<br />测量世界的<br /><em>小小机器人</em></h2>
          <div data-reveal>
            <p>量仔诞生于一间彻夜亮灯的实验室。工程师给了他一双能看见微弱信号的眼睛，一根总在寻找答案的天线，以及一个无法忽略朋友呼救的心。</p>
            <p>他喜欢把混乱排成秩序，把遥远变成连接。和平时期，他记录风、星光和每一次可靠握手；危机来临时，他成为密钥星城最后一名信号守望者。</p>
            <dl>
              <div><dt>专长</dt><dd>测量 · 连接 · 守护</dd></div>
              <div><dt>能量</dt><dd>一束青色可信之光</dd></div>
              <div><dt>弱点</dt><dd>看见朋友难过会过载</dd></div>
            </dl>
          </div>
        </section>

        <section className="ar-second milk-on-cobalt" id="naiwa" aria-labelledby="naiwa-title">
          <MilkSurface className="ar-second-surface" />
          <div className="ar-hero ar-hero-flip">
            <figure className="ar-portrait" data-tone="cobalt">
              <span className="ar-verb milk-display" aria-hidden="true">守</span>
              <img src="/assets/naiwa/stand.webp" alt="奶黄色、圆肚皮、绿眼圈的奶蛙全身形象" width="760" height="1140" loading="lazy" decoding="async" />
              <figcaption><span>THE ONE WHO STAYS</span><span>N–240 / 002</span></figcaption>
            </figure>
            <div className="ar-hero-copy" data-reveal>
              <p className="ar-file"><i className="milk-latin">File 002,</i>角色档案 002 · 一位抱着奶瓶的朋友</p>
              <h2 id="naiwa-title" className="milk-display"><small>不赶时间，也不后退</small>奶蛙</h2>
              <p className="ar-lead">一个圆滚滚的肚皮。<br />一句“我再撑一会儿”。</p>
              <dl className="ar-stats">
                {[["型号", "N–240"], ["盟友", "量仔"], ["口粮", "温牛奶"], ["状态", "守着"]].map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}
              </dl>
            </div>
          </div>
          <div className="ar-bio ar-bio-second">
            <h3 className="milk-display" data-reveal>有人说他是龙，<br />有人说他是蛙，<br /><em>他从不解释</em></h3>
            <div data-reveal>
              <p>没人说得清奶蛙从哪里来。绘本里，游历群星的人们叫他奶龙；回到家，他只是奶蛙：抱着一只 240 毫升的奶瓶，站在需要有人站着的地方。</p>
              <p>他话很少，步子很慢，却从不后退。量仔负责找到答案，他负责在答案出现以前，替大家多撑一会儿。</p>
              <dl>
                <div><dt>专长</dt><dd>站稳 · 陪伴 · 多撑一会儿</dd></div>
                <div><dt>能量</dt><dd>一瓶刚温好的牛奶</dd></div>
                <div><dt>弱点</dt><dd>故事讲到第九页就会睡着</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="ar-legend" id="legend" aria-labelledby="legend-title">
          <header className="ar-head" data-reveal>
            <p className="milk-time"><b>Together,</b>奶量同盟</p>
            <h2 id="legend-title" className="milk-display">让勇气<br /><em>比恐惧更难分解</em></h2>
          </header>
          {chapters.map(chapter => <article className="ar-chapter" key={chapter.title}>
            <div className="ar-chapter-art" data-reveal><img data-parallax="8" src={chapter.image} alt={chapter.alt} loading="lazy" /></div>
            <div className="ar-chapter-copy" data-reveal><span>{chapter.time}</span><h3 className="milk-display">{chapter.title}</h3><p>{chapter.body}</p></div>
          </article>)}
          <details className="ar-log">
            <summary>展开战后记录<span aria-hidden="true">＋</span></summary>
            {log.map(([time, text]) => <p key={time}><span>{time}</span>{text}</p>)}
          </details>
        </section>

        <section className="ar-now" id="now" aria-labelledby="now-title">
          <div data-reveal>
            <p className="milk-time"><b>After,</b>算法之后</p>
            <h2 id="now-title" className="milk-display">英雄的日常<br />是守护每一个<br /><em>普通清晨</em></h2>
            <p>清晨校准天线，测量第一束光。<br />午后和奶蛙巡查仍在发热的旧隧道。<br />夜里保存所有人的晚安，不让任何一条丢失。</p>
            <div className="ar-actions"><Link className="milk-button" href="/pqc-arsenal">探索量仔的密码图鉴</Link><Link className="milk-link" href="/models">旋转查看角色模型</Link></div>
          </div>
          <img data-reveal src="/assets/characters-v2/archive-after.webp" alt="量仔与奶蛙眺望恢复通信的城市" loading="lazy" />
        </section>
      </MotionSurface>
    </main>
  );
}
