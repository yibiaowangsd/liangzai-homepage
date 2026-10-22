"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { useExperience } from "../experience/Motion";
import { createMetalRenderer } from "./metal-card-renderer";
import styles from "./FloatingIdentity.module.css";

const STIFFNESS = 120;
const SPRING_DAMPING = 16;
const LIGHT_DAMPING = 12;
const RADIANS = Math.PI / 180;

export default function FloatingIdentity() {
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
    element.style.setProperty("--card-scale", String(Math.min(1, element.clientWidth / 360)));
    let renderer: ReturnType<typeof createMetalRenderer>;
    let frame: number | null = null;
    let destroyed = false;
    let failed = false;
    let visible = true;
    let previous = 0;
    let elapsed = 0;
    let x = 0, y = 0, vx = 0, vy = 0, light = 0;
    let stopObserving = () => surface.removeEventListener("webglcontextlost", unavailable);

    function unavailable() {
      failed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      stopObserving();
      wake.current = null;
      renderer?.dispose();
      face!.style.removeProperty("transform");
      element!.dataset.renderer = "unavailable";
    }
    function render(now: number) {
      frame = null;
      if (destroyed || failed || !visible || document.hidden) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
      previous = now;
      if (motion.current) {
        elapsed += dt;
        // Substeps keep the 120/16 spring stable at low frame rates.
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
      // There is no CSS transition or independent tilt: both consume this angle.
      face!.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      try {
        renderer.render(elapsed, x * RADIANS, y * RADIANS, light);
      } catch (error) {
        console.error("Metal card rendering stopped:", error);
        unavailable();
        return;
      }
      if (motion.current) frame = requestAnimationFrame(render);
    }
    function requestFrame() {
      if (destroyed || failed || !visible || document.hidden || frame !== null) return;
      frame = requestAnimationFrame(render);
    }
    function fit() {
      element!.style.setProperty("--card-scale", String(Math.min(1, element!.clientWidth / 360)));
      requestFrame();
    }
    function visibility() {
      previous = 0;
      if (document.hidden && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      requestFrame();
    }
    surface.addEventListener("webglcontextlost", unavailable);
    try {
      renderer = createMetalRenderer(surface);
      element.dataset.renderer = "webgl2";
    } catch (error) {
      console.error("Metal card initialization stopped:", error);
      unavailable();
      return () => {
        destroyed = true;
        stopObserving();
      };
    }
    const resize = new ResizeObserver(fit);
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previous = 0;
      if (!visible && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      requestFrame();
    });
    intersection.observe(element);
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", visibility);
    stopObserving = () => {
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("resize", fit);
      document.removeEventListener("visibilitychange", visibility);
      surface.removeEventListener("webglcontextlost", unavailable);
    };
    wake.current = requestFrame;
    fit();
    return () => {
      destroyed = true;
      wake.current = null;
      if (frame !== null) cancelAnimationFrame(frame);
      stopObserving();
      renderer.dispose();
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
      aria-label="Wang Yibiao 的金属个人名片">
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.scale} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
        <div className={styles.card} ref={card} data-identity-card>
          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
          <div className={styles.content}>
            <div className={styles.topline}><span className={styles.brand}><i aria-hidden="true" />私人档案 / 001</span><span className={styles.mark} aria-hidden="true">WY</span></div>
            <div className={styles.pass}><p>反射通行证</p><span>REFLECTION PASS</span></div>
            <div className={styles.identity}><h2>Wang<br />Yibiao<span aria-hidden="true">®</span></h2><p>抗量子密码与安全协议</p></div>
            <dl className={styles.details}>
              <div><dt>工作</dt><dd>中电信量子集团<span>PQC 与 QKD 融合应用</span></dd></div>
              <div><dt>教育</dt><dd>山东大学<span>网络空间安全 本科与硕士</span></dd></div>
            </dl>
            <div className={styles.serial}><span>持有人编号 / CARD NO.</span><p>0001 2345 6789</p></div>
            <div className={styles.bottomline}>
              <Link href="/" aria-label="返回 Wang Yibiao 的主页">wangyibiao.com</Link>
              <a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer" aria-label="访问 Wang Yibiao 的 GitHub">GitHub <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className={styles.rim} aria-hidden="true" />
        </div>
      </div>
      <span className={styles.caption} aria-hidden="true">移动指针 · 让光掠过</span>
    </aside>
  );
}
