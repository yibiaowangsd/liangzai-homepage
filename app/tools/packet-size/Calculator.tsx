"use client";
import { useState } from "react";
import {
  groups,
  certificates,
  packetModel,
} from "../../engineering/size-model";
import { Table } from "../../engineering/EngineeringPage";
export default function Calculator() {
  const [input, setInput] = useState({
    group: 2,
    baseline: 200,
    certificate: 3,
    chain: 3,
    overhead: 256,
    mtu: 1500,
    ipv6: false,
    natT: true,
    ikeBytes: 6000,
  });
  let result: ReturnType<typeof packetModel> | undefined,
    error = "";
  try {
    result = packetModel(input);
  } catch (e) {
    error = (e as Error).message;
  }
  const number = (
    key: "baseline" | "chain" | "overhead" | "mtu" | "ikeBytes",
    title: string,
    min: number,
    max: number,
  ) => (
    <label>
      {title}
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        value={input[key]}
        onChange={(e) => setInput({ ...input, [key]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <>
      <div className="engineering-form">
        <label>
          协商组
          <select
            value={input.group}
            onChange={(e) => setInput({ ...input, group: +e.target.value })}
          >
            {groups.map((g, i) => (
              <option key={g.name} value={i}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          证书公钥与签名算法
          <select
            value={input.certificate}
            onChange={(e) =>
              setInput({ ...input, certificate: +e.target.value })
            }
          >
            {certificates.map((c, i) => (
              <option key={c.name} value={i}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {number(
          "baseline",
          "ClientHello 基础长度 B（不含 key_share，含 4 B 握手头）",
          50,
          60000,
        )}
        {number("chain", "发送的证书张数（通常不含根证书）", 1, 10)}
        {number("overhead", "单张 DER 元数据及其余 ASN.1 开销 B", 0, 100000)}
        {number("mtu", "路径 MTU B", 256, 9000)}
        {number("ikeBytes", "待分片 IKE 加密明文 B", 0, 10000000)}
        <label>
          IP 版本
          <select
            value={input.ipv6 ? "6" : "4"}
            onChange={(e) =>
              setInput({ ...input, ipv6: e.target.value === "6" })
            }
          >
            <option value="4">IPv4</option>
            <option value="6">IPv6</option>
          </select>
        </label>
        <label>
          NAT-T non-ESP marker
          <select
            value={input.natT ? "yes" : "no"}
            onChange={(e) =>
              setInput({ ...input, natT: e.target.value === "yes" })
            }
          >
            <option value="yes">计入 4 B</option>
            <option value="no">不计入</option>
          </select>
        </label>
      </div>
      <div aria-live="polite">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          result && (
            <Table
              caption="尺寸模型结果；单位 B，分片数除外"
              heads={["项目", "结果"]}
              rows={[
                ["ClientHello 握手消息", result.hello],
                ["ClientHello + TLS 记录头", result.recordBytes],
                ["服务端 key_exchange 裸材料", result.serverKeyExchange],
                ["证书链 DER 合计", result.chainDer],
                ["TLS Certificate 握手消息", result.certificateMessage],
                ["TLS CertificateVerify 握手消息", result.certificateVerify],
                ["IKE 每片头部 / IV / 标签开销", result.ikeOverhead],
                ["IKE 每片有效明文上限", result.ikeCapacity],
                ["IKE 加密分片数估算", result.ikeFragments],
              ]}
            />
          )
        )}
      </div>
    </>
  );
}
