import {
  EngineeringPage,
  Section,
  Sources,
  Table,
} from "../engineering/EngineeringPage";
import { parameters } from "../engineering/parameters";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "算法参数速查",
  "ML-KEM、ML-DSA、SLH-DSA 公钥、私钥、密文、签名长度与 CSV。",
  "/parameters",
);
export default function Page() {
  return (
    <EngineeringPage
      title="算法参数速查"
      intro="NIST 最终标准中的原始材料字节。协议封装、ASN.1、压缩文件和证书开销均另计；空值表示该算法不产生此材料。"
    >
      <div className="engineering-actions">
        <a href="/downloads/pqc-parameters.csv" download>
          下载标准参数 CSV
        </a>
        <a href="/downloads/ngcc-parameters.csv" download>
          下载国内候选参数 CSV
        </a>
        <a href="/gm-pqc">候选来源与接入状态</a>
      </div>
      <Table
        caption="18 组标准参数；单位 B，等级为 NIST 安全类别"
        heads={["参数集", "类型", "等级", "公钥", "私钥", "密文", "签名"]}
        rows={parameters.map((p) => [
          p.name,
          p.kind,
          p.level,
          p.publicKey.toLocaleString(),
          p.secretKey.toLocaleString(),
          p.ciphertext?.toLocaleString() ?? "—",
          p.signature?.toLocaleString() ?? "—",
        ])}
      />
      <Section title="读表时的三个边界">
        <p>
          ML-KEM 共享秘密固定为 32 B。ML-DSA 签名长度是标准编码长度。SLH-DSA 的
          s / f 代表不同的体积与速度取舍；SHA2 / SHAKE 的同级材料长度相同。
        </p>
        <p>
          国内候选 CSV
          源自本站固定版本的提交参考实现目录，缺失值保留为空，不能用 0
          猜测；这些候选不等同于获批国密标准。
        </p>
      </Section>
      <Sources
        items={[
          {
            label: "FIPS 203 · ML-KEM",
            href: "https://doi.org/10.6028/NIST.FIPS.203",
          },
          {
            label: "FIPS 204 · ML-DSA",
            href: "https://doi.org/10.6028/NIST.FIPS.204",
          },
          {
            label: "FIPS 205 · SLH-DSA",
            href: "https://doi.org/10.6028/NIST.FIPS.205",
          },
        ]}
      />
    </EngineeringPage>
  );
}
