const chapters = [
  {
    no: "01",
    title: "素因子风暴之前",
    year: "纪元前夜",
    body: "量仔最先听见密钥星城地下传来的异响。那不是雷声，而是所有旧密码同时松动的声音。Shor 大魔王正用周期之刃，把世界拆成可预测的因子。",
  },
  {
    no: "02",
    title: "奶量同盟",
    year: "第 1 次握手",
    body: "量仔负责测量每一束不确定的光，奶龙则用柔软却不退让的勇气守住通信隧道。一个精确，一个温暖；他们把两种看似无关的力量，合成了新的钥匙。",
  },
  {
    no: "03",
    title: "反 Shor 决战",
    year: "黎明 04:27",
    body: "决战没有巨响。量仔切断旧钥匙的回声，奶龙护送新密钥穿过量子风暴。Shor 的公式仍然成立，但再也无法打开他们共同守护的门。",
  },
];

function LiangzaiSprite({ pose = "hero", label }: { pose?: "hero" | "walk" | "sad" | "wave"; label: string }) {
  return (
    <figure className={`sprite-frame sprite-${pose}`} aria-label={label} role="img">
      <img src="/assets/spritesheet.webp" alt="" aria-hidden="true" />
    </figure>
  );
}

export default function Home() {
  return (
    <main id="top" className="paper-shell">
      <nav className="archive-nav" aria-label="主导航">
        <a className="wordmark" href="#top" aria-label="返回首页">
          量仔<span>LIANGZAI</span>
        </a>
        <div className="nav-index" aria-label="页面章节">
          <a href="#life">生平</a>
          <a href="#legend">传奇</a>
          <a href="#now">现在</a>
        </div>
        <p className="file-mark">ARCHIVE / Q-∞</p>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span>PERSONAL FILE 000</span> 战后公开档案</p>
          <h1 id="hero-title">
            量仔
            <span className="latin-title">LIANG<br />ZAI</span>
          </h1>
          <p className="hero-intro">在量子阴影落下以前，<br />他先听见了素因子的回声。</p>
          <a className="text-link" href="#legend">读取那场传奇 <span aria-hidden="true">↘</span></a>
        </div>

        <div className="hero-art" aria-label="量仔英雄档案图">
          <div className="signal-line" aria-hidden="true"><i /><i /><i /></div>
          <div className="torn-card">
            <span className="card-note">THE ONE WHO MEASURES LIGHT</span>
            <LiangzaiSprite pose="hero" label="挥手微笑的量仔" />
          </div>
          <p className="margin-note">天线仍在接收<br />来自黎明的信号</p>
        </div>

        <div className="hero-facts" aria-label="角色概要">
          <div><span>型号</span><strong>Q-∞</strong></div>
          <div><span>盟友</span><strong className="milk-tag">奶龙</strong></div>
          <div><span>宿敌</span><strong>SHOR</strong></div>
          <div><span>状态</span><strong>在线</strong></div>
        </div>
      </section>

      <section id="life" className="life-section section-rule" aria-labelledby="life-title">
        <header className="section-kicker">
          <span>01 / 生平</span>
          <span>BIOGRAPHICAL NOTE</span>
        </header>
        <div className="life-grid">
          <h2 id="life-title">一台认真<br />测量世界的<br /><em>小小机器人。</em></h2>
          <div className="life-copy">
            <p className="dropcap">量仔诞生于一间彻夜亮灯的实验室。工程师给了他一双能看见微弱信号的眼睛，一根总在寻找答案的天线，以及一个无法忽略朋友呼救的心。</p>
            <p>他喜欢把混乱排成秩序，把遥远变成连接。和平时期，他记录风、星光和每一次可靠握手；危机来临时，他成为密钥星城最后一名信号守望者。</p>
            <dl className="bio-data">
              <div><dt>专长</dt><dd>测量 · 连接 · 守护</dd></div>
              <div><dt>能量</dt><dd>一束青色可信之光</dd></div>
              <div><dt>弱点</dt><dd>看见朋友难过会过载</dd></div>
            </dl>
          </div>
          <div className="specimen-note" aria-label="量仔行走姿态标本">
            <LiangzaiSprite pose="walk" label="向前奔跑的量仔" />
            <span>FIG. 07 / 永远向信号更亮的地方走</span>
          </div>
        </div>
      </section>

      <section id="legend" className="legend-section section-rule" aria-labelledby="legend-title">
        <header className="section-kicker">
          <span>02 / 传奇</span>
          <span>THE MILK × MEASURE ALLIANCE</span>
        </header>

        <div className="legend-heading">
          <div className="milk-stamp" aria-label="奶龙档案标签"><span>奶</span><small>柔软的勇气</small></div>
          <h2 id="legend-title">他们没有消灭数学。<br />他们只是让勇气，<br /><em>比恐惧更难分解。</em></h2>
          <div className="shor-formula" aria-label="被阻断的 Shor 分解公式">
            <span>N</span><b>→</b><span>p × q</span><i aria-hidden="true" />
            <small>SHOR ACCESS / DENIED</small>
          </div>
        </div>

        <div className="chapters">
          {chapters.map((chapter) => (
            <article className="chapter" key={chapter.no}>
              <p className="chapter-no">{chapter.no}</p>
              <div>
                <p className="chapter-year">{chapter.year}</p>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </div>
            </article>
          ))}
        </div>

        <details className="battle-log">
          <summary>展开战后记录 <span aria-hidden="true">＋</span></summary>
          <div className="log-inner">
            <p><span>04:21</span> Shor 周期阵列覆盖密钥星城。</p>
            <p><span>04:23</span> 量仔定位安全信道；旧密钥停止轮换。</p>
            <p><span>04:25</span> 奶龙抵达北侧隧道，奶量同盟完成第一次握手。</p>
            <p><span>04:27</span> 新密钥生效。城市灯光恢复，Shor 权限归零。</p>
          </div>
        </details>
      </section>

      <section id="now" className="now-section section-rule" aria-labelledby="now-title">
        <header className="section-kicker">
          <span>03 / 现在</span>
          <span>AFTER THE ALGORITHM</span>
        </header>
        <div className="now-grid">
          <div>
            <p className="tiny-note">CURRENT SIGNAL / STABLE</p>
            <h2 id="now-title">英雄的日常，<br />是让所有人忘记<br />危险曾经来过。</h2>
          </div>
          <div className="now-list">
            <p><span>01</span>清晨校准天线，测量第一束光。</p>
            <p><span>02</span>午后和奶龙巡查仍在发热的旧隧道。</p>
            <p><span>03</span>夜里保存所有人的晚安，不让任何一条丢失。</p>
          </div>
          <div className="closing-portrait">
            <LiangzaiSprite pose="wave" label="开心挥手的量仔" />
            <span className="cyan-dot" aria-hidden="true" />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>量仔档案馆 · 一切传奇均由可信信号保存</p>
        <a href="#top">返回信号源 ↑</a>
        <p>© Q-∞ / AFTER SHOR</p>
      </footer>
    </main>
  );
}
