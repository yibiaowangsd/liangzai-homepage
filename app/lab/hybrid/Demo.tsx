"use client";
import { useEffect, useRef, useState } from "react";
type Step = {
  stage: number;
  title: string;
  detail: string;
  matches?: boolean;
  kemMatches?: boolean;
  x25519Matches?: boolean;
  aliceKeyFingerprint?: string;
  bobKeyFingerprint?: string;
  alicePublic?: string;
  bobPublic?: string;
  kemPublic?: string;
  ciphertext?: string;
  tampered?: boolean;
};
const labels = [
  "生成",
  "Alice → Bob",
  "封装与 X25519",
  "Bob → Alice",
  "解封装",
  "HKDF 核对",
];
export default function Demo() {
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [steps, setSteps] = useState<Step[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [mode, setMode] = useState("normal");
  const dispose = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => dispose(), []);
  const reset = () => {
    dispose();
    setSteps([]);
    setBusy(false);
    setError("");
  };
  const next = () => {
    if (!window.isSecureContext || !crypto.subtle) {
      setError(
        "请在 HTTPS 或 localhost 打开；本实验需要支持 X25519 的 Web Crypto。",
      );
      return;
    }
    setBusy(true);
    setError("");
    if (!worker.current) {
      worker.current = new Worker("/pqc-practice/hybrid-worker.js", {
        type: "module",
      });
      worker.current.onmessage = (event) => {
        if (timer.current) clearTimeout(timer.current);
        setBusy(false);
        if (event.data.error) {
          setError(
            "计算失败：" +
              event.data.error +
              "。请重新开始或检查浏览器 X25519 支持。",
          );
          dispose();
        } else setSteps((previous) => [...previous, event.data.result]);
      };
      worker.current.onerror = () => {
        dispose();
        setBusy(false);
        setError("算法 Worker 加载失败，请检查资源加载后重新开始。");
      };
    }
    timer.current = setTimeout(() => {
      dispose();
      setBusy(false);
      setError("运算超过 30 秒，已终止。请重新开始。");
    }, 30000);
    worker.current.postMessage({ mode });
  };
  const failed = steps.at(-1)?.matches === false;
  return (
    <>
      <label>
        实验条件{" "}
        <select
          aria-label="实验条件"
          value={mode}
          disabled={steps.length > 0 || busy}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="normal">正常交换</option>
          <option value="ciphertext">修改传输密文中的 1 bit</option>
          <option value="context">Bob 使用不同 KDF 上下文</option>
        </select>
      </label>
      <ol className="engineering-progress" aria-label="实验进度">
        {labels.map((s, i) => (
          <li key={s} data-done={steps.length > i}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <ol className="engineering-flow">
        {steps.map((step) => (
          <li key={step.stage}>
            <span>{step.title}</span>
            <div>
              <p>{step.detail}</p>
              {step.alicePublic && (
                <p>
                  <small>
                    Alice / Bob X25519 公钥 SHA-256：
                    <code>{step.alicePublic}</code> /{" "}
                    <code>{step.bobPublic}</code>
                    <br />
                    ML-KEM 公钥 SHA-256：<code>{step.kemPublic}</code>
                  </small>
                </p>
              )}
              {step.ciphertext && (
                <p>
                  <small>
                    密文 SHA-256：<code>{step.ciphertext}</code>
                    {step.tampered && " · 已修改 1 bit"}
                  </small>
                </p>
              )}
              {step.x25519Matches !== undefined && (
                <p>X25519 秘密：{step.x25519Matches ? "一致" : "不一致"}</p>
              )}
              {step.kemMatches !== undefined && (
                <p>
                  ML-KEM 秘密：{step.kemMatches ? "一致" : "不一致（隐式拒绝）"}
                </p>
              )}
              {step.matches !== undefined && (
                <>
                  <strong>
                    {step.matches
                      ? "双方派生密钥一致"
                      : "双方派生密钥不一致，不能建立会话"}
                  </strong>
                  <p>
                    <small>
                      Alice 密钥 SHA-256：
                      <code>{step.aliceKeyFingerprint}</code>
                      <br />
                      Bob 密钥 SHA-256：<code>{step.bobKeyFingerprint}</code>
                    </small>
                  </p>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="engineering-actions">
        <button
          type="button"
          disabled={busy || steps.length === 6 || !!error}
          onClick={next}
        >
          {busy ? "本地计算中…" : steps.length ? "下一步" : "开始本地实验"}
        </button>
        <button type="button" onClick={reset}>
          重新开始并释放 Worker
        </button>
      </div>
      <p role="status" className="engineering-status">
        {error ||
          (steps.length === 6
            ? failed
              ? "篡改实验完成：不一致已被本地核对发现。"
              : "实验完成：双方独立派生得到一致的 32 B 密钥。"
            : "私钥与共享秘密留在 Worker 内，页面只显示公开材料及 SHA-256 指纹。")}
      </p>
    </>
  );
}
