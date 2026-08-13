"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type WeaponId = "ml-kem" | "ml-dsa" | "slh-dsa" | "fn-dsa";
type LegacyId = "rsa" | "ecc";
type Level = { name: string; security: string; publicKey: string; payloadLabel: string; payload: string };
type FlowStep = { title: string; formula: string; detail: string };
type Weapon = {
  id: WeaponId; code: string; name: string; role: string; status: string; metaphor: string;
  simple: string; principle: string; scene: string; caution: string; accent: string; shape: string;
  assumption: string; equations: string[]; flow: FlowStep[]; implementation: string[];
  scores: { bandwidth: number; speed: number; simplicity: number; diversity: number }; levels: Level[];
};

const legacySystems: Record<LegacyId, { name: string; task: string; publicFormula: string; hardProblem: string; classical: string; quantum: string; steps: FlowStep[] }> = {
  rsa: {
    name: "RSA", task: "加密 / 签名", publicFormula: "n = p·q，c = mᵉ mod n，d ≡ e⁻¹ mod λ(n)",
    hardProblem: "从公开模数 n 恢复素因子 p、q；一旦分解成功，就能计算 λ(n) 与私钥指数 d。",
    classical: "已知通用经典算法仍是亚指数级；安全参数依赖分解大整数的成本。",
    quantum: "Shor 把分解归约为模指数函数的周期查找，并用量子傅里叶变换高效提取周期。",
    steps: [
      { title: "公开目标", formula: "n = p·q", detail: "攻击者只看到 n 与 e；秘密是 p、q 以及由它们导出的 d。" },
      { title: "选取底数", formula: "gcd(a,n)=1", detail: "随机选择与 n 互素的 a。某些选择不会给出因子，因此算法可能需要重复。" },
      { title: "量子找周期", formula: "aʳ ≡ 1 (mod n)", detail: "对 x ↦ aˣ mod n 做周期查找；QFT 把周期信息转成可测量的频率峰。" },
      { title: "经典后处理", formula: "gcd(aʳᐟ² ± 1,n)", detail: "当 r 为偶数且 aʳᐟ² ≠ −1 mod n 时，最大公因数给出非平凡因子。" },
      { title: "恢复私钥", formula: "d = e⁻¹ mod λ(n)", detail: "得到 p、q 后即可重建 λ(n) 和 d，解密历史密文或伪造签名。" },
    ],
  },
  ecc: {
    name: "ECC", task: "密钥交换 / 签名", publicFormula: "E: y²=x³+ax+b，Q=[k]P",
    hardProblem: "给定曲线点 P 与 Q，恢复标量 k；这就是椭圆曲线离散对数问题 ECDLP。",
    classical: "通用攻击约需 O(√r) 群运算，因此较短 ECC 密钥可达到与更长 RSA 密钥相近的经典安全强度。",
    quantum: "Shor 的阿贝尔隐藏子群算法也适用于离散对数；它不是“只会分解整数”。",
    steps: [
      { title: "公开目标", formula: "Q=[k]P", detail: "P、Q 和曲线参数公开；私钥是标量 k。ECDH 与 ECDSA 都依赖这类关系。" },
      { title: "二维叠加", formula: "F(a,b)=[a]P+[b]Q", detail: "量子寄存器同时评估大量 (a,b)，函数的碰撞结构编码了 k。" },
      { title: "隐藏子群", formula: "a + bk ≡ 0 (mod r)", detail: "产生同一点的输入对形成隐藏关系；r 是基点所在子群的阶。" },
      { title: "量子傅里叶", formula: "QFT over Zᵣ×Zᵣ", detail: "测量得到与隐藏关系正交的样本，而不是逐个尝试 k。" },
      { title: "解出标量", formula: "k ≡ −a·b⁻¹ (mod r)", detail: "经典线性代数恢复 k，进而冒充 ECDSA 身份或计算历史 ECDH 会话秘密。" },
    ],
  },
};

const weapons: Weapon[] = [
  {
    id: "ml-kem", code: "FIPS 203", name: "ML-KEM", role: "共享密钥建立", status: "正式标准 · 2024", metaphor: "晶格护盾",
    simple: "双方不用事先见面，也能在公开网络上得到同一把 256-bit 共享秘密。",
    principle: "把短秘密埋进带小误差的模格线性方程。合法方利用陷门式结构恢复消息；攻击者面对 Module-LWE。",
    scene: "TLS / VPN / SSH 等安全连接的握手阶段", caution: "KEM 不直接加密长消息；K-PKE 只是内部组件，不能被单独当作公钥加密方案使用。",
    accent: "cyan", shape: "shield", assumption: "Module-LWE；密文安全通过 Fujisaki–Okamoto 风格变换提升到自适应选择密文安全。",
    equations: ["R_q = Z_q[X]/(X²⁵⁶+1)，q=3329", "t = A·s + e mod q", "recover s from (A,t) ≈ Module-LWE"],
    flow: [
      { title: "KeyGen", formula: "t=A·s+e", detail: "由种子展开 A，采样短向量 s、e；封装密钥含 (t,ρ)，解封装密钥保留 s 及校验材料。" },
      { title: "Encaps", formula: "(K,r)=G(m ∥ H(ek))", detail: "采样 32-byte m，用派生随机量 r 生成密文 c；输出 c 与共享秘密 K。" },
      { title: "Decrypt", formula: "m′=K-PKE.Decrypt(dk,c)", detail: "利用短秘密消去主要项并从带噪多项式系数中恢复 m′。" },
      { title: "Re-encrypt", formula: "c′=Encrypt(ek,m′,r′)", detail: "重新派生 r′ 并复算 c′；比较必须避免泄露密钥相关分支信息。" },
      { title: "Implicit reject", formula: "c≠c′ ⇒ K′=J(z ∥ c)", detail: "畸形密文仍返回伪随机秘密，不向攻击者暴露内部解密失败这一 oracle。" },
    ],
    implementation: ["每次解封装都检查密文类型与长度；不要暴露内部 reject 标志。", "NTT、压缩/解压和比较路径必须审计常时性。", "混合密钥交换需证明组合方式，而不是简单拼接后假设仍具 IND-CCA2。"],
    scores: { bandwidth: 4, speed: 5, simplicity: 4, diversity: 3 },
    levels: [
      { name: "ML-KEM-512", security: "NIST 1 级", publicKey: "800 B", payloadLabel: "密文", payload: "768 B" },
      { name: "ML-KEM-768", security: "NIST 3 级", publicKey: "1,184 B", payloadLabel: "密文", payload: "1,088 B" },
      { name: "ML-KEM-1024", security: "NIST 5 级", publicKey: "1,568 B", payloadLabel: "密文", payload: "1,568 B" },
    ],
  },
  {
    id: "ml-dsa", code: "FIPS 204", name: "ML-DSA", role: "数字签名", status: "正式标准 · 2024", metaphor: "晶格印章",
    simple: "把“我知道一个短秘密”变成公开可验证、却不泄露秘密本身的签名证明。",
    principle: "Fiat–Shamir with Aborts：先承诺，再把消息哈希成挑战，最后给出短响应；不合格响应必须丢弃重来。",
    scene: "证书、协议握手、软件更新与长期身份认证", caution: "拒绝采样不是性能小细节：输出失败样本会泄露私钥分布。签名也不提供消息机密性。",
    accent: "violet", shape: "stamp", assumption: "Module-LWE 与 Module-SIS；不可伪造性依赖短向量关系和随机预言机式哈希挑战。",
    equations: ["t = A·s₁+s₂", "w₁ = HighBits(A·y)", "c = H(μ ∥ w₁)，z=y+c·s₁"],
    flow: [
      { title: "KeyGen", formula: "t=A·s₁+s₂", detail: "A 由种子展开；s₁、s₂ 为短向量，公钥发布压缩后的 t₁ 与 A 的种子。" },
      { title: "Commit", formula: "w=A·y → w₁", detail: "从受限分布采样掩码 y，只公开 w 的高位承诺 w₁，隐藏低位噪声。" },
      { title: "Challenge", formula: "c=H(μ ∥ w₁)", detail: "消息代表 μ 与承诺共同决定稀疏挑战多项式 c，避免签名者事后挑选挑战。" },
      { title: "Respond / abort", formula: "z=y+c·s₁", detail: "若 z、低位修正或 hint 超界则整轮丢弃；这是阻断私钥统计泄露的核心。" },
      { title: "Verify", formula: "c ?= H(μ ∥ UseHint(h,Az−c·t₁·2ᵈ))", detail: "验证者重建承诺高位并重算挑战，同时检查 z 范数和 hint 权重。" },
    ],
    implementation: ["固定时间实现拒绝采样、稀疏多项式乘法与 hint 处理。", "正确区分 deterministic 与 hedged 签名模式，并保护每条随机性路径。", "上下文字符串与 pre-hash 模式属于协议绑定，不能由应用静默混用。"],
    scores: { bandwidth: 3, speed: 4, simplicity: 4, diversity: 3 },
    levels: [
      { name: "ML-DSA-44", security: "NIST 2 级", publicKey: "1,312 B", payloadLabel: "签名", payload: "2,420 B" },
      { name: "ML-DSA-65", security: "NIST 3 级", publicKey: "1,952 B", payloadLabel: "签名", payload: "3,309 B" },
      { name: "ML-DSA-87", security: "NIST 5 级", publicKey: "2,592 B", payloadLabel: "签名", payload: "4,627 B" },
    ],
  },
  {
    id: "slh-dsa", code: "FIPS 205", name: "SLH-DSA", role: "哈希签名", status: "正式标准 · 2024", metaphor: "哈希树杖",
    simple: "用 FORS 证明消息摘要，再让一串 WOTS+ 与 Merkle 认证路径把证明一路接到公钥根。",
    principle: "安全核心主要落在哈希函数的抗原像、抗第二原像和相关多目标性质，而不是格困难问题。",
    scene: "看重算法多样性、长期保守性，且能接受较大签名的场景", caution: "stateless 指调用者无需维护叶子计数器，不代表签名短或计算便宜；私钥种子仍必须严密保护。",
    accent: "gold", shape: "tree", assumption: "以 SHA-2 或 SHAKE 实例化的哈希安全性；FORS、WOTS+、XMSS 和 hypertree 分层组合。",
    equations: ["digest = H_msg(R, PK.seed, PK.root, M)", "XMSS_PK = MerkleRoot(WOTS+ leaves)", "PK.root = top hypertree root"],
    flow: [
      { title: "Randomize", formula: "R=PRF_msg(SK.prf,opt_rand,M)", detail: "为消息生成随机化值 R；随后 H_msg 同时导出 FORS 消息摘要、树索引和叶索引。" },
      { title: "FORS", formula: "SIG_FORS → FORS_PK", detail: "摘要选择多棵小树中的叶子；签名包含秘密叶与认证路径，压缩成一个 FORS 公钥。" },
      { title: "WOTS+", formula: "chainᵃ(SK) → chainʷ⁻¹(PK)", detail: "Winternitz 链把 n-bit 值编码为若干哈希链位置；每个 XMSS 层使用一把 WOTS+ 密钥。" },
      { title: "Hypertree", formula: "d layers，h=d·h′", detail: "底层 XMSS 签 FORS 公钥；上一层依次签下层根，直到顶层根。" },
      { title: "Verify", formula: "root′ ?= PK.root", detail: "从 FORS 与每层 WOTS+/认证路径逐层重建根；最终只需与 32/48/64-byte 公钥中的根比较。" },
    ],
    implementation: ["验证所有地址字段与参数集绑定；域分离错误会破坏树组件隔离。", "签名体积和验证峰值内存必须进入协议与证书预算。", "2026 年的有限签名参数仍是额外草案，不应与 FIPS 205 通用参数混称。"],
    scores: { bandwidth: 1, speed: 2, simplicity: 3, diversity: 5 },
    levels: [
      { name: "SLH-DSA-128s", security: "NIST 1 级", publicKey: "32 B", payloadLabel: "签名", payload: "7,856 B" },
      { name: "SLH-DSA-192s", security: "NIST 3 级", publicKey: "48 B", payloadLabel: "签名", payload: "16,224 B" },
      { name: "SLH-DSA-256s", security: "NIST 5 级", publicKey: "64 B", payloadLabel: "签名", payload: "29,792 B" },
    ],
  },
  {
    id: "fn-dsa", code: "FIPS 206 · 制定中", name: "FN-DSA", role: "紧凑数字签名", status: "基于 Falcon · 尚未定稿", metaphor: "猎隼轻刃",
    simple: "把消息哈希成格空间目标，再用 NTRU 私有短基寻找离目标很近的格点。",
    principle: "Hash-Then-Sign + trapdoor Gaussian sampling：公钥给出 NTRU 商 h，私钥短基支持近似离散高斯采样。",
    scene: "证书、固件签名及对通信体积高度敏感的系统", caution: "FIPS 206 仍在制定；FFT、LDL 树和高斯采样的数值稳定性与侧信道防护都比参数表更难。",
    accent: "silver", shape: "blade", assumption: "NTRU 格上的短整数解与 SIS 类问题；签名分布必须与私钥基尽量独立。",
    equations: ["fG−gF=q，h=g/f mod q", "c=HashToPoint(r ∥ M)", "s₁+s₂·h=c mod q，‖(s₁,s₂)‖≤β"],
    flow: [
      { title: "NTRU key", formula: "fG−gF=q", detail: "短多项式 f、g、F、G 构成私有短基；公钥只暴露 h=g/f mod q。" },
      { title: "Hash to point", formula: "c=H(r ∥ M) ∈ R_q", detail: "随机 salt 与消息映射到环上目标 c，避免可操纵的结构化目标。" },
      { title: "FFT sampling", formula: "SampleD(t,σ)", detail: "借助 FFT 与 LDL tree，在 NTRU 格陪集内抽取接近目标的短向量。" },
      { title: "Compress", formula: "sig=(r, Compress(s₂))", detail: "只编码 salt 与短向量的压缩表示；这带来非常紧凑的签名。" },
      { title: "Verify", formula: "s₁=c−s₂·h；‖s‖²≤β²", detail: "解码 s₂，重建 s₁ 并检查范数；任何非规范编码都必须拒绝。" },
    ],
    implementation: ["浮点/定点近似误差必须有证明边界，不能只靠测试向量。", "采样时间、拒绝路径与缓存访问都可能泄露私有 NTRU 基。", "在 FIPS 206 定稿前，页面中的 Falcon 体积仅用于认识量级。"],
    scores: { bandwidth: 5, speed: 4, simplicity: 1, diversity: 3 },
    levels: [
      { name: "FN-DSA-512", security: "目标 NIST 1 级", publicKey: "约 0.9 KB", payloadLabel: "签名", payload: "约 0.7 KB" },
      { name: "FN-DSA-1024", security: "目标 NIST 5 级", publicKey: "约 1.8 KB", payloadLabel: "签名", payload: "约 1.3 KB" },
    ],
  },
];

const heroWeapons = [
  { name: "ML-KEM", image: "/assets/pqc/ml-kem-zine-030d4365.webp", note: "晶格护盾" },
  { name: "ML-DSA", image: "/assets/pqc/ml-dsa-zine-be7db444.webp", note: "晶格印章" },
  { name: "SLH-DSA", image: "/assets/pqc/slh-dsa-zine-eb6100ca.webp", note: "哈希树杖" },
  { name: "FN-DSA", image: "/assets/pqc/fn-dsa-zine-97a2ab35.webp", note: "猎隼轻刃" },
];
const scoreNames = { bandwidth: "通信轻巧", speed: "执行速度", simplicity: "实现友好", diversity: "原理多样性" };
const latticePoints = Array.from({ length: 25 }, (_, index) => ({ x: index % 5, y: Math.floor(index / 5) }));

export default function ArsenalLab() {
  const [selected, setSelected] = useState<WeaponId>("ml-kem");
  const [levelIndex, setLevelIndex] = useState(1);
  const [demo, setDemo] = useState<"kem" | "sign">("kem");
  const [legacy, setLegacy] = useState<LegacyId>("rsa");
  const [attackStep, setAttackStep] = useState(0);
  const [flowStep, setFlowStep] = useState(0);
  const [noise, setNoise] = useState(2);
  const weapon = useMemo(() => weapons.find((item) => item.id === selected) ?? weapons[0], [selected]);
  const activeLevel = weapon.levels[Math.min(levelIndex, weapon.levels.length - 1)];
  const legacySystem = legacySystems[legacy];
  function chooseWeapon(id: WeaponId) { setSelected(id); setLevelIndex(id === "fn-dsa" ? 0 : 1); setFlowStep(0); }
  function chooseLegacy(id: LegacyId) { setLegacy(id); setAttackStep(0); }

  return (
    <main id="top" className="arsenal-shell">
      <nav className="arsenal-nav" aria-label="PQC 武器库导航">
        <Link className="arsenal-brand" href="/">量仔档案馆 <span>/ LIANGZAI ARCHIVE</span></Link>
        <div><a href="#break">旧武器失效</a><a href="#math">数学底座</a><a href="#weapons">四件武器</a><a href="#loadout">工程选型</a></div>
        <Link className="back-home" href="/">返回主页 ↗</Link>
      </nav>
      <nav className="arsenal-mobile-index" aria-label="PQC 内容章节"><a href="#break">01 失效</a><a href="#math">02 数学</a><a href="#weapons">03 算法</a><a href="#loadout">04 选型</a></nav>

      <header className="arsenal-hero">
        <div className="arsenal-hero-copy"><p className="arsenal-eyebrow"><span>Q-∞ / ARMORY 004</span> 战后装备开放日</p><h1>PQC<br /><em>武器库</em></h1><p className="arsenal-lead">从 Shor 如何拆掉 RSA / ECC，<br />一路走到后量子武器的数学内核。</p><a className="arsenal-cta" href="#break">开始拆解旧武器 <span>↓</span></a></div>
        <figure className="arsenal-hero-visual">
          <div className="armory-portrait"><img src="/assets/characters-v2/arsenal-liangzai-cutout.webp" alt="最新版量仔全身装备展示" /><p><span>KEEPER Q-∞</span> 量仔 / 武器管理员</p></div>
          <div className="armory-algorithms" aria-label="四种 PQC 算法武器照片">{heroWeapons.map((item, index) => <article className="algorithm-photo" key={item.name}><img src={item.image} alt={`${item.name} 的${item.note}纸感插图`} /><div><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.note}</small></div></article>)}</div>
          <figcaption>ARMORY 004 / 一名守护者，四种算法装备</figcaption>
        </figure>
        <div className="hero-index" aria-label="学习路径"><span>01 RSA / ECC</span><span>02 LWE / SIS</span><span>03 KEM / DSA</span><span>04 实现风险</span></div>
      </header>

      <section id="break" className="arsenal-section break-section">
        <header className="arsenal-section-head"><span>01 / 旧武器为何失效</span><span>SHOR ATTACK SURFACE</span></header>
        <div className="section-intro-grid"><div className="big-question"><p className="marker-note">真正被击中的是困难问题</p><h2>RSA 与 ECC 没有突然变弱。<br />量子计算改变了<br /><em>攻击算法的复杂度。</em></h2></div><div className="quantum-note"><span className="shor-mark">classical hard ≠ quantum hard</span><p>公钥密码把安全性压在一个“正向易算、逆向难算”的陷门问题上。Shor 为整数分解和离散对数给出输入长度多项式时间的量子算法。</p><p>威胁模型是足够大、容错的密码学相关量子计算机；并不是今天的设备已经能分解 RSA-2048。</p></div></div>
        <div className="legacy-lab" aria-label="RSA 与 ECC 量子攻击交互拆解">
          <div className="legacy-tabs" role="tablist" aria-label="选择旧公钥系统">{(Object.keys(legacySystems) as LegacyId[]).map((id) => <button key={id} role="tab" aria-selected={legacy === id} className={legacy === id ? "active" : ""} onClick={() => chooseLegacy(id)}><strong>{legacySystems[id].name}</strong><span>{legacySystems[id].task}</span></button>)}</div>
          <article className="legacy-theory"><div><span>公开关系</span><code>{legacySystem.publicFormula}</code></div><div><span>经典安全锚点</span><p>{legacySystem.hardProblem}</p><small>{legacySystem.classical}</small></div><div><span>量子突破口</span><p>{legacySystem.quantum}</p></div></article>
          <div className="attack-flow" role="group" aria-label={`${legacySystem.name} 攻击步骤`}>{legacySystem.steps.map((step, index) => <button key={step.title} className={attackStep === index ? "active" : ""} aria-pressed={attackStep === index} onClick={() => setAttackStep(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong><code>{step.formula}</code></button>)}</div>
          <p className="flow-detail" aria-live="polite"><b>{legacySystem.steps[attackStep].title}：</b>{legacySystem.steps[attackStep].detail}</p>
        </div>
        <aside className="grover-note"><span>别把结论外推过头</span><p><b>Shor 主要击穿公钥密码的代数结构。</b> 对 AES 或哈希的通用量子加速通常讨论 Grover：穷举复杂度近似平方根下降，因此加长对称密钥/摘要仍能补偿；“量子计算会让所有密码归零”是错误概括。</p></aside>
        <div className="job-switch" role="group" aria-label="密码任务演示"><button className={demo === "kem" ? "active" : ""} onClick={() => setDemo("kem")}>任务 A：得到同一把钥匙</button><button className={demo === "sign" ? "active" : ""} onClick={() => setDemo("sign")}>任务 B：确认是谁发的</button></div>
        <div className={`crypto-demo ${demo}`} aria-live="polite"><div className="demo-person"><span>甲</span><small>{demo === "kem" ? "生成封装 / 解封装密钥" : "持有签名私钥"}</small></div><div className="demo-channel"><div className="packet">{demo === "kem" ? "密钥胶囊 c" : "消息 M + 签名 σ"}</div><div className="channel-line"><i /></div><p>{demo === "kem" ? "公开网络上传的是密文胶囊，不是最终密钥" : "签名公开传输，验证不需要私钥"}</p></div><div className="demo-person"><span>乙</span><small>{demo === "kem" ? "解封得到共享秘密" : "用公钥验证"}</small></div><div className="demo-result">{demo === "kem" ? "K_sender = K_receiver" : "Verify(pk,M,σ) ∈ {accept,reject}"}</div></div>
      </section>

      <section id="math" className="arsenal-section math-section">
        <header className="arsenal-section-head"><span>02 / 数学底座</span><span>FROM EQUATIONS TO ASSUMPTIONS</span></header>
        <div className="math-heading"><p className="marker-note">PQC 不是一种算法</p><h2>换掉陷门，<br />也换掉攻击者必须解决的<br /><em>数学问题。</em></h2></div>
        <div className="lattice-lab">
          <div className="lattice-visual" role="img" aria-label={`二维格点与幅度 ${noise} 的误差示意。真实 Module-LWE 工作在多项式模格。`}>{latticePoints.map((point, index) => { const dx = ((point.y * 3 + point.x) % 3 - 1) * noise; const dy = ((point.x * 2 + point.y) % 3 - 1) * noise; return <span key={index} className={index === 12 ? "target" : ""} style={{ transform: `translate(${dx}px, ${dy}px)` }} />; })}<div className="lattice-vector"><i /><b>As</b><em>+ e</em></div></div>
          <div className="lattice-control"><label htmlFor="noise-level">教学示意：误差幅度 <strong>{noise}</strong></label><input id="noise-level" type="range" min="0" max="5" value={noise} onChange={(event) => setNoise(Number(event.target.value))} /><p>没有误差时，线性方程可直接消元；小误差让每个样本都“差一点”，从大量模方程恢复短秘密 s 变成 LWE。误差太大又会让合法解码失败，因此参数必须夹在正确性与安全性之间。</p></div>
          <div className="lattice-equation"><span>Module-LWE 核心样本</span><code>A ← R_qᵏˣᵏ；s,e ← χᵏ；t = A·s+e mod q</code><p>公开 (A,t)，区分它与均匀随机，或恢复短秘密 s。Module 结构在纯 LWE 与 Ring-LWE 之间折中效率与结构。</p></div>
        </div>
        <div className="assumption-grid"><article><span>01 / MLWE</span><h3>带误差线性关系</h3><code>t=A·s+e</code><p>ML-KEM 的机密性与 ML-DSA 的部分安全归约底座。</p></article><article><span>02 / MSIS</span><h3>找一个短核向量</h3><code>A·z=0 mod q，‖z‖ small</code><p>签名不可伪造性常落到“不能凭空找到新的短关系”。</p></article><article><span>03 / HASH TREES</span><h3>从叶子承诺到根</h3><code>root=H(H(left) ∥ H(right))</code><p>SLH-DSA 用认证路径把一次性签名绑定到唯一公钥根。</p></article><article><span>04 / NTRU LATTICE</span><h3>公开商，隐藏短基</h3><code>h=g/f mod q</code><p>FN-DSA 利用短 NTRU 基高效采样近目标格点。</p></article></div>
      </section>

      <section id="weapons" className="arsenal-section weapons-section">
        <header className="arsenal-section-head"><span>03 / 四件武器</span><span>SELECT · DERIVE · VERIFY</span></header>
        <div className="weapon-tabs" role="tablist" aria-label="选择 PQC 算法">{weapons.map((item, index) => <button key={item.id} role="tab" aria-selected={selected === item.id} className={selected === item.id ? "active" : ""} onClick={() => chooseWeapon(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.role}</small></button>)}</div>
        <article className={`weapon-console accent-${weapon.accent}`}>
          <div className="weapon-identity"><div className={`weapon-glyph ${weapon.shape}`} aria-hidden="true"><i /><i /><i /><i /></div><p>{weapon.code}</p><h2>{weapon.name}</h2><strong>{weapon.metaphor}</strong><span>{weapon.status}</span></div>
          <div className="weapon-explain"><p className="simple-line">{weapon.simple}</p><dl><div><dt>安全假设</dt><dd>{weapon.assumption}</dd></div><div><dt>应用位置</dt><dd>{weapon.scene}</dd></div><div><dt>关键边界</dt><dd>{weapon.caution}</dd></div></dl></div>
          <div className="weapon-metrics"><p className="metrics-title">任务画像 <span>相对比较，不是 benchmark</span></p>{Object.entries(weapon.scores).map(([key, value]) => <div className="score-row" key={key}><span>{scoreNames[key as keyof typeof scoreNames]}</span><div>{[1,2,3,4,5].map((unit) => <i key={unit} className={unit <= value ? "filled" : ""} />)}</div></div>)}</div>
          <div className="weapon-deep-dive"><header><span>算法流程 / 点击逐步拆解</span><strong>{weapon.name} INTERNAL FLOW</strong></header><div className="equation-strip">{weapon.equations.map((equation) => <code key={equation}>{equation}</code>)}</div><div className="algorithm-flow" role="group" aria-label={`${weapon.name} 算法流程`}>{weapon.flow.map((step, index) => <button key={step.title} className={flowStep === index ? "active" : ""} aria-pressed={flowStep === index} onClick={() => setFlowStep(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong><code>{step.formula}</code></button>)}</div><p className="flow-detail" aria-live="polite"><b>{weapon.flow[flowStep].title}：</b>{weapon.flow[flowStep].detail}</p><div className="implementation-notes"><span>实现者检查单</span><ul>{weapon.implementation.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
          <div className="parameter-bench"><div className="bench-control"><label htmlFor="security-level">装备规格</label><input id="security-level" type="range" min="0" max={weapon.levels.length - 1} step="1" value={Math.min(levelIndex, weapon.levels.length - 1)} onChange={(event) => setLevelIndex(Number(event.target.value))} /><div>{weapon.levels.map((level) => <span key={level.name}>{level.name.replace(/^(ML-|SLH-|FN-)/, "")}</span>)}</div></div><div className="bench-readout"><p><span>型号</span><strong>{activeLevel.name}</strong></p><p><span>安全强度</span><strong>{activeLevel.security}</strong></p><p><span>公钥</span><strong>{activeLevel.publicKey}</strong></p><p><span>{activeLevel.payloadLabel}</span><strong>{activeLevel.payload}</strong></p></div></div>
        </article>
      </section>

      <section id="loadout" className="arsenal-section loadout-section">
        <header className="arsenal-section-head"><span>04 / 工程选型</span><span>MISSION LOADOUT</span></header>
        <div className="loadout-grid"><div className="loadout-title"><p className="marker-note">没有“全属性最强”</p><h2>先画协议边界，<br />再选算法。</h2><p>先区分密钥建立与签名，再把公钥、密文/签名、验证成本、实现攻击面和安全基础多样性放进同一张预算表。算法标准化不等于协议自动安全。</p></div><div className="mission-list"><article><span>01</span><h3>建立安全连接</h3><p>ML-KEM 产生共享秘密；仍需 KDF、AEAD、身份认证与降级保护。迁移期通常需要分析混合握手的组合安全。</p><b>首选：ML-KEM</b></article><article><span>02</span><h3>通用身份认证</h3><p>ML-DSA 的标准成熟、性能均衡；重点审计拒绝采样、随机性和协议上下文绑定。</p><b>首选：ML-DSA</b></article><article><span>03</span><h3>强调安全基础多样性</h3><p>SLH-DSA 主要依赖哈希，但签名大、签名成本高；适合能预留带宽与存储的保守场景。</p><b>选择：SLH-DSA</b></article><article><span>04</span><h3>证书与带宽极敏感</h3><p>FN-DSA 紧凑且验证快，但实现复杂度最高；在 FIPS 206 定稿前持续跟踪参数、编码与验证要求。</p><b>关注：FN-DSA</b></article></div></div>
        <div className="final-map"><div><span>握手</span><strong>ML-KEM</strong><small>生成 256-bit 共享秘密</small></div><i>＋</i><div><span>身份</span><strong>ML-DSA / SLH-DSA / FN-DSA</strong><small>证明端点与消息来源</small></div><i>＋</i><div className="final-door"><span>协议工程</span><strong>KDF · AEAD · 防降级</strong><small>完整安全信道，而非算法拼盘</small></div></div>
      </section>

      <section className="arsenal-sources" aria-label="资料说明"><p>技术内容依据 NIST FIPS 203/204/205、NIST 2025 年 FIPS 206 状态资料与 Shor 原始论文整理。FN-DSA 尚未定稿；近似体积不应作为实现参数。页面公式省略编码、域分离与常数细节，生产实现必须以最终标准逐项校验。</p><div><a href="https://csrc.nist.gov/pubs/fips/203/final">FIPS 203 ↗</a><a href="https://csrc.nist.gov/pubs/fips/204/final">FIPS 204 ↗</a><a href="https://csrc.nist.gov/pubs/fips/205/final">FIPS 205 ↗</a><a href="https://csrc.nist.gov/csrc/media/presentations/2025/fips-206-fn-dsa-%28falcon%29/images-media/fips_206-perlner_2.1.pdf">FIPS 206 状态 ↗</a><a href="https://arxiv.org/abs/quant-ph/9508027">Shor 原始论文 ↗</a></div></section>
      <footer className="arsenal-footer"><p>量仔 PQC 武器库 · 教学档案 004</p><a href="#top">返回顶部 ↑</a><Link href="/">回到量仔主页</Link></footer>
    </main>
  );
}
