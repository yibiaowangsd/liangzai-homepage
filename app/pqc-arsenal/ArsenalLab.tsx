"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type WeaponId = "ml-kem" | "ml-dsa" | "slh-dsa" | "fn-dsa";

type Level = {
  name: string;
  security: string;
  publicKey: string;
  payloadLabel: string;
  payload: string;
};

type Weapon = {
  id: WeaponId;
  code: string;
  name: string;
  role: string;
  status: string;
  metaphor: string;
  simple: string;
  principle: string;
  scene: string;
  caution: string;
  accent: string;
  shape: string;
  scores: { bandwidth: number; speed: number; simplicity: number; diversity: number };
  levels: Level[];
};

const weapons: Weapon[] = [
  {
    id: "ml-kem",
    code: "FIPS 203",
    name: "ML-KEM",
    role: "共享密钥建立",
    status: "正式标准 · 2024",
    metaphor: "晶格护盾",
    simple: "双方不用事先见面，也能在公开网络上得到同一把秘密钥匙。",
    principle: "把秘密藏进带有微小误差的模格问题中。合法接收者知道如何消除噪声，攻击者却面对难解的 Module-LWE 问题。",
    scene: "TLS / TLCP / VPN / SSH 等安全连接的握手阶段",
    caution: "KEM 负责产生共享秘密，不直接加密长消息；真正的数据仍由对称密码保护。",
    accent: "cyan",
    shape: "shield",
    scores: { bandwidth: 4, speed: 5, simplicity: 4, diversity: 3 },
    levels: [
      { name: "ML-KEM-512", security: "NIST 1 级", publicKey: "800 B", payloadLabel: "密文", payload: "768 B" },
      { name: "ML-KEM-768", security: "NIST 3 级", publicKey: "1,184 B", payloadLabel: "密文", payload: "1,088 B" },
      { name: "ML-KEM-1024", security: "NIST 5 级", publicKey: "1,568 B", payloadLabel: "密文", payload: "1,568 B" },
    ],
  },
  {
    id: "ml-dsa",
    code: "FIPS 204",
    name: "ML-DSA",
    role: "数字签名",
    status: "正式标准 · 2024",
    metaphor: "晶格印章",
    simple: "发送者盖上别人仿造不了的数学印章，接收者能确认“是谁发的、内容有没有被改”。",
    principle: "利用模格上的短向量与 Fiat–Shamir with Aborts 结构，将消息、随机性和私钥关系压缩成可公开验证的证明。",
    scene: "证书、协议握手签名、软件更新与长期身份认证",
    caution: "签名不是加密：任何人仍可读消息，但无法悄悄修改后继续冒充原作者。",
    accent: "violet",
    shape: "stamp",
    scores: { bandwidth: 3, speed: 4, simplicity: 4, diversity: 3 },
    levels: [
      { name: "ML-DSA-44", security: "NIST 2 级", publicKey: "1,312 B", payloadLabel: "签名", payload: "2,420 B" },
      { name: "ML-DSA-65", security: "NIST 3 级", publicKey: "1,952 B", payloadLabel: "签名", payload: "3,309 B" },
      { name: "ML-DSA-87", security: "NIST 5 级", publicKey: "2,592 B", payloadLabel: "签名", payload: "4,627 B" },
    ],
  },
  {
    id: "slh-dsa",
    code: "FIPS 205",
    name: "SLH-DSA",
    role: "哈希签名",
    status: "正式标准 · 2024",
    metaphor: "哈希树杖",
    simple: "把许多一次性小印章组织成森林，再用树根代表整片森林的可信身份。",
    principle: "以哈希函数为主要安全基础，组合 WOTS+、FORS 与多层 Merkle 树；无需在签名之间维护状态。",
    scene: "看重算法多样性、长期保守性，且能接受较大签名的场景",
    caution: "公钥很小，但签名明显大于格基签名；s 版偏小签名，f 版偏快签名。",
    accent: "gold",
    shape: "tree",
    scores: { bandwidth: 1, speed: 2, simplicity: 3, diversity: 5 },
    levels: [
      { name: "SLH-DSA-128s", security: "NIST 1 级", publicKey: "32 B", payloadLabel: "签名", payload: "7,856 B" },
      { name: "SLH-DSA-192s", security: "NIST 3 级", publicKey: "48 B", payloadLabel: "签名", payload: "16,224 B" },
      { name: "SLH-DSA-256s", security: "NIST 5 级", publicKey: "64 B", payloadLabel: "签名", payload: "29,792 B" },
    ],
  },
  {
    id: "fn-dsa",
    code: "FIPS 206 · 制定中",
    name: "FN-DSA",
    role: "紧凑数字签名",
    status: "基于 Falcon · 尚未定稿",
    metaphor: "猎隼轻刃",
    simple: "同样是数学印章，但追求更小的公钥和签名，适合带宽与证书体积敏感的任务。",
    principle: "基于 NTRU 格与哈希后签名范式，通过精细的离散高斯采样找到靠近目标的短格向量。",
    scene: "证书、固件签名及对通信体积高度敏感的系统",
    caution: "实现难度高，采样、浮点计算与侧信道防护要求严格；FIPS 206 仍在制定，参数信息以最终标准为准。",
    accent: "silver",
    shape: "blade",
    scores: { bandwidth: 5, speed: 4, simplicity: 1, diversity: 3 },
    levels: [
      { name: "FN-DSA-512", security: "目标 NIST 1 级", publicKey: "约 0.9 KB", payloadLabel: "签名", payload: "约 0.7 KB" },
      { name: "FN-DSA-1024", security: "目标 NIST 5 级", publicKey: "约 1.8 KB", payloadLabel: "签名", payload: "约 1.3 KB" },
    ],
  },
];

const scoreNames = {
  bandwidth: "通信轻巧",
  speed: "执行速度",
  simplicity: "实现友好",
  diversity: "原理多样性",
};

export default function ArsenalLab() {
  const [selected, setSelected] = useState<WeaponId>("ml-kem");
  const [levelIndex, setLevelIndex] = useState(1);
  const [demo, setDemo] = useState<"kem" | "sign">("kem");

  const weapon = useMemo(() => weapons.find((item) => item.id === selected) ?? weapons[0], [selected]);
  const activeLevel = weapon.levels[Math.min(levelIndex, weapon.levels.length - 1)];

  function chooseWeapon(id: WeaponId) {
    setSelected(id);
    setLevelIndex(id === "fn-dsa" ? 0 : 1);
  }

  return (
    <main id="top" className="arsenal-shell">
      <nav className="arsenal-nav" aria-label="PQC 武器库导航">
        <Link className="arsenal-brand" href="/">量仔档案馆 <span>/ LIANGZAI ARCHIVE</span></Link>
        <div>
          <a href="#basics">从零开始</a>
          <a href="#weapons">四件武器</a>
          <a href="#loadout">如何选择</a>
        </div>
        <Link className="back-home" href="/">返回主页 ↗</Link>
      </nav>

      <header className="arsenal-hero">
        <div className="arsenal-hero-copy">
          <p className="arsenal-eyebrow"><span>Q-∞ / ARMORY 004</span> 战后装备开放日</p>
          <h1>PQC<br /><em>武器库</em></h1>
          <p className="arsenal-lead">不是用数学攻击别人，<br />而是让未来的攻击者无处下手。</p>
          <a className="arsenal-cta" href="#basics">跟量仔进入武器库 <span>↓</span></a>
        </div>
        <figure className="arsenal-hero-visual">
          <div className="armory-backdrop" aria-hidden="true">
            <span className="armory-weapon lattice-shield"><i /><i /><i /><i /></span>
            <span className="armory-weapon hash-tree"><i /><i /><i /><i /></span>
            <span className="armory-weapon lattice-blade"><i /><i /><i /></span>
            <span className="armory-grid" />
          </div>
          <img src="/assets/story/hero-1ee8364c.png" alt="量仔在武器库中完整展示全身装备" />
          <figcaption>KEEPER Q-∞ / 四件装备均已校准</figcaption>
          <div className="orbit orbit-a"><i />ML</div>
          <div className="orbit orbit-b"><i />HASH</div>
          <div className="orbit orbit-c"><i />NTRU</div>
        </figure>
        <div className="hero-index" aria-label="武器索引">
          {weapons.map((item, index) => <span key={item.id}>{String(index + 1).padStart(2, "0")} {item.name}</span>)}
        </div>
      </header>

      <section id="basics" className="arsenal-section basics-section">
        <header className="arsenal-section-head"><span>01 / 从零开始</span><span>WHY POST-QUANTUM?</span></header>
        <div className="basics-grid">
          <div className="big-question">
            <p className="marker-note">先记住这一句</p>
            <h2>密码不是把门藏起来，<br />而是让所有人都看见门，<br /><em>却只有正确的人能打开。</em></h2>
          </div>
          <div className="quantum-note">
            <span className="shor-mark">N → p × q</span>
            <p>今天很多公钥密码依赖“大整数分解”或“椭圆曲线离散对数”。足够强的量子计算机配合 Shor 算法，会改变这些问题的难度。</p>
            <p>PQC 换了一组目前没有已知高效量子解法的数学难题：格、哈希树、编码等。</p>
          </div>
        </div>

        <div className="job-switch" role="group" aria-label="密码任务演示">
          <button className={demo === "kem" ? "active" : ""} onClick={() => setDemo("kem")}>任务 A：得到同一把钥匙</button>
          <button className={demo === "sign" ? "active" : ""} onClick={() => setDemo("sign")}>任务 B：确认是谁发的</button>
        </div>
        <div className={`crypto-demo ${demo}`} aria-live="polite">
          <div className="demo-person"><span>甲</span><small>{demo === "kem" ? "生成公钥 / 私钥" : "持有签名私钥"}</small></div>
          <div className="demo-channel">
            <div className="packet">{demo === "kem" ? "密钥胶囊" : "消息 + 签名"}</div>
            <div className="channel-line"><i /></div>
            <p>{demo === "kem" ? "公开网络上传的是胶囊，不是最终密钥" : "签名随消息公开传输，任何人都能验证"}</p>
          </div>
          <div className="demo-person"><span>乙</span><small>{demo === "kem" ? "解封得到共享秘密" : "用公钥验证身份"}</small></div>
          <div className="demo-result">{demo === "kem" ? "甲的秘密 = 乙的秘密" : "身份可信 + 内容未改"}</div>
        </div>
      </section>

      <section id="weapons" className="arsenal-section weapons-section">
        <header className="arsenal-section-head"><span>02 / 四件武器</span><span>SELECT & INSPECT</span></header>
        <div className="weapon-tabs" role="tablist" aria-label="选择 PQC 算法">
          {weapons.map((item, index) => (
            <button key={item.id} role="tab" aria-selected={selected === item.id} className={selected === item.id ? "active" : ""} onClick={() => chooseWeapon(item.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.role}</small>
            </button>
          ))}
        </div>

        <article className={`weapon-console accent-${weapon.accent}`}>
          <div className="weapon-identity">
            <div className={`weapon-glyph ${weapon.shape}`} aria-hidden="true"><i /><i /><i /><i /></div>
            <p>{weapon.code}</p>
            <h2>{weapon.name}</h2>
            <strong>{weapon.metaphor}</strong>
            <span>{weapon.status}</span>
          </div>
          <div className="weapon-explain">
            <p className="simple-line">{weapon.simple}</p>
            <dl>
              <div><dt>它凭什么安全？</dt><dd>{weapon.principle}</dd></div>
              <div><dt>量仔在哪里用？</dt><dd>{weapon.scene}</dd></div>
              <div><dt>别误会</dt><dd>{weapon.caution}</dd></div>
            </dl>
          </div>
          <div className="weapon-metrics">
            <p className="metrics-title">任务画像 <span>5 格为相对突出</span></p>
            {Object.entries(weapon.scores).map(([key, value]) => (
              <div className="score-row" key={key}>
                <span>{scoreNames[key as keyof typeof scoreNames]}</span>
                <div>{[1, 2, 3, 4, 5].map((unit) => <i key={unit} className={unit <= value ? "filled" : ""} />)}</div>
              </div>
            ))}
          </div>
          <div className="parameter-bench">
            <div className="bench-control">
              <label htmlFor="security-level">装备规格</label>
              <input id="security-level" type="range" min="0" max={weapon.levels.length - 1} step="1" value={Math.min(levelIndex, weapon.levels.length - 1)} onChange={(event) => setLevelIndex(Number(event.target.value))} />
              <div>{weapon.levels.map((level) => <span key={level.name}>{level.name.replace(/^(ML-|SLH-|FN-)/, "")}</span>)}</div>
            </div>
            <div className="bench-readout">
              <p><span>型号</span><strong>{activeLevel.name}</strong></p>
              <p><span>安全强度</span><strong>{activeLevel.security}</strong></p>
              <p><span>公钥</span><strong>{activeLevel.publicKey}</strong></p>
              <p><span>{activeLevel.payloadLabel}</span><strong>{activeLevel.payload}</strong></p>
            </div>
          </div>
        </article>
      </section>

      <section id="loadout" className="arsenal-section loadout-section">
        <header className="arsenal-section-head"><span>03 / 如何选择</span><span>MISSION LOADOUT</span></header>
        <div className="loadout-grid">
          <div className="loadout-title">
            <p className="marker-note">没有“全属性最强”</p>
            <h2>先问任务，<br />再选武器。</h2>
            <p>密钥建立与数字签名是两类不同任务；签名算法之间，也是在体积、速度、实现复杂度和原理多样性之间取舍。</p>
          </div>
          <div className="mission-list">
            <article><span>01</span><h3>建立安全连接</h3><p>优先看 ML-KEM。它负责让通信双方得到共享秘密，再派生出对称加密密钥。</p><b>选择：ML-KEM</b></article>
            <article><span>02</span><h3>通用身份认证</h3><p>需要成熟标准、均衡性能和较易落地的签名方案。</p><b>选择：ML-DSA</b></article>
            <article><span>03</span><h3>强调不同安全基础</h3><p>希望签名不再依赖格困难问题，并能接受更大的签名。</p><b>选择：SLH-DSA</b></article>
            <article><span>04</span><h3>带宽极其敏感</h3><p>关注紧凑签名，但能承担更高实现与防护难度，并持续跟踪标准进展。</p><b>关注：FN-DSA</b></article>
          </div>
        </div>

        <div className="final-map">
          <div><span>握手</span><strong>ML-KEM</strong><small>先得到共享秘密</small></div>
          <i>＋</i>
          <div><span>身份</span><strong>ML-DSA / SLH-DSA / FN-DSA</strong><small>再证明“我是谁”</small></div>
          <i>＝</i>
          <div className="final-door"><span>安全信道</span><strong>机密 · 真实 · 完整</strong><small>量仔的完整装备组合</small></div>
        </div>
      </section>

      <section className="arsenal-sources" aria-label="资料说明">
        <p>标准状态与参数依据 NIST FIPS 203、FIPS 204、FIPS 205 及 NIST 2025 年 FIPS 206 进展资料整理。FN-DSA 尚未定稿，页面使用近似值帮助理解，不应作为实现参数。</p>
        <div><a href="https://csrc.nist.gov/pubs/fips/203/final">FIPS 203 ↗</a><a href="https://csrc.nist.gov/pubs/fips/204/final">FIPS 204 ↗</a><a href="https://csrc.nist.gov/pubs/fips/205/final">FIPS 205 ↗</a><a href="https://csrc.nist.gov/presentations/2025/fips-206-fn-dsa-falcon">FN-DSA 进展 ↗</a></div>
      </section>

      <footer className="arsenal-footer"><p>量仔 PQC 武器库 · 教学档案 004</p><a href="#top">返回顶部 ↑</a><Link href="/">回到量仔主页</Link></footer>
    </main>
  );
}
