import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EngineeringPage,
  Section,
  Sources,
  Table,
} from "../../engineering/EngineeringPage";
import { protocols } from "../../engineering/protocols";
import ProtocolDiagram from "../../engineering/ProtocolDiagram";
import { pageMetadata } from "../../site/metadata";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = protocols.find((p) => p.slug === slug);
  return p ? pageMetadata(p.name, p.intro, "/protocols/" + slug) : {};
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = protocols.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <EngineeringPage title={p.name} intro={p.intro} eyebrow={p.status}>
      <Section title="方案图">
        <ProtocolDiagram steps={p.flow} />
      </Section>
      <Section title="扩展点">
        <ul>
          {p.extensions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title="报文尺寸变化">
        <Table
          caption="裸材料长度；不含协议头、编码、证书链与加密记录开销"
          heads={[...p.sizeHeads]}
          rows={p.sizes.map((row) => [...row])}
        />
        <p>
          <Link href="/tools/packet-size">计算完整模型的尺寸与 IKE 分片 →</Link>
        </p>
      </Section>
      <Section title="回退与抗降级策略">
        <ul>
          {p.fallback.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title="互通结果">
        <p className="engineering-note">{p.interop}</p>
        <Link href="/benchmarks">环境、版本、原始数据与复现脚本 →</Link>
      </Section>
      <Section title="踩坑记录">
        <ul>
          {p.pitfalls.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Sources items={[...p.sources]} />
    </EngineeringPage>
  );
}
