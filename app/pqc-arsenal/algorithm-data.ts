export type WeaponId = "ml-kem" | "ml-dsa" | "slh-dsa" | "fn-dsa";
export type LegacyId = "rsa" | "ecc";
export type Level = {
  name: string;
  security: string;
  publicKey: string;
  payloadLabel: string;
  payload: string;
};
export type FlowStep = { title: string; formula: string; detail: string };
export type Weapon = {
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
  assumption: string;
  equations: string[];
  flow: FlowStep[];
  implementation: string[];
  scores: {
    bandwidth: number;
    speed: number;
    simplicity: number;
    diversity: number;
  };
  levels: Level[];
};

export const weapons: Weapon[] = [
  {
    id: "ml-kem",
    code: "FIPS 203",
    name: "ML-KEM",
    role: "共享密钥建立",
    status: "正式标准 · 2024",
    metaphor: "晶格护盾",
    simple: "双方不用事先见面，也能在公开网络上得到同一把 256-bit 共享秘密。",
    principle:
      "把短秘密埋进带小误差的模格线性方程。合法方利用短秘密消去主要项并恢复消息；攻击者面对 Module-LWE。",
    scene: "TLS / VPN / SSH 等安全连接的握手阶段",
    caution:
      "KEM 不直接加密长消息；K-PKE 只是内部组件，不能被单独当作公钥加密方案使用。",
    accent: "cyan",
    shape: "shield",
    assumption:
      "Module-LWE；密文安全通过 Fujisaki–Okamoto 风格变换提升到自适应选择密文安全。",
    equations: [
      "R_q = Z_q[X]/(X²⁵⁶+1)，q=3329",
      "t = A·s + e mod q",
      "recover s from (A,t) ≈ Module-LWE",
    ],
    flow: [
      {
        title: "KeyGen",
        formula: "t=A·s+e",
        detail:
          "由种子展开 A，采样短向量 s、e；封装密钥含 (t,ρ)，解封装密钥保留 s 及校验材料。",
      },
      {
        title: "Encaps",
        formula: "(K,r)=G(m ∥ H(ek))",
        detail:
          "采样 32-byte m，用派生随机量 r 生成密文 c；输出 c 与共享秘密 K。",
      },
      {
        title: "Decrypt",
        formula: "m′=K-PKE.Decrypt(dk,c)",
        detail: "利用短秘密消去主要项并从带噪多项式系数中恢复 m′。",
      },
      {
        title: "Re-encrypt",
        formula: "c′=Encrypt(ek,m′,r′)",
        detail: "重新派生 r′ 并复算 c′；比较必须避免泄露密钥相关分支信息。",
      },
      {
        title: "Implicit reject",
        formula: "c≠c′ ⇒ K′=J(z ∥ c)",
        detail:
          "畸形密文仍返回伪随机秘密，不向攻击者暴露内部解密失败这一 oracle。",
      },
    ],
    implementation: [
      "每次解封装都检查密文类型与长度；不要暴露内部 reject 标志。",
      "NTT、压缩/解压和比较路径必须审计常时性。",
      "混合密钥交换需证明组合方式，而不是简单拼接后假设仍具 IND-CCA2。",
    ],
    scores: { bandwidth: 4, speed: 5, simplicity: 4, diversity: 3 },
    levels: [
      {
        name: "ML-KEM-512",
        security: "NIST 1 级",
        publicKey: "800 B",
        payloadLabel: "密文",
        payload: "768 B",
      },
      {
        name: "ML-KEM-768",
        security: "NIST 3 级",
        publicKey: "1,184 B",
        payloadLabel: "密文",
        payload: "1,088 B",
      },
      {
        name: "ML-KEM-1024",
        security: "NIST 5 级",
        publicKey: "1,568 B",
        payloadLabel: "密文",
        payload: "1,568 B",
      },
    ],
  },
  {
    id: "ml-dsa",
    code: "FIPS 204",
    name: "ML-DSA",
    role: "数字签名",
    status: "正式标准 · 2024",
    metaphor: "晶格印章",
    simple: "把“我知道一个短秘密”变成公开可验证、却不泄露秘密本身的签名证明。",
    principle:
      "Fiat–Shamir with Aborts：先承诺，再把消息哈希成挑战，最后给出短响应；不合格响应必须丢弃重来。",
    scene: "证书、协议握手、软件更新与长期身份认证",
    caution:
      "拒绝采样不是性能小细节：输出失败样本会泄露私钥分布。签名也不提供消息机密性。",
    accent: "violet",
    shape: "stamp",
    assumption:
      "Module-LWE 与 Module-SIS；不可伪造性依赖短向量关系和随机预言机式哈希挑战。",
    equations: ["t = A·s₁+s₂", "w₁ = HighBits(A·y)", "c = H(μ ∥ w₁)，z=y+c·s₁"],
    flow: [
      {
        title: "KeyGen",
        formula: "t=A·s₁+s₂",
        detail:
          "A 由种子展开；s₁、s₂ 为短向量，公钥发布压缩后的 t₁ 与 A 的种子。",
      },
      {
        title: "Commit",
        formula: "w=A·y → w₁",
        detail: "从受限分布采样掩码 y，只公开 w 的高位承诺 w₁，隐藏低位噪声。",
      },
      {
        title: "Challenge",
        formula: "c=H(μ ∥ w₁)",
        detail:
          "消息代表 μ 与承诺共同决定稀疏挑战多项式 c，避免签名者事后挑选挑战。",
      },
      {
        title: "Respond / abort",
        formula: "z=y+c·s₁",
        detail:
          "若 z、低位修正或 hint 超界则整轮丢弃；这是阻断私钥统计泄露的核心。",
      },
      {
        title: "Verify",
        formula: "c ?= H(μ ∥ UseHint(h,Az−c·t₁·2ᵈ))",
        detail: "验证者重建承诺高位并重算挑战，同时检查 z 范数和 hint 权重。",
      },
    ],
    implementation: [
      "固定时间实现拒绝采样、稀疏多项式乘法与 hint 处理。",
      "正确区分 deterministic 与 hedged 签名模式，并保护每条随机性路径。",
      "上下文字符串与 pre-hash 模式属于协议绑定，不能由应用静默混用。",
    ],
    scores: { bandwidth: 3, speed: 4, simplicity: 4, diversity: 3 },
    levels: [
      {
        name: "ML-DSA-44",
        security: "NIST 2 级",
        publicKey: "1,312 B",
        payloadLabel: "签名",
        payload: "2,420 B",
      },
      {
        name: "ML-DSA-65",
        security: "NIST 3 级",
        publicKey: "1,952 B",
        payloadLabel: "签名",
        payload: "3,309 B",
      },
      {
        name: "ML-DSA-87",
        security: "NIST 5 级",
        publicKey: "2,592 B",
        payloadLabel: "签名",
        payload: "4,627 B",
      },
    ],
  },
  {
    id: "slh-dsa",
    code: "FIPS 205",
    name: "SLH-DSA",
    role: "哈希签名",
    status: "正式标准 · 2024",
    metaphor: "哈希树杖",
    simple:
      "用 FORS 证明消息摘要，再让一串 WOTS+ 与 Merkle 认证路径把证明一路接到公钥根。",
    principle:
      "安全核心主要落在哈希函数的抗原像、抗第二原像和相关多目标性质，而不是格困难问题。",
    scene: "看重算法多样性、长期保守性，且能接受较大签名的场景",
    caution:
      "stateless 指调用者无需维护叶子计数器，不代表签名短或计算便宜；私钥种子仍必须严密保护。",
    accent: "gold",
    shape: "tree",
    assumption:
      "以 SHA-2 或 SHAKE 实例化的哈希安全性；FORS、WOTS+、XMSS 和 hypertree 分层组合。",
    equations: [
      "digest = H_msg(R, PK.seed, PK.root, M)",
      "XMSS_PK = MerkleRoot(WOTS+ leaves)",
      "PK.root = top hypertree root",
    ],
    flow: [
      {
        title: "Randomize",
        formula: "R=PRF_msg(SK.prf,opt_rand,M)",
        detail:
          "为消息生成随机化值 R；随后 H_msg 同时导出 FORS 消息摘要、树索引和叶索引。",
      },
      {
        title: "FORS",
        formula: "SIG_FORS → FORS_PK",
        detail:
          "摘要选择多棵小树中的叶子；签名包含秘密叶与认证路径，压缩成一个 FORS 公钥。",
      },
      {
        title: "WOTS+",
        formula: "chainᵃ(SK) → chainʷ⁻¹(PK)",
        detail:
          "Winternitz 链把 n-bit 值编码为若干哈希链位置；每个 XMSS 层使用一把 WOTS+ 密钥。",
      },
      {
        title: "Hypertree",
        formula: "d layers，h=d·h′",
        detail: "底层 XMSS 签 FORS 公钥；上一层依次签下层根，直到顶层根。",
      },
      {
        title: "Verify",
        formula: "root′ ?= PK.root",
        detail:
          "从 FORS 与每层 WOTS+/认证路径逐层重建根；最终只需与 32/48/64-byte 公钥中的根比较。",
      },
    ],
    implementation: [
      "验证所有地址字段与参数集绑定；域分离错误会破坏树组件隔离。",
      "签名体积和验证峰值内存必须进入协议与证书预算。",
      "2026 年的有限签名参数仍是额外草案，不应与 FIPS 205 通用参数混称。",
    ],
    scores: { bandwidth: 1, speed: 2, simplicity: 3, diversity: 5 },
    levels: [
      {
        name: "SLH-DSA-128s",
        security: "NIST 1 级",
        publicKey: "32 B",
        payloadLabel: "签名",
        payload: "7,856 B",
      },
      {
        name: "SLH-DSA-192s",
        security: "NIST 3 级",
        publicKey: "48 B",
        payloadLabel: "签名",
        payload: "16,224 B",
      },
      {
        name: "SLH-DSA-256s",
        security: "NIST 5 级",
        publicKey: "64 B",
        payloadLabel: "签名",
        payload: "29,792 B",
      },
    ],
  },
  {
    id: "fn-dsa",
    code: "FIPS 206 · 制定中",
    name: "FN-DSA",
    role: "紧凑数字签名",
    status: "Falcon 衍生 · 标准制定中（2026-10-08 核对）",
    metaphor: "猎隼轻刃",
    simple: "把消息哈希成格空间目标，再用 NTRU 私有短基寻找离目标很近的格点。",
    principle:
      "Hash-Then-Sign + trapdoor Gaussian sampling：公钥给出 NTRU 商 h，私钥短基支持近似离散高斯采样。",
    scene: "证书、固件签名及对通信体积高度敏感的系统",
    caution:
      "FIPS 206 仍在制定；FFT、LDL 树和高斯采样的数值稳定性与侧信道防护都比参数表更难。",
    accent: "silver",
    shape: "blade",
    assumption:
      "NTRU 格上的短整数解与 SIS 类问题；签名分布必须与私钥基尽量独立。",
    equations: [
      "fG−gF=q，h=g/f mod q",
      "c=HashToPoint(r ∥ M)",
      "s₁+s₂·h=c mod q，‖(s₁,s₂)‖≤β",
    ],
    flow: [
      {
        title: "NTRU key",
        formula: "fG−gF=q",
        detail: "短多项式 f、g、F、G 构成私有短基；公钥只暴露 h=g/f mod q。",
      },
      {
        title: "Hash to point",
        formula: "c=H(r ∥ M) ∈ R_q",
        detail: "随机 salt 与消息映射到环上目标 c，避免可操纵的结构化目标。",
      },
      {
        title: "FFT sampling",
        formula: "SampleD(t,σ)",
        detail: "借助 FFT 与 LDL tree，在 NTRU 格陪集内抽取接近目标的短向量。",
      },
      {
        title: "Compress",
        formula: "sig=(r, Compress(s₂))",
        detail: "只编码 salt 与短向量的压缩表示；这带来非常紧凑的签名。",
      },
      {
        title: "Verify",
        formula: "s₁=c−s₂·h；‖s‖²≤β²",
        detail: "解码 s₂，重建 s₁ 并检查范数；任何非规范编码都必须拒绝。",
      },
    ],
    implementation: [
      "浮点/定点近似误差必须有证明边界，不能只靠测试向量。",
      "采样时间、拒绝路径与缓存访问都可能泄露私有 NTRU 基。",
      "在 FIPS 206 定稿前，页面中的 Falcon 体积仅用于认识量级。",
    ],
    scores: { bandwidth: 5, speed: 4, simplicity: 1, diversity: 3 },
    levels: [
      {
        name: "FN-DSA-512",
        security: "目标 NIST 1 级",
        publicKey: "约 0.9 KB",
        payloadLabel: "签名",
        payload: "约 0.7 KB",
      },
      {
        name: "FN-DSA-1024",
        security: "目标 NIST 5 级",
        publicKey: "约 1.8 KB",
        payloadLabel: "签名",
        payload: "约 1.3 KB",
      },
    ],
  },
];

