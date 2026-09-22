"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { m, useInView } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Cpu,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useMotionPreference } from "./Motion";
import s from "../QuantumHome.module.css";

const experiments = [
  {
    name: "密钥封装",
    en: "ML-KEM",
    left: "密钥持有方",
    right: "封装方",
    source: "https://csrc.nist.gov/pubs/fips/203/final",
    steps: [
      {
        name: "生成密钥",
        title: "从一对密钥开始。",
        description: "密钥持有方生成封装公钥和解封装私钥。私钥始终留在本地。",
        payload: "KeyGen → (ek, dk)",
        left: "生成公钥与私钥",
        right: "等待公钥",
        direction: "none",
      },
      {
        name: "传递公钥",
        title: "公开的，是公钥。",
        description:
          "将封装公钥交给对方。实际协议还需要认证公钥来源，防止被替换。",
        payload: "encapsulation key · ek",
        left: "保留私钥 dk",
        right: "接收公钥 ek",
        direction: "right",
      },
      {
        name: "封装秘密",
        title: "秘密，不必直接发送。",
        description:
          "封装方使用公钥生成共享秘密 K 和密文 c，将密文返回给密钥持有方。",
        payload: "ciphertext · c",
        left: "接收密文 c",
        right: "Encaps(ek) → (K, c)",
        direction: "left",
      },
      {
        name: "共享建立",
        title: "两端，得到同一个秘密。",
        description:
          "密钥持有方用私钥解封装密文。在正常流程中，两端得到相同的 K，再由协议用于后续密钥派生。",
        payload: "shared secret · K",
        left: "Decaps(dk, c) → K",
        right: "持有共享秘密 K",
        direction: "done",
      },
    ],
  },
  {
    name: "数字签名",
    en: "ML-DSA",
    left: "签名方",
    right: "验证方",
    source: "https://csrc.nist.gov/pubs/fips/204/final",
    steps: [
      {
        name: "生成密钥",
        title: "身份，从密钥开始。",
        description:
          "签名方生成签名私钥和验证公钥。验证方需要通过可信方式确认公钥归属。",
        payload: "KeyGen → (pk, sk)",
        left: "生成签名密钥对",
        right: "可信获取公钥 pk",
        direction: "none",
      },
      {
        name: "签名消息",
        title: "为消息，留下可验证的印记。",
        description:
          "签名方使用私钥对消息生成数字签名。签名用于验证消息，不会把消息变成密文。",
        payload: "Sign(sk, message) → σ",
        left: "使用私钥生成签名",
        right: "准备验证",
        direction: "none",
      },
      {
        name: "传递签名",
        title: "消息与签名，一起抵达。",
        description: "向验证方发送消息和对应签名。私钥不会发送给验证方。",
        payload: "message + signature · σ",
        left: "发送消息与签名",
        right: "接收消息与签名",
        direction: "right",
      },
      {
        name: "验证结果",
        title: "让信任，有迹可循。",
        description:
          "验证方使用公钥检查签名是否有效。验证通过表明消息与签名匹配；签名身份取决于可信的公钥绑定。",
        payload: "Verify(pk, message, σ)",
        left: "私钥保留在本地",
        right: "签名验证通过",
        direction: "done",
      },
    ],
  },
] as const;

export default function QuantumLab() {
  const [kind, setKind] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const { enabled } = useMotionPreference();
  const experiment = experiments[kind];
  const current = experiment.steps[step];

  useEffect(() => {
    if (!playing || !enabled || !inView) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const synchronize = () => {
      clearInterval(interval);
      if (!document.hidden)
        interval = setInterval(() => setStep((value) => (value + 1) % 4), 3800);
    };
    synchronize();
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [playing, enabled, inView]);

  function choose(index: number) {
    setKind(index);
    setStep(0);
    setPlaying(false);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    choose(next);
    document.getElementById(`lab-tab-${next}`)?.focus();
  }
  const LeftIcon = kind === 0 ? KeyRound : Fingerprint;
  return (
    <div ref={ref} className={s.labShell}>
      <div className={s.labToolbar}>
        <div role="tablist" aria-label="选择密码学演示" className={s.labTabs}>
          {experiments.map((item, index) => (
            <button
              key={item.en}
              id={`lab-tab-${index}`}
              role="tab"
              aria-selected={kind === index}
              aria-controls="lab-panel"
              tabIndex={kind === index ? 0 : -1}
              onKeyDown={(event) => keyboard(event, index)}
              onClick={() => choose(index)}
            >
              {index === 0 ? (
                <KeyRound size={15} aria-hidden />
              ) : (
                <Fingerprint size={15} aria-hidden />
              )}
              {item.name}
            </button>
          ))}
        </div>
        <span className={s.labTag}>
          <span />
          {experiment.en} / INTERACTIVE
        </span>
      </div>
      <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${kind}`}>
        <div className={s.network} data-direction={current.direction}>
          <div className={s.endpoint} data-active={step === 0 || step === 3}>
            <div className={s.nodeIcon}>
              <LeftIcon size={25} strokeWidth={1.3} aria-hidden />
            </div>
            <span>ALICE</span>
            <h3>{experiment.left}</h3>
            <code>{current.left}</code>
          </div>
          <div className={s.channel}>
            <div className={s.channelLabel}>
              {current.direction === "none" ? (
                <>
                  <Cpu size={12} aria-hidden />
                  本地运算
                </>
              ) : current.direction === "done" ? (
                <>
                  <ShieldCheck size={12} aria-hidden />
                  {kind === 0 ? "两端结果" : "验证结果"}
                </>
              ) : (
                <>
                  <Radio size={12} aria-hidden />
                  公开信道
                </>
              )}
            </div>
            <div className={s.signalTrack} aria-hidden>
              <i />
              <i />
              {current.direction === "left" ? (
                <ArrowLeft size={17} />
              ) : current.direction === "done" ? (
                <Check size={18} />
              ) : current.direction === "right" ? (
                <ArrowRight size={17} />
              ) : null}
            </div>
            <m.code
              key={`${kind}-${step}`}
              initial={enabled ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: enabled ? 0.35 : 0 }}
            >
              {current.payload}
            </m.code>
            {step === 3 && (
              <span className={s.verified}>
                <ShieldCheck size={13} aria-hidden />
                {kind === 0 ? "共享秘密已建立" : "消息签名已验证"}
              </span>
            )}
          </div>
          <div className={s.endpoint} data-active={step === 2 || step === 3}>
            <div className={s.nodeIcon}>
              {step === 3 ? (
                <ShieldCheck size={25} strokeWidth={1.3} aria-hidden />
              ) : (
                <LockKeyhole size={25} strokeWidth={1.3} aria-hidden />
              )}
            </div>
            <span>BOB</span>
            <h3>{experiment.right}</h3>
            <code>{current.right}</code>
          </div>
        </div>
        <div className={s.labSteps} aria-label="演示步骤">
          {experiment.steps.map((item, index) => (
            <button
              key={item.name}
              aria-pressed={step === index}
              onClick={() => {
                setStep(index);
                setPlaying(false);
              }}
            >
              <span>0{index + 1}</span>
              {item.name}
              <i aria-hidden />
            </button>
          ))}
        </div>
        <div className={s.labDescription}>
          <div
            aria-live={playing && enabled ? "off" : "polite"}
            aria-atomic="true"
          >
            <h3>{current.title}</h3>
            <p>{current.description}</p>
          </div>
          <button
            className={s.playButton}
            disabled={!enabled}
            onClick={() => setPlaying(!playing)}
            title={!enabled ? "已减少动态效果，可手动选择步骤" : undefined}
            aria-pressed={playing}
          >
            {playing ? (
              <Pause size={15} aria-hidden />
            ) : (
              <Play size={15} aria-hidden />
            )}
            {playing ? "暂停演示" : "自动演示"}
          </button>
        </div>
      </div>
      <div className={s.labFootnote}>
        <span>概念可视化 · 不执行真实密码运算</span>
        <a href={experiment.source} target="_blank" rel="noreferrer">
          阅读 NIST 标准
          <ArrowRight size={13} aria-hidden />
        </a>
      </div>
    </div>
  );
}
