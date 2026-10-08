/** Shared names and routes for the header, exploration index and jump search. */
export const destinations = [
  {
    href: "/",
    name: "Yibiao 首页",
    en: "Yibiao Home",
    descriptionEn: "Cryptography engineering and experiments by Yibiao.",
    description: "Yibiao 的密码工程与实验，从这里出发。",
    keywords: "home 首页 量仔 liangzai",
  },
  {
    href: "/models",
    name: "模型鉴赏",
    en: "Model Gallery",
    descriptionEn: "Explore Liangzai and Nailong in three dimensions.",
    description: "旋转、缩放，近距离欣赏量仔与奶龙。",
    keywords: "models 模型 鉴赏 量仔 奶龙 旋转 三维",
  },
  {
    href: "/storybook",
    name: "星际漫游",
    en: "Space Journey",
    descriptionEn: "An eleven-page adventure about curiosity and companionship.",
    description: "量仔与奶龙，十一页关于并肩的冒险。",
    keywords: "story 故事 星际 奶龙 冒险 绘本",
  },
  {
    href: "/archive",
    name: "量仔小传",
    en: "Liangzai Profile",
    descriptionEn: "Meet the curious mascot behind this site.",
    description: "认识一位把好奇心带向未知的守护者。",
    keywords: "guardian 人物 档案 量仔 角色",
  },
  {
    href: "/pqc-arsenal",
    name: "密码图鉴",
    en: "Algorithm Guide",
    descriptionEn: "Understand post-quantum algorithms, principles and parameters.",
    description: "从数学直觉，走近后量子密码。",
    keywords: "pqc 算法 密码 ml-kem ml-dsa slh-dsa fn-dsa 原理",
  },
  {
    href: "/pqc-practice",
    name: "密码实验室",
    en: "Cryptography Lab",
    descriptionEn: "Run key encapsulation, signatures and verification locally.",
    description: "运行真实算法，亲手封装、签名与验证。",
    keywords: "wasm 实验 lab 密钥 签名 哈希 验证 sm2 测试",
  },
  {
    href: "/notes",
    name: "技术笔记",
    en: "Engineering Notes",
    descriptionEn: "Implementation notes with English abstracts.",
    description: "算法材料、参数验证与实现记录，附英文摘要。",
    keywords: "notes writing 笔记 写作 验证 记录",
  },
  {
    href: "/news",
    name: "前沿新闻",
    en: "Frontier News",
    descriptionEn: "Follow post-quantum cryptography, protocols and standards.",
    description: "跟进后量子密码、安全协议与标准动态。",
    keywords: "news 新闻 ai 前沿 技术 标准 资讯",
  },
  {
    href: "/about",
    name: "关于我",
    en: "About Yibiao",
    descriptionEn: "From Shandong University to cryptography engineering.",
    description: "从山东大学，到密码工程实践。",
    keywords: "about yibiao wang 个人 经历 关于我 山东大学",
  },
  ...[
    { href: "/protocols", name: "协议工程", en: "Protocols", description: "TLS / TLCP、SSH 与 IKEv2 的方案、抗降级与验证。", keywords: "协议 tls tlcp ssh ikev2 混合 工程" },
    { href: "/projects", name: "公开作品", en: "Projects", description: "GitHub 项目、状态与可复现成果。", keywords: "作品 项目 github projects" },
    { href: "/benchmarks", name: "互通与性能", en: "Benchmarks", description: "握手耗时、报文实测与实现版本矩阵。", keywords: "benchmarks 性能 互通 握手 耗时 复现" },
    { href: "/lab/hybrid", name: "混合 KEM 演示", en: "Hybrid KEM Demo", description: "真实 X25519 + ML-KEM → HKDF 完整流程。", keywords: "hybrid 混合 kem x25519 hkdf" },
    { href: "/gm-pqc", name: "国密 × PQC", en: "GM × PQC", description: "国内征集候选与接入进度看板。", keywords: "国密 进度 gm 征集 候选" },
    { href: "/migration", name: "迁移指南", en: "Migration", description: "资产盘点、优先级、灰度与回退检查表。", keywords: "迁移 migration 灰度 回退 敏捷 检查表" },
    { href: "/tools", name: "协议尺寸工具", en: "Size Tools", description: "报文预算、证书对比与参数下载。", keywords: "工具 tools 尺寸" },
    { href: "/tools/packet-size", name: "报文尺寸计算器", en: "Packet Size Calculator", description: "ClientHello、证书链与 IKE 分片预算。", keywords: "计算器 clienthello mtu 分片 报文" },
    { href: "/tools/certificates", name: "证书体积对比", en: "Certificate Comparison", description: "RSA、ECDSA 与 ML-DSA 链体积模型。", keywords: "证书 certificates rsa ecdsa 体积" },
    { href: "/parameters", name: "参数速查", en: "Parameters", description: "标准算法长度、来源和 CSV 下载。", keywords: "参数 长度 csv 速查 parameters" },
    { href: "/contact", name: "联系与订阅", en: "Contact & RSS", description: "公开邮箱、RSS 与邮件周报说明。", keywords: "联系 邮箱 rss 订阅 email contact" },
    { href: "/weekly", name: "工程周报", en: "Engineering Digest", description: "站点更新与实验摘要。", keywords: "周报 weekly 更新" },
    { href: "/records", name: "公开记录", en: "Public Record", description: "可公开的演讲、论文与开源维护记录。", keywords: "记录 演讲 论文 贡献 开源" },
    { href: "/changelog", name: "更新日志", en: "Changelog", description: "站点持续维护记录。", keywords: "更新 日志 changelog" },
    { href: "/site-info", name: "站点说明", en: "Site Information", description: "技术栈、内容来源与复现方式。", keywords: "说明 技术栈 来源 site" },
    { href: "/lab/security", name: "实验室安全与隐私", en: "Lab Security & Privacy", description: "本地计算、WASM 来源与安全联系。", keywords: "隐私 安全 security wasm 来源" },
  ].map(item => ({ ...item, descriptionEn: item.en + ". Public sources and reproducible engineering experiments." })),
];

export function searchDestinations(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return destinations.filter((item) =>
    terms.every((term) =>
      `${item.name} ${item.description} ${item.keywords}`
        .toLocaleLowerCase()
        .includes(term),
    ),
  );
}
