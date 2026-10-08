import Link from "next/link";
import tls from "../../public/data/protocol-benchmarks.json";
import ssh from "../../public/data/ssh-benchmarks.json";
import {
  EngineeringPage,
  Section,
  Table,
} from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "互通与性能",
  "经典、混合、纯 PQC 的本地握手实测、报文大小、实现版本矩阵与复现脚本。",
  "/benchmarks",
);
const range = (
  r: (typeof tls.results)[number],
  field: "clientBytes" | "serverBytes",
) => {
  const values = r.measurements.map((m) => m[field]);
  const lo = Math.min(...values),
    hi = Math.max(...values);
  return lo === hi
    ? lo.toLocaleString()
    : `${lo.toLocaleString()}–${hi.toLocaleString()}`;
};
const clients = [...new Set(tls.interoperability.map((r) => r.client))];
const matrixGroups = ["X25519", "X25519MLKEM768", "MLKEM768"];
export default function Page() {
  return (
    <EngineeringPage
      title="互通与性能"
      intro="同一台机器、同一条回环路径，比较三种 TLS 方案。保留样本、版本、计数口径和复现脚本，方便在自己的网络条件下重测。"
    >
      <p className="engineering-note">
        实测时间 {tls.measuredAt.slice(0, 10)}。loopback
        上的毫秒差异不能推断生产环境收益。纯 PQC
        方案同时更换协商组和证书认证，不能把全部差异归因于 KEM。
      </p>
      <Section title="TLS 1.3：经典 / 混合 / 纯 PQC">
        <Table
          caption="每组 3 次预热 + 20 次新连接；握手耗时包含 TCP 建连，无应用数据"
          heads={[
            "方案 / 协商组",
            "认证",
            "中位数 ms",
            "P95 ms",
            "客户端 B",
            "服务端 B",
            "TLS 记录 C / S",
          ]}
          rows={tls.results.map((r) => [
            r.group,
            r.auth,
            r.medianMs,
            r.p95Ms,
            range(r, "clientBytes"),
            range(r, "serverBytes"),
            `${r.clientRecords} / ${r.serverRecords}`,
          ])}
        />
        <p>
          计数从 TCP 代理接收 TLS 字节开始，到服务端 secureConnection
          后一个事件循环结束；包含 TLS 记录头以及窗口内观察到的消息。ECDSA
          签名编码长度可能变化，因此报文列展示所有样本的范围。
        </p>
        <Table
          caption="首个 ClientHello 握手消息与单张自签测试证书 DER（均为观察值）"
          heads={[
            "协商组",
            "ClientHello B",
            "证书 DER B",
            "MTU 1,500 的分段下界估算 C / S",
          ]}
          rows={tls.results.map((r) => [
            r.group,
            r.clientHelloBytes,
            r.certificateDerBytes,
            `${Math.ceil(r.clientBytes / 1460)} / ${Math.ceil(r.serverBytes / 1460)}`,
          ])}
        />
        <p>
          <small>
            分段列采用 IPv4 20 B + TCP 20 B、MSS 1,460 B
            的累计字节下界模型；不含选项、ACK、实际分段边界。没有 IP
            抓包，不能据此声明 IP 分片发生。TLS 记录数量是实测；IKE
            分片另见工具。
          </small>
        </p>
      </Section>
      <Section title="实现 × 版本互通矩阵">
        <Table
          caption="客户端 → Node 服务端；每个单元均来自独立握手，CA / 主机名校验开启"
          heads={[
            "客户端实现 / 版本",
            ...matrixGroups.map(
              (group) => "Node " + tls.environment.node + " · " + group,
            ),
          ]}
          rows={clients.map((client) => [
            client,
            ...matrixGroups.map((group) => {
              const result = tls.interoperability.find(
                (r) => r.client === client && r.group === group,
              );
              return result?.status === "passed"
                ? "通过"
                : result
                  ? "失败"
                  : "未测试";
            }),
          ])}
        />
      </Section>
      <Section title="SSH：认证后的完整测试会话">
        <Table
          caption={
            ssh.environment.client +
            "；每组 2 次预热 + 10 次样本，主机公钥固定校验"
          }
          heads={["KEX", "结果", "中位数 ms", "P95 ms"]}
          rows={ssh.results.map((r) => [
            r.kex,
            r.status === "measured" ? "认证 + 命令通过" : r.status,
            "medianMs" in r ? r.medianMs : "—",
            "p95Ms" in r ? r.p95Ms : "—",
          ])}
        />
        <p>
          SSH 时间包括客户端进程启动、KEX、Ed25519 主机认证、用户公钥认证与
          printf 命令完成，和 TLS 耗时口径不同。SSH 线路字节未采集。纯 PQC SSH
          认证未测试。
        </p>
        <p>
          <small>
            独立测试 sshd 仅监听回环，使用一次性密钥。当前云容器根目录权限不符合
            StrictModes，脚本只对临时 daemon 设置
            StrictModes=no，保留主机密钥验证；它不是生产 sshd 配置模板。
          </small>
        </p>
      </Section>
      <Section title="测试环境与复现">
        <Table
          caption="TLS 主测环境；SSH 复用同一台 Linux 机器"
          heads={["项", "值"]}
          rows={[
            ["Node", tls.environment.node],
            ["OpenSSL CLI", tls.environment.openssl],
            ["Node OpenSSL", tls.environment.nodeOpenSSL],
            ["CPU", tls.environment.cpu],
            [
              "平台",
              `${tls.environment.platform} ${tls.environment.arch} / ${tls.environment.logicalCpus} 逻辑 CPU`,
            ],
            ["网络", "127.0.0.1，无注入时延 / 丢包"],
            ["证书", "临时 localhost 测试 CA 校验；不复用会话"],
          ]}
        />
        <pre>
          {
            "# Node 24+，OpenSSL 3.5+；不需 npm 依赖\nBENCH_SAMPLES=20 node benchmark-protocols.mjs tls-results.json\n# Linux、OpenSSH 10+、ssh-keygen、/usr/sbin/sshd；在可信的工作目录运行\nBENCH_SAMPLES=10 node benchmark-ssh.mjs ssh-results.json"
          }
        </pre>
        <div className="engineering-actions">
          <a href="/downloads/benchmark-protocols.mjs" download>
            TLS 复现脚本
          </a>
          <a href="/downloads/benchmark-ssh.mjs" download>
            SSH 复现脚本
          </a>
          <a href="/data/protocol-benchmarks.json" download>
            TLS 原始样本 JSON
          </a>
          <a href="/data/ssh-benchmarks.json" download>
            SSH 原始样本 JSON
          </a>
        </div>
        <p>
          脚本生成测试密钥、证书、配置并在退出时删除；不要导入业务密钥。换机器、版本、链长度、MTU
          或网络条件后需重新测试。
        </p>
      </Section>
      <Section title="待补充的覆盖">
        <p>
          TLCP + PQC 和 IKEv2
          多重交换尚无公开端到端实测。浏览器、系统根证书信任、跨厂商
          SSH、长链证书、NAT-T、弱网、并发负载与降级攻击注入也未覆盖。
        </p>
        <Link href="/protocols">查看各协议的策略与踩坑记录 →</Link>
      </Section>
    </EngineeringPage>
  );
}
