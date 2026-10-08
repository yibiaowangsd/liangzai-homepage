/** Implementation notes grounded in this site's public code and parameter catalog. */
export const notes = [
  {
    slug: "ml-kem-materials", date: "2026-10-08", category: "密钥封装",
    title: "2,272 B，离一次真实握手还有多远",
    summary: "拆开 ML-KEM-768 的公钥与密文，说明浏览器实验测到了什么。",
    english: "ML-KEM-768 uses a 1,184-byte encapsulation key and a 1,088-byte ciphertext. This note separates raw KEM material from protocol wire overhead and explains what the browser experiment actually measures.",
    sections: [
      { title: "先确认材料，而不是报文", paragraphs: ["ML-KEM-768 的封装公钥为 1,184 B，密文为 1,088 B，两者合计 2,272 B。双方导出的共享秘密为 32 B。这个总数只描述 KEM 材料，不包含协议头、扩展字段、经典密钥份额、证书或签名，也不代表相对某个旧握手增加了 2,272 B。", "首页使用实验室已有的 PQMagic WASM 实现。接收方生成密钥，发送方使用公钥封装，接收方用私钥解封装；只有两份 32 B 共享秘密逐字节一致，页面才显示验证通过。展示的公钥前缀来自本次随机生成的真实公钥。"] },
      { title: "耗时的边界", paragraphs: ["计时由 Web Worker 内的 performance.now() 完成，分别包围密钥生成、封装和解封装调用。WASM 下载与初始化、线程消息传递、页面动画和网络往返不计入算法耗时。", "首页展示单次测量，浏览器计时精度、设备负载和实现都会影响结果，极短操作可能显示 0.00 ms。要比较实现，应固定版本与硬件，预热后重复运行并报告样本量和分位数。这里不把一次运行包装成性能基准。"] },
      { title: "走向协议验证", paragraphs: ["混合协议还需要经典共享秘密、协议指定的组合方式、协商与降级处理，以及身份认证。KEM 往返成功只是原语层的功能检查。", "下一层验证需要独立记录对端版本、协商结果、实际线上报文和失败路径。本站目前公开的这个实验不宣称已经完成这些协议互通测试。"] },
    ],
    links: [{ label: "运行完整密钥封装实验", href: "/pqc-practice" }, { label: "NIST FIPS 203", href: "https://csrc.nist.gov/pubs/fips/203/final" }, { label: "实验室 Worker 实现", href: "https://github.com/yibiaowangsd/liangzai-homepage/blob/main/public/pqc-practice/worker.js" }],
  },
  {
    slug: "signature-matrix", date: "2026-10-08", category: "签名验证",
    title: "15 组签名参数，如何复查验证路径",
    summary: "从参数选择到签名与验签，把算法功能和协议认证分开检验。",
    english: "The laboratory exposes three ML-DSA parameter sets and twelve SLH-DSA combinations. This note describes a reproducible signing and verification workflow and distinguishes primitive-level checks from protocol authentication.",
    sections: [
      { title: "15 组从哪里来", paragraphs: ["ML-DSA 提供 44、65、87 三组参数。SLH-DSA 在 SHA2 与 SHAKE 两种哈希实例下，各提供 128f、128s、192f、192s、256f、256s 六组参数。实验室目录因此包含 3 + 2 × 6 = 15 组签名参数。", "这个数字是本站接口的参数覆盖范围，不是完成 15 个协议集成，也不是标准参与记录。实现源自 PQMagic，版本与来源记录保留在实验室文档中。"] },
      { title: "复查一次签名", paragraphs: ["进入实验室的签名页，选择算法和参数集，生成密钥，再对明确编码的消息签名。保留公钥、原始消息和签名，在同一参数集下验签。导入材料时，应同时检查长度、编码和参数标识。", "再修改消息中的一个字节，使用原签名重新验签，应得到失败结果；也应检查错误公钥、截断签名和不匹配参数。正常往返和负向用例各自回答不同问题。"] },
      { title: "功能通过不等于协议认证完成", paragraphs: ["协议认证还涉及被签名的数据结构、上下文绑定、身份与证书链、协商和重放防护。签名算法输出能够被验证，不代表这些机制已正确集成。", "浏览器实验适合检查材料和理解接口。生产使用仍需要针对具体实现的安全评估；本站功能测试不构成 FIPS 实现认证。"] },
    ],
    links: [{ label: "运行签名实验", href: "/pqc-practice?tab=signature" }, { label: "NIST FIPS 204", href: "https://csrc.nist.gov/pubs/fips/204/final" }, { label: "NIST FIPS 205", href: "https://csrc.nist.gov/pubs/fips/205/final" }],
  },
  {
    slug: "implementation-records", date: "2026-10-08", category: "实现记录",
    title: "把未接入的参数，也写进记录",
    summary: "候选目录、可运行状态和验证结果，是三个不同的数字。",
    english: "The current catalog tracks 119 candidates and 586 parameter entries. Catalog coverage is distinct from executable support or successful validation. Per-parameter records preserve sources, status and reasons for unavailable implementations.",
    sections: [
      { title: "目录范围与可运行范围", paragraphs: ["当前国内征集目录记录 119 个候选、586 组参数。586 是目录范围，不能读成所有参数均已可运行或全部通过验证。每组的实际状态以接入记录页为准。", "将目录和运行状态分开，可以避免把编译成功当成功能通过，也避免把未提供完整实现的候选误标为算法失败。状态需要与证据一起更新。"] },
      { title: "保留一条可追溯的路径", paragraphs: ["接入记录按候选与参数组织，提供来源、模块状态和功能验证信息，并支持 CSV 导出。使用某个结果前，应核对对应参数、来源版本和验证条件。", "未接入可能来自来源不可用、接口不兼容或编译限制。本站另行维护不可运行清单与已发布安全发现索引，将工程障碍和已确认的安全发现分别记录。"] },
      { title: "怎样使用这些记录", paragraphs: ["先在记录页定位候选与参数，再查看是否有可运行模块及相应验证结果。对需要继续评估的实现，保存来源版本、构建方式和输入输出，重新执行正常与异常路径。", "目录不是安全排名。浏览器功能验证不能替代密码分析、侧信道评估或生产协议审查；接入数量也不能作为算法安全性的分数。"] },
    ],
    links: [{ label: "查看逐参数接入记录", href: "/pqc-practice/audit.html" }, { label: "不可运行清单", href: "https://github.com/yibiaowangsd/liangzai-homepage/blob/main/docs/pqc-unavailable.md" }, { label: "安全发现索引", href: "https://github.com/yibiaowangsd/liangzai-homepage/blob/main/docs/pqc-security-index.md" }],
  },
] as const;
