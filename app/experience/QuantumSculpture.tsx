"use client";
import { useRef, useState } from "react";
import { gsap, useGSAP, useExperience } from "./Motion";
import { createFrameScheduler } from "./three/render-scheduler";
import {
  createSculptureParticles,
  projectSculptureParticles,
} from "./sculpture-particles";

export default function QuantumSculpture() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState(0);
  const shape = useRef({ mix: 0, x: 0, y: 0 });
  const { enabled } = useExperience();
  const redraw = useRef<(() => void) | null>(null);
  useGSAP(
    () => {
      gsap.to(shape.current, {
        mix: mode,
        duration: enabled ? 1.4 : 0,
        ease: "power3.inOut",
        overwrite: true,
        onUpdate: () => redraw.current?.(),
      });
    },
    { scope: root, dependencies: [mode, enabled] },
  );
  useGSAP(
    () => {
      const node = canvas.current;
      const host = root.current;
      const ctx = node?.getContext("2d");
      if (!node || !host || !ctx) return;
      let width = 1,
        height = 1,
        angle = 0,
        visible = true;
      const pointer = { x: 0, y: 0, active: false, pressed: false };
      const ripples: { x: number; y: number; age: number }[] = [];
      const points = createSculptureParticles();
      function draw(deltaSeconds: number) {
        if (!ctx) return;
        const s = shape.current;
        const dt = Math.min(2, deltaSeconds * 60);
        angle += enabled ? 0.003 * dt : 0;
        ctx.clearRect(0, 0, width, height);
        const radius = Math.min(width, height) * 0.31;
        projectSculptureParticles(
          points,
          s.mix,
          angle + s.x * 0.5,
          0.25 + s.y * 0.4,
        );
        for (const p of points) {
          const perspective = 3.8 / (3.8 - p.z),
            baseX = width / 2 + p.x * radius * perspective,
            baseY = height / 2 + p.y * radius * perspective;
          const d = p,
            dx = baseX + d.ox - pointer.x,
            dy = baseY + d.oy - pointer.y,
            dist = Math.hypot(dx, dy),
            reach = 150;
          const influence = pointer.active ? Math.max(0, 1 - dist / reach) : 0;
          if (enabled) {
            const normal = Math.max(12, dist),
              force = influence * influence * (pointer.pressed ? -8 : 5);
            d.vx +=
              ((dx / normal) * force -
                (dy / normal) * influence * 3 -
                d.ox * 0.018) *
              dt;
            d.vy +=
              ((dy / normal) * force +
                (dx / normal) * influence * 3 -
                d.oy * 0.018) *
              dt;
            for (const ring of ripples) {
              const rx = baseX - ring.x,
                ry = baseY - ring.y,
                rd = Math.max(1, Math.hypot(rx, ry));
              const kick =
                Math.max(0, 1 - Math.abs(rd - ring.age * 7) / 28) *
                (1 - ring.age / 75) *
                2.5;
              d.vx += (rx / rd) * kick * dt;
              d.vy += (ry / rd) * kick * dt;
            }
            d.vx *= Math.pow(0.88, dt);
            d.vy *= Math.pow(0.88, dt);
            d.ox += d.vx * dt;
            d.oy += d.vy * dt;
          }
          const px = baseX + d.ox,
            py = baseY + d.oy;
          if (influence > 0.25) {
            ctx.strokeStyle = `rgba(112,211,255,${influence * 0.35})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(px - d.vx * 3, py - d.vy * 3);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          ctx.fillStyle = `rgba(${influence > 0.25 ? "218,246,255" : "170,218,255"},${Math.min(1, 0.18 + (p.z + 1) * 0.36 + influence * 0.45)})`;
          ctx.beginPath();
          ctx.arc(
            px,
            py,
            (1.1 + influence * 2.2) * perspective,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        if (enabled && pointer.active) {
          const halo = ctx.createRadialGradient(
            pointer.x,
            pointer.y,
            0,
            pointer.x,
            pointer.y,
            150,
          );
          halo.addColorStop(0, "rgba(117,211,255,.17)");
          halo.addColorStop(1, "rgba(117,211,255,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
          ctx.strokeStyle = "rgba(178,233,255,.65)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(
            pointer.x,
            pointer.y,
            pointer.pressed ? 12 : 22,
            angle * 8,
            angle * 8 + Math.PI * 1.6,
          );
          ctx.stroke();
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          const ring = ripples[i];
          if (enabled) ring.age += dt;
          if (ring.age >= 75) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(157,225,255,${(1 - ring.age / 75) * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.age * 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const resize = () => {
        const b = host.getBoundingClientRect();
        if (Math.abs(b.width - width) < 0.5 && node.width > 1) return;
        width = b.width;
        height = Math.min(b.width * 0.85, 540);
        const dpr = Math.min(window.devicePixelRatio, 1.6);
        node.width = width * dpr;
        node.height = height * dpr;
        node.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        frames.invalidate();
      };
      const frames = createFrameScheduler({
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (handle) => cancelAnimationFrame(handle),
        canRender: () => visible && !document.hidden,
        continuous: () => enabled,
        fps: () =>
          pointer.active || ripples.length > 0 || gsap.isTweening(shape.current)
            ? 60
            : 30,
        render: (_now, delta) => draw(delta),
      });
      const sync = () => {
        if (!visible || document.hidden) {
          pointer.active = false;
          pointer.pressed = false;
        }
        frames.sync();
        frames.invalidate();
      };
      redraw.current = () => frames.invalidate();
      // Reduced motion draws only on resize or an explicit shape selection.
      const xTo = gsap.quickTo(shape.current, "x", {
        duration: 0.9,
        ease: "power3.out",
      });
      const yTo = gsap.quickTo(shape.current, "y", {
        duration: 0.9,
        ease: "power3.out",
      });
      const move = (e: PointerEvent) => {
        if (!enabled || e.pointerType !== "mouse") return;
        const b = node.getBoundingClientRect();
        pointer.x = e.clientX - b.left;
        pointer.y = e.clientY - b.top;
        pointer.active = true;
        xTo((e.clientX - b.left) / b.width - 0.5);
        yTo((e.clientY - b.top) / b.height - 0.5);
      };
      const leave = () => {
        pointer.active = false;
        pointer.pressed = false;
        xTo(0);
        yTo(0);
      };
      const down = (e: PointerEvent) => {
        if (!enabled || e.button !== 0) return;
        move(e);
        pointer.pressed = true;
        ripples.push({ x: pointer.x, y: pointer.y, age: 0 });
        if (ripples.length > 6) ripples.shift();
      };
      const up = () => {
        pointer.pressed = false;
      };
      const key = (e: KeyboardEvent) => {
        if (enabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          ripples.push({ x: width / 2, y: height / 2, age: 0 });
          if (ripples.length > 6) ripples.shift();
        }
      };
      const observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          sync();
        },
        { threshold: 0.05 },
      );
      observer.observe(host);
      let resizeFrame = 0;
      resize();
      const size = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(resize);
      });
      size.observe(host);
      sync();
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerleave", leave);
      node.addEventListener("pointerdown", down);
      node.addEventListener("keydown", key);
      window.addEventListener("pointerup", up);
      document.addEventListener("visibilitychange", sync);
      return () => {
        redraw.current = null;
        cancelAnimationFrame(resizeFrame);
        size.disconnect();
        observer.disconnect();
        frames.dispose();
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerleave", leave);
        node.removeEventListener("pointerdown", down);
        node.removeEventListener("keydown", key);
        window.removeEventListener("pointerup", up);
        xTo.tween.kill();
        yTo.tween.kill();
        document.removeEventListener("visibilitychange", sync);
      };
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
  return (
    <div className="sculpture" ref={root}>
      <div className="sculpture-top">
        <span>FIELD / 00{mode + 1}</span>
        <span>LIVE EXPLORATION</span>
      </div>
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-keyshortcuts="Enter Space"
        aria-label={
          ["球形量子粒子场", "环形量子粒子场", "波动态量子粒子场"][mode]
        }
        role="img"
      />
      <div className="sculpture-controls" aria-label="选择粒子形态">
        {["星球", "光环", "波动"].map((label, i) => (
          <button
            key={label}
            aria-pressed={mode === i}
            onClick={() => setMode(i)}
          >
            <small>0{i + 1}</small>
            {label}
          </button>
        ))}
      </div>
      <p>移动产生旋涡 · 按住聚拢 · 点击释放冲击波（键盘 Enter 同样可用）</p>
    </div>
  );
}
