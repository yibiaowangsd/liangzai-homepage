"use client";
import { useState } from "react";
import { certificates, certificateModel } from "../../engineering/size-model";
import { Table } from "../../engineering/EngineeringPage";
export default function Comparison() {
  const [chain, setChain] = useState(3),
    [overhead, setOverhead] = useState(256);
  let rows: ReturnType<typeof certificateModel>[] = [],
    error = "";
  try {
    rows = certificates.map((_, i) => certificateModel(i, chain, overhead));
  } catch (e) {
    error = (e as Error).message;
  }
  const max = Math.max(...rows.map((r) => r.chainDer));
  return (
    <>
      <div className="engineering-form">
        <label>
          发送的证书张数
          <input
            type="number"
            min="1"
            max="10"
            value={chain}
            onChange={(e) => setChain(+e.target.value)}
          />
        </label>
        <label>
          每张 DER 元数据及其余编码开销 B
          <input
            type="number"
            min="0"
            max="100000"
            value={overhead}
            onChange={(e) => setOverhead(+e.target.value)}
          />
        </label>
      </div>
      <div aria-live="polite">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <Table
              caption="同算法公钥 / 同算法签发链的估算；单位 B"
              heads={[
                "算法",
                "SPKI 假设",
                "签名",
                "单张 DER",
                "链 DER",
                "Certificate 消息",
              ]}
              rows={rows.map((r, i) => [
                certificates[i].name,
                certificates[i].spki,
                certificates[i].signature,
                r.der,
                r.chainDer,
                r.certificateMessage,
              ])}
            />
            <div className="engineering-grid" style={{ marginTop: 24 }}>
              {rows.map((r, i) => (
                <div key={i}>
                  <p>
                    {certificates[i].name} · {r.chainDer.toLocaleString()} B
                  </p>
                  <span
                    className="engineering-bar"
                    style={{ width: `${(100 * r.chainDer) / max}%` }}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
