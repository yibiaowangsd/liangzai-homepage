import report from "../../public/data/protocol-benchmarks.json";
import candidates from "../engineering/candidates.json";
export const engineeringProjects = [
  { title: "TLS 1.3 三方案互通", protocol: "TLS · 本地协议实测", status: "CA 校验通过", result: "经典、混合和纯 PQC 协商与认证，附原始样本与复现脚本。", metric: `${report.interoperability.filter(r => r.status === "passed").length} 项`, note: "Node 24 / OpenSSL 3.5 客户端到 Node 服务端；回环环境。", href: "/benchmarks", action: "查看互通与性能" },
  { title: "混合密钥协商", protocol: "X25519 + ML-KEM → HKDF", status: "浏览器真实计算", result: "逐步交换公开材料、组合两个秘密并核对独立派生结果。", metric: "1,216 B", note: "客户端公钥材料；教学 KDF，附密文与上下文篡改实验。", href: "/lab/hybrid", action: "运行混合 KEM" },
  { title: "征集算法接入记录", protocol: "国密 × PQC · 实现评估", status: "逐参数追踪", result: "公开来源、当前运行映射与待接入参数，安全证据单独核对。", metric: `${candidates.totals.runnable} / ${candidates.totals.parameters}`, note: `${candidates.totals.candidates} 个候选；CSV 与看板在构建时同步生成。`, href: "/gm-pqc", action: "查看进展看板" },
] as const;
