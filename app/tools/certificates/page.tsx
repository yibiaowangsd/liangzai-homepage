import {
  EngineeringPage,
  Section,
  Table,
} from "../../engineering/EngineeringPage";
import { pageMetadata } from "../../site/metadata";
import report from "../../../public/data/protocol-benchmarks.json";
import Comparison from "./Comparison";
export const metadata = pageMetadata(
  "证书体积对比",
  "RSA、ECDSA、ML-DSA 证书链尺寸预算与本地 DER 样本对照。",
  "/tools/certificates",
);
export default function Page() {
  return (
    <EngineeringPage
      title="证书体积对比"
      intro="把公钥、签发者签名与元数据拆开。同一条链的算法组合、扩展和名称长度会影响最终 DER；下面的可调模型提供相同条件下的预算。"
    >
      <Comparison />
      <Section title="模型的边界">
        <p>
          SPKI 假设为 RSA-2048 294 B、ECDSA P-256 91 B、ML-DSA 公钥长度 + 22 B
          的 AlgorithmIdentifier / BIT STRING 包装。ECDSA 签名按 DER 上界 72 B
          计。元数据输入包含 TBS 其余字段、签名算法标识与剩余长度编码；大对象跨
          ASN.1 长度边界时也需重新校准。
        </p>
        <p>
          链模型采用每张证书相同算法、相同元数据；真实混合链需分别计算每张 SPKI
          和签发者签名。一般服务端不发送根证书。比较的是编码体积，不是相同安全等级或相同运行成本。
        </p>
      </Section>
      <Section title="真实测试证书对照">
        <Table
          caption="TLS 复现脚本生成的 localhost 单张自签证书；与上方默认元数据模型不同"
          heads={["方案", "证书签名", "实测 DER B"]}
          rows={report.results.map((r) => [
            r.group,
            r.auth,
            r.certificateDerBytes,
          ])}
        />
        <p>
          这里只实测 ECDSA 和 ML-DSA-65，RSA
          列为模型估算。自签测试证书不是公开受信任证书，也未宣称浏览器兼容。
        </p>
        <a href="/downloads/benchmark-protocols.mjs" download>
          下载生成测试证书与测量 DER 的脚本
        </a>
      </Section>
    </EngineeringPage>
  );
}
