export const protocols = [
  {
    slug: "tls",
    name: "TLS 1.3 混合密钥协商",
    status: "本地握手已验证",
    intro:
      "以 OpenSSL 3.5 与 Node 24 为基线，比较 X25519、X25519MLKEM768 与 MLKEM768；把协商、认证与部署策略分开检查。",
    flow: [
      [
        "客户端 → 服务端",
        "ClientHello: supported_groups + key_share (ML-KEM-768 公钥 1,184 B || X25519 公钥 32 B)",
      ],
      [
        "服务端 → 客户端",
        "ServerHello: 选定组 + key_share (ML-KEM 密文 1,088 B || X25519 公钥 32 B)",
      ],
      [
        "双方本地",
        "X25519MLKEM768: ML-KEM ss || X25519 ss → TLS 1.3 HKDF 密钥计划",
      ],
      [
        "服务端 → 客户端",
        "EncryptedExtensions / Certificate / CertificateVerify / Finished",
      ],
      ["客户端 → 服务端", "校验认证与 transcript；发送 Finished"],
    ],
    extensions: [
      "supported_groups 与 key_share 使用实现支持的组标识；不要复用私有编号冒充标准。",
      "协议组定义公钥、密文的排列与组合方式；浏览器教学实验的 HKDF 不是 TLS 完整密钥计划。",
      "PQC 密钥协商不自动让 ECDSA 证书变成 PQC 认证；纯 PQC 测试单独使用 ML-DSA-65 证书。",
    ],
    sizes: [
      ["X25519", "32 B", "32 B"],
      ["X25519MLKEM768", "1,216 B", "1,120 B"],
      ["MLKEM768", "1,184 B", "1,088 B"],
    ],
    sizeHeads: ["组", "客户端 key_exchange", "服务端 key_exchange"],
    fallback: [
      "区分兼容模式与强制混合模式：后者无法协商时直接失败，不静默换成经典组。",
      "HelloRetryRequest 与 transcript 按 RFC 8446 校验；协商列表本身允许经典组时，认证 transcript 并不等于部署策略强制 PQC。",
      "遥测记录最终组、HRR、失败原因与证书签名类型；灰度回退要有审批、期限和告警。",
    ],
    interop:
      "Node 24.19.0 与 OpenSSL 3.5.7 客户端到 Node 服务端的三组测试均通过；CA 与主机名校验开启。只覆盖本地测试证书，不代表浏览器或系统信任库兼容。",
    pitfalls: [
      "把 ML-KEM 共享秘密直接当应用密钥，跳过密钥计划与上下文绑定。",
      "根据一次 loopback 耗时判断生产性能；忽略 RTT、HRR、证书大小与丢包。",
      "错误路径未清理连接，导致握手字节计数混入后续会话。",
    ],
    sources: [
      {
        label: "RFC 8446 · TLS 1.3",
        href: "https://www.rfc-editor.org/rfc/rfc8446",
      },
      {
        label: "OpenSSL 3.5 发布说明",
        href: "https://openssl-library.org/news/openssl-3.5-notes/",
      },
      {
        label: "ECDHE-MLKEM 规范进展",
        href: "https://datatracker.ietf.org/doc/draft-ietf-tls-ecdhe-mlkem/",
      },
    ],
  },
  {
    slug: "tlcp",
    name: "TLCP + 国密 + PQC",
    status: "公开方案分析 · 未做公开互通实测",
    intro:
      "保留 TLCP 的双证书与国密基线，讨论增加 PQC 协商时需要定义的格式、认证绑定与失败行为。此页是公开资料分析，不披露公司实现。",
    flow: [
      [
        "客户端 → 服务端",
        "ClientHello: 国密能力 + 明确定义的 PQC 能力（研究扩展）",
      ],
      [
        "服务端 → 客户端",
        "ServerHello + 签名 / 加密双证书：保留 TLCP 身份语义",
      ],
      [
        "双方交换",
        "按约定承载 SM2 相关材料与 PQC 公钥 / 密文；绑定算法、角色、版本",
      ],
      ["双方本地", "组合输入并按协议定义派生密钥；SM3 / SM4 仍需遵循基线规范"],
      [
        "双方确认",
        "认证协商 transcript，校验 Finished；执行强制模式与回退策略",
      ],
    ],
    extensions: [
      "TLCP 的 SM2 签名证书与加密证书不是 TLS 1.3 单证书模型；PQC 接入需先说明修改的是哪种套件和认证路径。",
      "PQC 研究扩展需定义字段编号、长度编码、错误码、KDF 与 transcript 覆盖范围；不能仅把 TLS 1.3 的组直接移植。",
      "SM2 / SM3 / SM4 与国内 PQC 征集候选的身份不同。候选接入成功不表示获批国密标准或通过商用密码产品认证。",
    ],
    sizes: [
      ["SM2 未压缩点", "65 B", "不含 ASN.1 / 协议包装"],
      ["ML-KEM-768 公钥", "1,184 B", "候选研究协商输入"],
      ["ML-KEM-768 密文", "1,088 B", "单份封装输出"],
    ],
    sizeHeads: ["材料", "尺寸", "边界"],
    fallback: [
      "将传统国密与增强模式作为可观察的策略选项；强制增强模式遇到不支持必须拒绝。",
      "在认证范围内绑定扩展是否存在、具体算法与参数；不接受删除扩展后无声重试。",
      "回退需要管理面显式配置，并对每次经典握手保留可追踪记录。",
    ],
    interop:
      "暂无可公开复现的 TLCP + PQC 端到端结果。待补充自建双端实现、明确协议版本与公开脚本；本站算法实验不计为 TLCP 互通通过。",
    pitfalls: [
      "把算法 KAT 通过写成 TLCP 协议互通通过。",
      "复用证书字段存放 PQC 公钥，却没有定义签名覆盖与长度边界。",
      "把私有扩展称为标准套件，或把公司性能数字带到个人公开实验。",
    ],
    sources: [
      {
        label: "GB/T 38636-2020 标准检索",
        href: "https://openstd.samr.gov.cn/bzgk/gb/",
      },
      {
        label: "Tongsuo 公开实现",
        href: "https://github.com/Tongsuo-Project/Tongsuo",
      },
      { label: "NIST FIPS 203", href: "https://doi.org/10.6028/NIST.FIPS.203" },
    ],
  },
  {
    slug: "ssh",
    name: "SSH 混合密钥交换",
    status: "OpenSSH 本地会话已验证",
    intro:
      "以 OpenSSH 10.0p2 的 mlkem768x25519-sha256 为入口，检查 KEX、主机认证与用户认证各自解决的问题。",
    flow: [
      [
        "双方交换",
        "版本字符串 + SSH_MSG_KEXINIT：协商 KEX / 主机密钥 / 密码套件",
      ],
      [
        "客户端 → 服务端",
        "SSH_MSG_KEX_ECDH_INIT：X25519 公钥 + ML-KEM-768 公钥",
      ],
      [
        "服务端 → 客户端",
        "SSH_MSG_KEX_ECDH_REPLY：主机公钥 + 混合响应 + exchange hash 签名",
      ],
      ["双方本地", "按实现的混合方案组合秘密并计算 exchange hash"],
      ["双方交换", "NEWKEYS → 用户认证 → 加密会话"],
    ],
    extensions: [
      "通过 KEX 算法名称选择混合格式，不能只检查 OpenSSL 是否支持 ML-KEM。",
      "混合 KEX 不改变 Ed25519 主机签名与用户密钥的经典性质；本地测试仍属于混合协商。",
      "主机公钥必须校验。本地脚本固定新生成的测试主机公钥，不使用 StrictHostKeyChecking=no。",
    ],
    sizes: [
      ["curve25519-sha256", "32 B", "32 B"],
      ["mlkem768x25519-sha256", "1,216 B", "1,120 B"],
      ["sntrup761x25519-sha512", "1,190 B", "1,071 B"],
    ],
    sizeHeads: ["KEX", "客户端材料", "服务端材料"],
    fallback: [
      "用 KexAlgorithms 的明确列表部署；强制 ML-KEM 时不要附带经典后备。",
      "保留严格主机认证；协商 transcript 由 exchange hash 认证，但允许的经典算法仍受配置控制。",
      "分开统计 KEX 失败、主机认证失败、用户认证失败与命令执行失败。",
    ],
    interop:
      "可复现脚本启动独立回环 sshd，对三个 KEX 固定主机密钥并执行认证后的测试命令。结果与版本见互通性能页；未测试其他厂商 SSH 客户端。",
    pitfalls: [
      "命令失败不一定是 KEX 失败：本次云环境首次失败来自 StrictModes 的目录权限检查。",
      "混用旧版算法名称与新版 KEX；优先检查 ssh -Q kex。",
      "把整个 SSH 进程的启动、认证、命令耗时称为纯 KEX 耗时。",
    ],
    sources: [
      {
        label: "OpenSSH 10.0 发布说明",
        href: "https://www.openssh.com/txt/release-10.0",
      },
      {
        label: "OpenSSH 后量子迁移说明",
        href: "https://www.openssh.com/pq.html",
      },
      {
        label: "RFC 4253 · SSH Transport",
        href: "https://www.rfc-editor.org/rfc/rfc4253",
      },
    ],
  },
  {
    slug: "ikev2",
    name: "IKEv2 多重密钥交换",
    status: "标准路径分析 · 未做本地 VPN 互通实测",
    intro:
      "沿 RFC 9370 的多重密钥交换路径，解释 IKE_INTERMEDIATE、额外 KE 与 IKE 分片如何一起影响部署。",
    flow: [
      [
        "发起方 ↔ 响应方",
        "IKE_SA_INIT：初始协商与 KE；大报文可能触发路径限制",
      ],
      [
        "双方追加交换",
        "IKE_INTERMEDIATE：按协商增加密钥交换，绑定中间交换 transcript",
      ],
      ["双方完成认证", "IKE_AUTH：认证身份与协商上下文"],
      ["双方本地", "按规范更新密钥材料，建立 IKE SA / Child SA"],
      ["后续通信", "在重协商与重建时继续执行策略；监测 UDP 分片与重传"],
    ],
    extensions: [
      "RFC 9370 提供框架，具体 ML-KEM 方法与编码还要对应实现支持的规范版本；不凭框架推断算法已支持。",
      "RFC 9242 定义 IKE_INTERMEDIATE；RFC 7383 定义加密 IKE 分片，不能用它解决初始未加密 IKE_SA_INIT 的所有尺寸问题。",
      "区分 IKE 密钥交换、IKE 认证算法与 ESP 数据面算法；PQC KEM 不替代身份认证。",
    ],
    sizes: [
      ["ML-KEM-768 公钥", "1,184 B", "另加 KE / IKE / UDP / IP 头"],
      ["ML-KEM-768 密文", "1,088 B", "封装响应材料"],
      ["ML-DSA-65 签名", "3,309 B", "认证材料，证书链另计"],
    ],
    sizeHeads: ["材料", "尺寸", "部署影响"],
    fallback: [
      "对多重 KE 的个数与具体方法建立强制策略；缺少必需交换就拒绝 SA。",
      "中间交换需纳入认证范围；重新建 SA 不能自动放宽 PQC 要求。",
      "在自建隧道中逐步测量 MTU、NAT-T、重传和生命周期；回退仅通过管理面策略进行。",
    ],
    interop:
      "未运行 strongSwan / Libreswan 的 PQC 隧道互通。此页与尺寸工具展示标准框架和估算边界，不发布未验证的隧道成功或吞吐数据。",
    pitfalls: [
      "把 TCP 分段、IP 分片与 IKE 加密分片混为一谈。",
      "将 IKE_AUTH 的认证证书增长归因于初始密钥交换。",
      "忽略 NAT-T、IPv6 与 AEAD 标签带来的额外开销。",
    ],
    sources: [
      {
        label: "RFC 9370 · Multiple Key Exchanges",
        href: "https://www.rfc-editor.org/rfc/rfc9370",
      },
      {
        label: "RFC 9242 · IKE_INTERMEDIATE",
        href: "https://www.rfc-editor.org/rfc/rfc9242",
      },
      {
        label: "RFC 7383 · IKE fragmentation",
        href: "https://www.rfc-editor.org/rfc/rfc7383",
      },
    ],
  },
] as const;
