"use client";

import { useEffect, useRef, useState } from "react";

type Step = "idle" | "loading" | "generate" | "encapsulate" | "decapsulate" | "done" | "error";
type Measurement = { bytes: number; ms: number };
type Results = { generate?: Measurement; encapsulate?: Measurement; decapsulate?: Measurement; preview?: string };
type Operations = {
  generate: { publicKey: Uint8Array; privateKey: Uint8Array; ms: number };
  encapsulate: { ciphertext: Uint8Array; sharedSecret: Uint8Array; ms: number };
  decapsulate: { sharedSecret: Uint8Array; ms: number };
};
const labels: Record<Step, string> = {
  idle: "等待运行 · 显示标准参数尺寸",
  loading: "正在加载 WASM 实现…",
  generate: "01 / 生成接收方密钥…",
  encapsulate: "02 / 发送方封装共享秘密…",
  decapsulate: "03 / 接收方解封装并比对…",
  done: "验证通过 · 双方 32 B 共享秘密一致",
  error: "本次运行未完成，可以重试",
};

export default function HandshakeDemo() {
  const [step, setStep] = useState<Step>("idle");
  const [results, setResults] = useState<Results>({});
  const [error, setError] = useState("");
  const active = useRef<{ worker: Worker; cancel: () => void } | null>(null);
  const mounted = useRef(true);
  const busy = !["idle", "done", "error"].includes(step);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; active.current?.cancel(); };
  }, []);

  async function run() {
    if (active.current) return;
    setResults({}); setError(""); setStep("loading");
    let worker: Worker | undefined;
    let rejectPending: ((error: Error) => void) | undefined;
    const sensitive: Uint8Array[] = [];
    try {
      worker = new Worker("/pqc-practice/worker.js", { type: "module" });
      const client = worker;
      active.current = { worker, cancel: () => { rejectPending?.(new Error("实验已取消")); client.terminate(); } };
      let requestId = 0;
      function request<T>(type: string, payload: Record<string, Uint8Array> = {}): Promise<T> {
        return new Promise((resolve, reject) => {
          const id = ++requestId;
          const cleanup = () => { clearTimeout(timer); client.onmessage = null; client.onerror = null; client.onmessageerror = null; rejectPending = undefined; };
          const fail = (reason: Error) => { cleanup(); reject(reason); };
          const timer = setTimeout(() => fail(new Error("加载或运算超时，请检查网络后重试。")), 20000);
          rejectPending = fail;
          client.onerror = event => { event.preventDefault(); fail(new Error("无法加载密码模块，请刷新页面后重试。")); };
          client.onmessageerror = () => fail(new Error("无法读取运算结果，请重试。"));
          client.onmessage = ({ data }) => {
            if (data.requestId !== id) return;
            if (data.type === "error") { fail(new Error(data.message || "密码运算失败。")); return; }
            if (data.type === "result") { cleanup(); resolve(data.result as T); }
          };
          try { client.postMessage({ type, requestId: id, library: "nist", family: "mlkem", variant: "768", hash: "shake", ...payload }); }
          catch { fail(new Error("无法启动实验，请刷新后重试。")); }
        });
      }
      await request("describe");
      if (!mounted.current) return;
      setStep("generate");
      const keys = await request<Operations["generate"]>("generate");
      sensitive.push(keys.privateKey);
      if (!mounted.current) return;
      setResults({ generate: { bytes: keys.publicKey.length, ms: keys.ms }, preview: Array.from(keys.publicKey.slice(0, 8), b => b.toString(16).padStart(2, "0")).join(" ") });
      setStep("encapsulate");
      const encapsulated = await request<Operations["encapsulate"]>("encapsulate", { publicKey: keys.publicKey });
      sensitive.push(encapsulated.sharedSecret);
      if (!mounted.current) return;
      setResults(value => ({ ...value, encapsulate: { bytes: encapsulated.ciphertext.length, ms: encapsulated.ms } }));
      setStep("decapsulate");
      const decapsulated = await request<Operations["decapsulate"]>("decapsulate", { privateKey: keys.privateKey, publicKey: keys.publicKey, ciphertext: encapsulated.ciphertext });
      sensitive.push(decapsulated.sharedSecret);
      if (keys.publicKey.length !== 1184 || encapsulated.ciphertext.length !== 1088 || decapsulated.sharedSecret.length !== 32 || encapsulated.sharedSecret.length !== 32 || !encapsulated.sharedSecret.every((byte, index) => byte === decapsulated.sharedSecret[index])) throw new Error("结果校验失败，请进入完整实验室检查。");
      if (!mounted.current) return;
      setResults(value => ({ ...value, decapsulate: { bytes: decapsulated.sharedSecret.length, ms: decapsulated.ms } }));
      setStep("done");
    } catch (cause) {
      if (mounted.current) { setStep("error"); setError(cause instanceof Error ? cause.message : "运行失败，请重试。"); }
    } finally {
      sensitive.forEach(bytes => bytes.fill(0));
      worker?.terminate();
      active.current = null;
    }
  }

  return <div className="handshake-panel" aria-labelledby="handshake-title" aria-busy={busy}>
    <div className="handshake-heading"><span className="handshake-indicator" aria-hidden="true" /><span>LOCAL / WASM</span><span>FIPS 203</span></div>
    <h2 id="handshake-title">验证一次密钥封装</h2>
    <p className="handshake-algorithm">ML-KEM-768 <span>浏览器本地运算</span></p>
    <ol className="handshake-steps">
      {([
        ["generate", "密钥生成", "接收方 → 公钥", 1184],
        ["encapsulate", "封装", "发送方 → 密文", 1088],
        ["decapsulate", "解封装", "双方 → 共享秘密", 32],
      ] as const).map(([id, name, description, bytes], index) => <li key={id} data-active={step === id} data-complete={!!results[id]}>
        <span className="handshake-number" aria-hidden="true">{results[id] ? "✓" : `0${index + 1}`}</span>
        <div><strong>{name}</strong><small>{description}</small></div>
        <div className="handshake-measure"><strong>{(results[id]?.bytes ?? bytes).toLocaleString("en-US")} B</strong><small>{results[id] ? `${results[id].ms.toFixed(2)} ms` : "— ms"}</small></div>
      </li>)}
    </ol>
    <p className="handshake-preview"><span>PK[0:8]</span><code>{results.preview || "·· ·· ·· ·· ·· ·· ·· ··"}</code></p>
    <div className="handshake-status" role="status" aria-live="polite" aria-atomic="true">{labels[step]}{error && <span>{error}</span>}</div>
    <button className="handshake-run" type="button" onClick={run} disabled={busy}>{busy ? "运算中…" : step === "done" ? "再运行一次" : step === "error" ? "重试实验" : "运行 ML-KEM 实验"}<span aria-hidden="true">↗</span></button>
    <p className="handshake-note">耗时为本机单次算法运算，不含加载和网络传输；这是 KEM 往返，不是完整协议握手。</p>
    <noscript><p className="handshake-note">启用 JavaScript 后可运行实验；上方尺寸为 ML-KEM-768 标准参数。</p></noscript>
  </div>;
}
