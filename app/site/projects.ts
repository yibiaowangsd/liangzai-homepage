export const engineeringProjects = [
  { title: "密钥封装材料验证", protocol: "TLS / TLCP · 算法验证", status: "浏览器可运行", result: "生成、封装、解封并核对双方共享秘密。", metric: "2,272 B", note: "ML-KEM-768 公钥 1,184 B + 密文 1,088 B；不含协议头。", href: "/notes/ml-kem-materials", action: "阅读材料验证笔记" },
  { title: "签名参数往返验证", protocol: "SSH / IKEv2 · 算法验证", status: "浏览器可运行", result: "ML-DSA 与 SLH-DSA 支持签名、验签和材料导入。", metric: "15 组", note: "3 组 ML-DSA + 12 组 SLH-DSA 参数组合。", href: "/notes/signature-matrix", action: "阅读参数验证笔记" },
  { title: "征集算法接入记录", protocol: "协议迁移 · 实现评估", status: "逐参数记录", result: "公开来源、实现状态、功能验证与未接入原因。", metric: "586 组", note: "119 个候选；可运行状态以当前接入记录为准。", href: "/notes/implementation-records", action: "阅读接入方法笔记" },
] as const;
