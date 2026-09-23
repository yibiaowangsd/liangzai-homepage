"use client";
import { useEffect, useRef, useState } from "react";
import { useExperience } from "./Motion";
import type { HeroScene } from "./three/hero-scene";
import "./guardian-3d.css";

export default function InteractiveGuardian() {
  const canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<HeroScene | null>(null);
  const { enabled } = useExperience();
  const motion = useRef(enabled);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [view, setView] = useState("reset");
  useEffect(() => {
    motion.current = enabled;
    runtime.current?.setMotion(enabled);
  }, [enabled]);
  useEffect(() => {
    let alive = true;
    const start = async () => {
      try {
        const { createHeroScene } = await import("./three/hero-scene");
        if (!alive || !canvas.current) return;
        const instance = await createHeroScene(
          canvas.current,
          () => {
            if (alive) setStatus("ready");
          },
          () => {
            if (alive) setStatus("fallback");
          },
        );
        if (!alive) {
          instance.dispose();
          return;
        }
        runtime.current = instance;
        instance.setMotion(motion.current);
      } catch {
        if (alive) setStatus("fallback");
      }
    };
    void start();
    return () => {
      alive = false;
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, []);
  function select(value: "front" | "side" | "back" | "reset") {
    setView(value);
    runtime.current?.setView(value);
  }
  return (
    <div className="guardian-stage" data-status={status}>
      <div className="guardian-atmosphere" aria-hidden="true" />
      <div className="guardian-fallback" aria-hidden="true">
        <img
          src={`/assets/models/liangzai-preview-${view}.webp`}
          alt=""
          fetchPriority="high"
          decoding="async"
          width="900"
          height="900"
        />
      </div>
      <canvas
        ref={canvas}
        className="guardian-canvas"
        tabIndex={status === "ready" ? 0 : -1}
        role="img"
        aria-label={status === "ready" ? "量仔三维模型。拖动可旋转，左右方向键调整角度，回车打招呼。" : "量仔模型预览"}
        aria-keyshortcuts="ArrowLeft ArrowRight Home Enter"
      />
      <div className="guardian-scene-label">
        <span className="guardian-live-dot" /> LIANGZAI
        <span>Q–∞ / EXPLORER</span>
      </div>
      <div className="guardian-controls">
        <div className="guardian-instruction" role="status">
          {status === "ready"
            ? "拖动旋转 · 点击量仔打招呼"
            : status === "fallback"
              ? "选择视角，查看量仔"
              : "量仔正在就位"}
        </div>
        <div className="guardian-actions" aria-label="量仔模型视角">
          {(
            [
              ["front", "正面"],
              ["side", "侧面"],
              ["back", "背面"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              disabled={status === "loading"}
              aria-pressed={view === value}
              onClick={() => select(value)}
            >
              {label}
            </button>
          ))}
          <button
            disabled={status === "loading"}
            onClick={() => select("reset")}
            aria-label="重置量仔模型视角"
          >
            复位
          </button>
          {status !== "fallback" && <button
            className="guardian-hello"
            disabled={status === "loading"}
            onClick={() => runtime.current?.greet()}
          >
            打个招呼<span aria-hidden="true">✳</span>
          </button>}
        </div>
      </div>
    </div>
  );
}
