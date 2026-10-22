"use client";

import { useEffect, useId, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { useExperience } from "../experience/Motion";
import { createMetalSession } from "./metal-card-session";
import styles from "./FloatingIdentity.module.css";

const STIFFNESS = 120;
const SPRING_DAMPING = 16;
const LIGHT_DAMPING = 12;
const RADIANS = Math.PI / 180;

export default function FloatingIdentity() {
  const goldId = useId();
  const retry = useRef<(() => void) | null>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const failureLabel = useRef<HTMLSpanElement>(null);
  const failureReason = useRef<HTMLParagraphElement>(null);
  const stage = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const wake = useRef<(() => void) | null>(null);
  const { enabled } = useExperience();
  const motion = useRef(enabled);

  useEffect(() => {
    motion.current = enabled;
    if (!enabled) target.current = { x: 0, y: 0 };
    wake.current?.();
  }, [enabled]);

  useEffect(() => {
    const element = stage.current;
    const face = card.current;
    const surface = canvas.current;
    if (!element || !face || !surface) return;
    element.dataset.renderer = "starting";
    element.style.setProperty("--card-scale", String(Math.min(1, element.clientWidth / 460)));
    let frame: number | null = null;
    let destroyed = false;
    let visible = true;
    let previous = 0, nextDraw = 0, elapsed = 0;
    let x = 0, y = 0, vx = 0, vy = 0, light = 0;

    function render(now: number) {
      frame = null;
      if (destroyed || session?.state !== "ready" || !visible || document.hidden) return;
      // Keep the same material on high-refresh displays without submitting
      // hundreds of texture uploads and blur passes every second.
      const interval = 1000 / 60;
      if (nextDraw && now < nextDraw) { requestFrame(); return; }
      nextDraw = now + interval - (nextDraw ? (now - nextDraw) % interval : 0);
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
      previous = now;
      if (motion.current) {
        elapsed += dt;
        const count = Math.ceil(dt / (1 / 120));
        const step = dt / count;
        for (let i = 0; i < count; i++) {
          vx += (STIFFNESS * (target.current.x - x) - SPRING_DAMPING * vx) * step;
          vy += (STIFFNESS * (target.current.y - y) - SPRING_DAMPING * vy) * step;
          x += vx * step;
          y += vy * step;
        }
        light += (y / 16 - light) * (1 - Math.exp(-LIGHT_DAMPING * dt));
      } else {
        x = 0; y = 0; vx = 0; vy = 0; light = 0;
      }
      if (!session.draw(elapsed, x * RADIANS, y * RADIANS, light)) return;
      face!.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      if (element!.dataset.renderer !== "webgl2") element!.dataset.renderer = "webgl2";
      if (motion.current) requestFrame();
    }
    function requestFrame() {
      if (destroyed || session?.state !== "ready" || !visible || document.hidden || frame !== null) return;
      frame = requestAnimationFrame(render);
    }
    function cancelFrame() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = 0;
      nextDraw = 0;
    }
    function fit() {
      element!.style.setProperty("--card-scale", String(Math.min(1, element!.clientWidth / 460)));
      requestFrame();
    }
    function visibility() {
      cancelFrame();
      requestFrame();
    }
    const session: ReturnType<typeof createMetalSession> = createMetalSession(surface, (state, error) => {
      element.dataset.renderer = state;
      if (state !== "ready") cancelFrame();
      if (retryButton.current) retryButton.current.disabled = state === "blocked" || state === "restoring";
      if (state === "ready") { queueMicrotask(requestFrame); return; }
      if (state === "starting") return;
      face.style.removeProperty("transform");
      if (failureLabel.current) failureLabel.current.textContent = state === "blocked"
        ? "浏览器暂时阻止金属反射" : state === "restoring" ? "正在等待浏览器恢复图形渲染" : "金属反射未能启动";
      if (failureReason.current) failureReason.current.textContent = state === "blocked"
        ? `浏览器已阻止此页面继续创建图形上下文。页面内重试无法解除拦截；请完全退出浏览器后重新打开本站。原始错误：${error?.message}`
        : state === "restoring" ? "图形上下文已丢失，绘制已停止。等待浏览器恢复后重建资源，不再创建新的 Canvas。若长期未恢复，请重新打开浏览器。"
        : error?.message ?? "图形渲染未能启动。";
      if (error) console.error("Metal card:", error);
    });
    retry.current = () => { session?.retry(); requestFrame(); };
    const resize = new ResizeObserver(fit);
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelFrame();
      requestFrame();
    });
    intersection.observe(element);
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", visibility);
    wake.current = requestFrame;
    fit();
    return () => {
      destroyed = true;
      wake.current = null;
      retry.current = null;
      cancelFrame();
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("resize", fit);
      document.removeEventListener("visibilitychange", visibility);
      session?.dispose();
    };
  }, []);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!motion.current || event.pointerType !== "mouse") return;
    // Use the untransformed wrapper, so tilt never feeds back into hit geometry.
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const py = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    target.current = { x: -py * 12, y: px * 16 };
  }
  function reset() { target.current = { x: 0, y: 0 }; }

  return (
    <aside data-theme-surface="silver" className={styles.stage} ref={stage} data-intro
      aria-label="Wang Yibiao 的金属个人名片" data-card-format="landscape">
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.scale} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
        <div className={styles.card} ref={card} data-identity-card>
          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
          <div className={styles.content}>
            <svg className={styles.engraving} viewBox="0 0 140 400" fill="none" aria-hidden="true">
              <defs><linearGradient id={goldId} x1="0" y1="0" x2="140" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#77603a" /><stop offset=".22" stopColor="#d1b67d" /><stop offset=".48" stopColor="#917243" /><stop offset=".72" stopColor="#f1deb0" /><stop offset="1" stopColor="#806338" /></linearGradient></defs>
              <g stroke={`url(#${goldId})`} strokeWidth=".7">
                {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M ${36 + i * 4} -20 C ${-64 + i * 7} 82, ${199 - i * 5} 132, ${81 + i * 3} 207 S ${-48 + i * 8} 334, ${84 + i * 4} 420`} />)}
                <path d="M118 0V158M118 242V400" strokeWidth="1" /><path d="M118 179l9 21-9 21-9-21Z" strokeWidth="1" /><path d="M118 190l4 10-4 10-4-10Z" />
              </g>
            </svg>
            <div className={styles.info}>
              <div className={styles.topline}><span className={styles.brand}><i aria-hidden="true" />密码学与工程实践</span></div>
              <div className={styles.identity}><h2>Wang Yibiao</h2><p>抗量子密码与安全协议</p></div>
              <dl className={styles.details}>
                <div><dt>工作</dt><dd>中电信量子集团<span>PQC 与 QKD 融合应用</span></dd></div>
                <div><dt>教育</dt><dd>山东大学<span>网络空间安全 本科与硕士</span></dd></div>
              </dl>
            </div>
            <div className={styles.bottomline}>
              <Link href="/" aria-label="返回 Wang Yibiao 的主页">wangyibiao.com</Link>
              <span className={styles.serial}>0001 2345 6789</span>
              <a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer" aria-label="访问 Wang Yibiao 的 GitHub">GitHub <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className={styles.rim} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.failure} role="status">
        <span ref={failureLabel}>金属反射未能启动</span>
        <button ref={retryButton} type="button" onClick={() => retry.current?.()}>重试</button>
        <details><summary>查看原因</summary><p ref={failureReason} /></details>
      </div>
    </aside>
  );
}
