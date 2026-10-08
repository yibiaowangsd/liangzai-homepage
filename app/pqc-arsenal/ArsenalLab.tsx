"use client";

import { useMemo, useRef, useState } from "react";
import {
  gsap,
  useGSAP,
  usePageMotion,
  useExperience,
  ScrollTrigger,
} from "../experience/Motion";
import "./cinematic-arsenal.css";

import { weapons, type WeaponId, type LegacyId, type FlowStep } from "./algorithm-data";

const legacySystems: Record<
  LegacyId,
  {
    name: string;
    task: string;
    publicFormula: string;
    hardProblem: string;
    classical: string;
    quantum: string;
    steps: FlowStep[];
  }
> = {
  rsa: {
    name: "RSA",
    task: "加密 / 签名",
    publicFormula: "n = p·q，c = mᵉ mod n，d ≡ e⁻¹ mod λ(n)",
    hardProblem:
      "从公开模数 n 恢复素因子 p、q；一旦分解成功，就能计算 λ(n) 与私钥指数 d。",
    classical: "已知通用经典算法仍是亚指数级；安全参数依赖分解大整数的成本。",
    quantum:
      "Shor 把分解归约为模指数函数的周期查找，并用量子傅里叶变换高效提取周期。",
    steps: [
      {
        title: "公开目标",
        formula: "n = p·q",
        detail: "攻击者只看到 n 与 e；秘密是 p、q 以及由它们导出的 d。",
      },
      {
        title: "选取底数",
        formula: "gcd(a,n)=1",
        detail:
          "随机选择与 n 互素的 a。某些选择不会给出因子，因此算法可能需要重复。",
      },
      {
        title: "量子找周期",
        formula: "aʳ ≡ 1 (mod n)",
        detail:
          "对 x ↦ aˣ mod n 做周期查找；QFT 把周期信息转成可测量的频率峰。",
      },
      {
        title: "经典后处理",
        formula: "gcd(aʳᐟ² ± 1,n)",
        detail: "当 r 为偶数且 aʳᐟ² ≠ −1 mod n 时，最大公因数给出非平凡因子。",
      },
      {
        title: "恢复私钥",
        formula: "d = e⁻¹ mod λ(n)",
        detail: "得到 p、q 后即可重建 λ(n) 和 d，解密历史密文或伪造签名。",
      },
    ],
  },
  ecc: {
    name: "ECC",
    task: "密钥交换 / 签名",
    publicFormula: "E: y²=x³+ax+b，Q=[k]P",
    hardProblem:
      "给定曲线点 P 与 Q，恢复标量 k；这就是椭圆曲线离散对数问题 ECDLP。",
    classical:
      "通用攻击约需 O(√r) 群运算，因此较短 ECC 密钥可达到与更长 RSA 密钥相近的经典安全强度。",
    quantum:
      "Shor 的阿贝尔隐藏子群算法也适用于离散对数；它不是“只会分解整数”。",
    steps: [
      {
        title: "公开目标",
        formula: "Q=[k]P",
        detail:
          "P、Q 和曲线参数公开；私钥是标量 k。ECDH 与 ECDSA 都依赖这类关系。",
      },
      {
        title: "二维叠加",
        formula: "F(a,b)=[a]P+[b]Q",
        detail: "量子寄存器同时评估大量 (a,b)，函数的碰撞结构编码了 k。",
      },
      {
        title: "隐藏子群",
        formula: "a + bk ≡ 0 (mod r)",
        detail: "产生同一点的输入对形成隐藏关系；r 是基点所在子群的阶。",
      },
      {
        title: "量子傅里叶",
        formula: "QFT over Zᵣ×Zᵣ",
        detail: "测量得到与隐藏关系正交的样本，而不是逐个尝试 k。",
      },
      {
        title: "解出标量",
        formula: "k ≡ −a·b⁻¹ (mod r)",
        detail:
          "经典线性代数恢复 k，进而冒充 ECDSA 身份或计算历史 ECDH 会话秘密。",
      },
    ],
  },
};

const heroWeapons = [
  {
    name: "ML-KEM",
    image: "/assets/pqc/ml-kem-studio-v2.webp",
    note: "晶格护盾",
  },
  {
    name: "ML-DSA",
    image: "/assets/pqc/ml-dsa-studio-v2.webp",
    note: "晶格印章",
  },
  {
    name: "SLH-DSA",
    image: "/assets/pqc/slh-dsa-studio-v2.webp",
    note: "哈希树杖",
  },
  {
    name: "FN-DSA",
    image: "/assets/pqc/fn-dsa-studio-v2.webp",
    note: "猎隼轻刃",
  },
];
const scoreNames = {
  bandwidth: "通信轻巧",
  speed: "执行速度",
  simplicity: "实现友好",
  diversity: "原理多样性",
};
const latticePoints = Array.from({ length: 25 }, (_, index) => ({
  x: index % 5,
  y: Math.floor(index / 5),
}));

export default function ArsenalLab() {
  const root = useRef<HTMLElement>(null);
  const { enabled } = useExperience();
  usePageMotion(root);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selected, setSelected] = useState<WeaponId>("ml-kem");
  const [levelIndex, setLevelIndex] = useState(1);
  const [demo, setDemo] = useState<"kem" | "sign">("kem");
  const [legacy, setLegacy] = useState<LegacyId>("rsa");
  const [attackStep, setAttackStep] = useState(0);
  const [flowStep, setFlowStep] = useState(0);
  const [noise, setNoise] = useState(2);
  const weapon = useMemo(
    () => weapons.find((item) => item.id === selected) ?? weapons[0],
    [selected],
  );
  const activeLevel =
    weapon.levels[Math.min(levelIndex, weapon.levels.length - 1)];
  const legacySystem = legacySystems[legacy];
  function chooseWeapon(id: WeaponId) {
    setSelected(id);
    setLevelIndex(id === "fn-dsa" ? 0 : 1);
    setFlowStep(0);
  }
  function chooseLegacy(id: LegacyId) {
    setLegacy(id);
    setAttackStep(0);
  }

  useGSAP(
    () => {
      if (!enabled) return;
      gsap.from(".weapon-identity, .weapon-explain, .weapon-metrics", {
        y: 14,
        autoAlpha: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: "power3.out",
      });
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [selected, enabled], revertOnUpdate: true },
  );
  useGSAP(
    () => {
      if (!enabled) return;
      gsap.from(".flow-detail, .bench-readout", {
        y: 7,
        autoAlpha: 0.2,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    {
      scope: root,
      dependencies: [legacy, attackStep, flowStep, levelIndex, enabled],
      revertOnUpdate: true,
    },
  );
  return (
    <main
      ref={root}
      id="main-content"
      className="arsenal-shell cinematic-arsenal"
    >
      <nav className="arsenal-index" aria-label="PQC 内容章节">
        <span>图鉴目录</span>
        <div>
          <a href="#break">01 失效</a>
          <a href="#math">02 数学</a>
          <a href="#weapons">03 算法</a>
          <a href="#loadout">04 选型</a>
        </div>
      </nav>

      <header className="arsenal-hero">
        <div className="arsenal-hero-copy">
          <p className="arsenal-eyebrow" data-intro>
            面向未来的密码学
          </p>
          <h1 data-title>
            密码<em>图鉴</em>
          </h1>
          <p className="arsenal-lead" data-intro>
            从 Shor 如何拆掉 RSA / ECC，
            <br />
            一路走到后量子算法的数学内核。
          </p>
          <a className="silver-button" data-intro data-magnetic href="#weapons">
            查看四种算法
            <i aria-hidden="true" />
          </a>
          <a className="arsenal-practice-link" data-intro href="/pqc-practice">
            已了解原理？进入密码实验室 <span aria-hidden="true"></span>
          </a>
        </div>
        <figure className="arsenal-intro-art" aria-hidden="true"><img src="/assets/pqc/ml-dsa-studio-v2.webp" width="1200" height="800" alt="" /></figure>
        <div className="hero-index" aria-label="学习路径">
          <span>01 RSA / ECC</span>
          <span>02 LWE / SIS</span>
          <span>03 KEM / DSA</span>
          <span>04 实现风险</span>
        </div>
      </header>

      <section className="algorithm-directory" aria-labelledby="directory-title">
        <div className="algorithm-directory-heading"><div><p className="arsenal-eyebrow">四种算法 / 从这里开始</p><h2 id="directory-title">先选问题，再看原理</h2></div><label>查找算法<input type="search" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="名称、用途或数学原理" /></label></div>
        <div className="algorithm-directory-grid">
          {weapons.filter((item) => `${item.name} ${item.role} ${item.principle} ${item.simple}`.toLowerCase().includes(catalogQuery.trim().toLowerCase())).map((item) => {
            const visual = heroWeapons.find((entry) => entry.name === item.name);
            return <article key={item.id}><img src={visual?.image} alt={visual ? `${item.name} · ${visual.note}` : item.name} width="768" height="768" loading="lazy" /><div><span>{item.role}</span><h3>{item.name}</h3><p>{item.simple}</p><small>{item.status} · {item.id === "fn-dsa" ? "原理参考，未接入本地运行" : "可在浏览器运行"}</small><a href={`/pqc/${item.id}`}>查看原理与参数</a>{item.id !== "fn-dsa" && <a href="/pqc-practice">进入实验室选择 {item.name}</a>}</div></article>;
          })}
        </div>
        {!weapons.some((item) => `${item.name} ${item.role} ${item.principle} ${item.simple}`.toLowerCase().includes(catalogQuery.trim().toLowerCase())) && <p role="status" className="algorithm-empty">没有匹配的算法。试试 ML-KEM、签名或哈希。</p>}
      </section>

      <section id="break" className="arsenal-section break-section">
        <header className="arsenal-section-head" data-reveal>
          <span>01 / 旧算法为何失效</span>

        </header>
        <div className="section-intro-grid" data-reveal>
          <div className="big-question">
            <p className="marker-note">真正被击中的是困难问题</p>
            <h2>
              RSA 与 ECC 的威胁模型变了<br /><em>量子算法，改变攻击成本</em>
            </h2>
          </div>
          <div className="quantum-note">
            <span className="shor-mark">classical hard ≠ quantum hard</span>
            <p>
              公钥密码把安全性压在一个“正向易算、逆向难算”的陷门问题上。Shor
              为整数分解和离散对数给出输入长度多项式时间的量子算法。
            </p>
            <p>
              威胁模型是足够大、容错的密码学相关量子计算机；并不是今天的设备已经能分解
              RSA-2048。
            </p>
          </div>
        </div>
        <div
          className="legacy-lab"
          data-reveal
          aria-label="RSA 与 ECC 量子攻击交互拆解"
        >
          <div
            className="legacy-tabs"
            role="tablist"
            aria-label="选择旧公钥系统"
          >
            {(Object.keys(legacySystems) as LegacyId[]).map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={legacy === id}
                className={legacy === id ? "active" : ""}
                onClick={() => chooseLegacy(id)}
              >
                <strong>{legacySystems[id].name}</strong>
                <span>{legacySystems[id].task}</span>
              </button>
            ))}
          </div>
          <article className="legacy-theory">
            <div>
              <span>公开关系</span>
              <code>{legacySystem.publicFormula}</code>
            </div>
            <div>
              <span>经典安全锚点</span>
              <p>{legacySystem.hardProblem}</p>
              <small>{legacySystem.classical}</small>
            </div>
            <div>
              <span>量子突破口</span>
              <p>{legacySystem.quantum}</p>
            </div>
          </article>
          <div
            className="attack-flow"
            role="group"
            aria-label={`${legacySystem.name} 攻击步骤`}
          >
            {legacySystem.steps.map((step, index) => (
              <button
                key={step.title}
                className={attackStep === index ? "active" : ""}
                aria-pressed={attackStep === index}
                onClick={() => setAttackStep(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
                <code>{step.formula}</code>
              </button>
            ))}
          </div>
          <p className="flow-detail" aria-live="polite">
            <b>{legacySystem.steps[attackStep].title}：</b>
            {legacySystem.steps[attackStep].detail}
          </p>
        </div>
        <aside className="grover-note">
          <span>别把结论外推过头</span>
          <p>
            <b>Shor 主要击穿公钥密码的代数结构。</b> 对 AES
            或哈希的通用量子加速通常讨论
            Grover：穷举复杂度近似平方根下降，因此加长对称密钥/摘要仍能补偿；“量子计算会让所有密码归零”是错误概括。
          </p>
        </aside>
        <div className="job-switch" role="group" aria-label="密码功能演示">
          <button
            className={demo === "kem" ? "active" : ""}
            onClick={() => setDemo("kem")}
          >
            密钥协商：得到同一把钥匙
          </button>
          <button
            className={demo === "sign" ? "active" : ""}
            onClick={() => setDemo("sign")}
          >
            数字签名：确认是谁发的
          </button>
        </div>
        <div className={`crypto-demo ${demo}`} aria-live="polite">
          <div className="demo-person">
            <span>甲</span>
            <small>
              {demo === "kem" ? "生成封装 / 解封装密钥" : "持有签名私钥"}
            </small>
          </div>
          <div className="demo-channel">
            <div className="packet">
              {demo === "kem" ? "密钥胶囊 c" : "消息 M + 签名 σ"}
            </div>
            <div className="channel-line">
              <i />
            </div>
            <p>
              {demo === "kem"
                ? "公开网络上传的是密文胶囊，不是最终密钥"
                : "签名公开传输，验证不需要私钥"}
            </p>
          </div>
          <div className="demo-person">
            <span>乙</span>
            <small>{demo === "kem" ? "解封得到共享秘密" : "用公钥验证"}</small>
          </div>
          <div className="demo-result">
            {demo === "kem"
              ? "K_sender = K_receiver"
              : "Verify(pk,M,σ) ∈ {accept,reject}"}
          </div>
        </div>
      </section>

      <section id="math" className="arsenal-section math-section">
        <header className="arsenal-section-head" data-reveal>
          <span>02 / 数学底座</span>

        </header>
        <div className="math-heading" data-reveal>
          <p className="marker-note">PQC 不是一种算法</p>
          <h2>
            换掉陷门
            <br />
            也换掉攻击者必须解决的
            <br />
            <em>数学问题</em>
          </h2>
        </div>
        <div className="lattice-lab" data-reveal>
          <div
            className="lattice-visual"
            role="img"
            aria-label={`二维格点与幅度 ${noise} 的误差示意。真实 Module-LWE 工作在多项式模格。`}
          >
            {latticePoints.map((point, index) => {
              const dx = (((point.y * 3 + point.x) % 3) - 1) * noise;
              const dy = (((point.x * 2 + point.y) % 3) - 1) * noise;
              return (
                <span
                  key={index}
                  className={index === 12 ? "target" : ""}
                  style={{ transform: `translate(${dx}px, ${dy}px)` }}
                />
              );
            })}
            <div className="lattice-vector">
              <i />
              <b>As</b>
              <em>+ e</em>
            </div>
          </div>
          <div className="lattice-control">
            <label htmlFor="noise-level">
              教学示意：误差幅度 <strong>{noise}</strong>
            </label>
            <input
              id="noise-level"
              type="range"
              min="0"
              max="5"
              value={noise}
              onChange={(event) => setNoise(Number(event.target.value))}
            />
            <p>
              没有误差时，线性方程可直接消元；小误差让每个样本都“差一点”，从大量模方程恢复短秘密
              s 变成
              LWE。误差太大又会让合法解码失败，因此参数必须夹在正确性与安全性之间。
            </p>
          </div>
          <div className="lattice-equation">
            <span>Module-LWE 核心样本</span>
            <code>A ← R_qᵏˣᵏ；s,e ← χᵏ；t = A·s+e mod q</code>
            <p>
              公开 (A,t)，区分它与均匀随机，或恢复短秘密 s。Module 结构在纯 LWE
              与 Ring-LWE 之间折中效率与结构。
            </p>
          </div>
        </div>
        <div className="assumption-grid" data-reveal>
          <article>
            <span>01 / MLWE</span>
            <h3>带误差线性关系</h3>
            <code>t=A·s+e</code>
            <p>ML-KEM 的机密性与 ML-DSA 的部分安全归约底座。</p>
          </article>
          <article>
            <span>02 / MSIS</span>
            <h3>找一个短核向量</h3>
            <code>A·z=0 mod q，‖z‖ small</code>
            <p>签名不可伪造性常落到“不能凭空找到新的短关系”。</p>
          </article>
          <article>
            <span>03 / HASH TREES</span>
            <h3>从叶子承诺到根</h3>
            <code>root=H(H(left) ∥ H(right))</code>
            <p>SLH-DSA 用认证路径把一次性签名绑定到唯一公钥根。</p>
          </article>
          <article>
            <span>04 / NTRU LATTICE</span>
            <h3>公开商与隐藏短基</h3>
            <code>h=g/f mod q</code>
            <p>FN-DSA 利用短 NTRU 基高效采样近目标格点。</p>
          </article>
        </div>
      </section>

      <section id="weapons" className="arsenal-section weapons-section">
        <header className="arsenal-section-head" data-reveal>
          <span>03 / 四种算法</span>

        </header>
        <div className="weapon-tabs" role="tablist" aria-label="选择 PQC 算法">
          {weapons.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected === item.id}
              className={selected === item.id ? "active" : ""}
              onClick={() => chooseWeapon(item.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.name}</strong>
              <small>{item.role}</small>
            </button>
          ))}
        </div>
        <article className={`weapon-console accent-${weapon.accent}`}>
          <div className="weapon-identity">
            <div className={`weapon-glyph ${weapon.shape}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>{weapon.code}</p>
            <h2>{weapon.name}</h2>
            <strong>{weapon.metaphor}</strong>
            <span>{weapon.status}</span>
          </div>
          <div className="weapon-explain">
            <p className="simple-line">{weapon.simple}</p>
            <dl>
              <div>
                <dt>安全假设</dt>
                <dd>{weapon.assumption}</dd>
              </div>
              <div>
                <dt>应用位置</dt>
                <dd>{weapon.scene}</dd>
              </div>
              <div>
                <dt>关键边界</dt>
                <dd>{weapon.caution}</dd>
              </div>
            </dl>
          </div>
          <div className="weapon-metrics">
            <p className="metrics-title">
              工程特性 <span>相对比较，不是 benchmark</span>
            </p>
            {Object.entries(weapon.scores).map(([key, value]) => (
              <div className="score-row" key={key}>
                <span>{scoreNames[key as keyof typeof scoreNames]}</span>
                <div>
                  {[1, 2, 3, 4, 5].map((unit) => (
                    <i key={unit} className={unit <= value ? "filled" : ""} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="weapon-deep-dive">
            <header>
              <span>算法流程 / 点击逐步拆解</span>
              <strong>{weapon.name} INTERNAL FLOW</strong>
            </header>
            <div className="equation-strip">
              {weapon.equations.map((equation) => (
                <code key={equation}>{equation}</code>
              ))}
            </div>
            <div
              className="algorithm-flow"
              role="group"
              aria-label={`${weapon.name} 算法流程`}
            >
              {weapon.flow.map((step, index) => (
                <button
                  key={step.title}
                  className={flowStep === index ? "active" : ""}
                  aria-pressed={flowStep === index}
                  onClick={() => setFlowStep(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <code>{step.formula}</code>
                </button>
              ))}
            </div>
            <p className="flow-detail" aria-live="polite">
              <b>{weapon.flow[flowStep].title}：</b>
              {weapon.flow[flowStep].detail}
            </p>
            <div className="implementation-notes">
              <span>实现者检查单</span>
              <ul>
                {weapon.implementation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="parameter-bench">
            <div className="bench-control">
              <label htmlFor="security-level">参数规格</label>
              <input
                id="security-level"
                type="range"
                min="0"
                max={weapon.levels.length - 1}
                step="1"
                value={Math.min(levelIndex, weapon.levels.length - 1)}
                onChange={(event) => setLevelIndex(Number(event.target.value))}
              />
              <div>
                {weapon.levels.map((level) => (
                  <span key={level.name}>
                    {level.name.replace(/^(ML-|SLH-|FN-)/, "")}
                  </span>
                ))}
              </div>
            </div>
            <div className="bench-readout">
              <p>
                <span>型号</span>
                <strong>{activeLevel.name}</strong>
              </p>
              <p>
                <span>安全强度</span>
                <strong>{activeLevel.security}</strong>
              </p>
              <p>
                <span>公钥</span>
                <strong>{activeLevel.publicKey}</strong>
              </p>
              <p>
                <span>{activeLevel.payloadLabel}</span>
                <strong>{activeLevel.payload}</strong>
              </p>
            </div>
          </div>
        </article>
      </section>

      <section id="loadout" className="arsenal-section loadout-section">
        <header className="arsenal-section-head" data-reveal>
          <span>04 / 工程选型</span>

        </header>
        <div className="loadout-grid" data-reveal>
          <div className="loadout-title">
            <p className="marker-note">没有“全属性最强”</p>
            <h2>
              先画协议边界
              <br />
              再选算法
            </h2>
            <p>
              先区分密钥建立与签名，再把公钥、密文/签名、验证成本、实现攻击面和安全基础多样性放进同一张预算表。算法标准化不等于协议自动安全。
            </p>
          </div>
          <div className="mission-list">
            <article>
              <span>01</span>
              <h3>建立安全连接</h3>
              <p>
                ML-KEM 产生共享秘密；仍需
                KDF、AEAD、身份认证与降级保护。迁移期通常需要分析混合握手的组合安全。
              </p>
              <b>首选：ML-KEM</b>
            </article>
            <article>
              <span>02</span>
              <h3>通用身份认证</h3>
              <p>
                ML-DSA
                的标准成熟、性能均衡；重点审计拒绝采样、随机性和协议上下文绑定。
              </p>
              <b>首选：ML-DSA</b>
            </article>
            <article>
              <span>03</span>
              <h3>强调安全基础多样性</h3>
              <p>
                SLH-DSA
                主要依赖哈希，但签名大、签名成本高；适合能预留带宽与存储的保守场景。
              </p>
              <b>选择：SLH-DSA</b>
            </article>
            <article>
              <span>04</span>
              <h3>证书与带宽极敏感</h3>
              <p>
                FN-DSA 紧凑且验证快，但实现复杂度最高；在 FIPS 206
                定稿前持续跟踪参数、编码与验证要求。
              </p>
              <b>关注：FN-DSA</b>
            </article>
          </div>
        </div>
        <div className="final-map" data-reveal>
          <div>
            <span>握手</span>
            <strong>ML-KEM</strong>
            <small>生成 256-bit 共享秘密</small>
          </div>
          <i>＋</i>
          <div>
            <span>身份</span>
            <strong>ML-DSA / SLH-DSA / FN-DSA</strong>
            <small>证明端点与消息来源</small>
          </div>
          <i>＋</i>
          <div className="final-door">
            <span>协议工程</span>
            <strong>KDF · AEAD · 防降级</strong>
            <small>完整安全信道，而非算法拼盘</small>
          </div>
        </div>
      </section>

      <section className="arsenal-sources" aria-label="资料说明">
        <p>
          技术内容依据 NIST FIPS 203/204/205、NIST 2025 年 FIPS 206 状态资料与
          Shor 原始论文整理。FN-DSA
          截至 2026-10-08，NIST 仍将 Falcon 列为正在标准化的算法；此页为原理参考，近似体积不应作为实现参数。页面公式省略编码、域分离与常数细节，生产实现必须以最终标准逐项校验。
        </p>
        <div>
          <a href="https://csrc.nist.gov/pubs/fips/203/final">FIPS 203</a>
          <a href="https://csrc.nist.gov/pubs/fips/204/final">FIPS 204</a>
          <a href="https://csrc.nist.gov/pubs/fips/205/final">FIPS 205</a>
          <a href="https://csrc.nist.gov/csrc/media/presentations/2025/fips-206-fn-dsa-%28falcon%29/images-media/fips_206-perlner_2.1.pdf">
            FIPS 206 状态
          </a>
          <a href="https://arxiv.org/abs/quant-ph/9508027">Shor 原始论文</a>
        </div>
      </section>
    </main>
  );
}
