export const weeklyIssues = [
  {
    id: "2026-10-08",
    date: "2026-10-08",
    title: "工程周报 01：从算法验证到协议证据",
    summary:
      "新增 TLS 与 SSH 自建互通报告、真实混合 KEM 流程、尺寸预算和迁移检查表。",
    items: [
      {
        href: "/benchmarks",
        label: "TLS 三方案与 SSH 三组 KEX：版本、样本与脚本可下载",
      },
      {
        href: "/lab/hybrid",
        label: "X25519 + ML-KEM：观察密文与上下文篡改如何改变派生结果",
      },
      {
        href: "/gm-pqc",
        label: "119 个候选 / 586 组参数：349 组已接入，进度与安全结论分开",
      },
      { href: "/migration", label: "24 项迁移检查：从资产盘点到限时回退" },
    ],
  },
] as const;
