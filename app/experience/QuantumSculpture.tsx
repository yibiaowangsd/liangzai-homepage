"use client";
import { useRef, useState } from "react";
import { gsap, useGSAP, useExperience } from "./Motion";

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
        visible = true,
        attached = false;
      const dots = Array.from({ length: 780 }, (_, i) => {
        const t = i / 780,
          phi = Math.acos(1 - 2 * t),
          theta = Math.PI * (1 + Math.sqrt(5)) * i;
        return {
          sx: Math.sin(phi) * Math.cos(theta),
          sy: Math.cos(phi),
          sz: Math.sin(phi) * Math.sin(theta),
          a: (i / 780) * Math.PI * 14,
          b: (i / 780) * Math.PI * 68,
        };
      });
      function draw() {
        if (!ctx) return;
        const s = shape.current;
        angle += enabled ? 0.003 : 0;
        ctx.clearRect(0, 0, width, height);
        const radius = Math.min(width, height) * 0.31;
        const points = dots
          .map((p) => {
            const tx = (0.74 + 0.25 * Math.cos(p.b)) * Math.cos(p.a),
              ty = 0.25 * Math.sin(p.b),
              tz = (0.74 + 0.25 * Math.cos(p.b)) * Math.sin(p.a);
            const waveX = Math.cos(p.a) * 0.8,
              waveY = Math.sin(p.a * 1.4) * 0.28,
              waveZ = (p.a / (Math.PI * 14) - 0.5) * 2;
            const blend = s.mix <= 1 ? s.mix : s.mix - 1;
            const x =
              s.mix <= 1
                ? p.sx * (1 - blend) + tx * blend
                : tx * (1 - blend) + waveX * blend;
            const y =
              s.mix <= 1
                ? p.sy * (1 - blend) + ty * blend
                : ty * (1 - blend) + waveY * blend;
            const z =
              s.mix <= 1
                ? p.sz * (1 - blend) + tz * blend
                : tz * (1 - blend) + waveZ * blend;
            const a = angle + s.x * 0.5,
              b = 0.25 + s.y * 0.4;
            const xx = x * Math.cos(a) - z * Math.sin(a),
              zz = x * Math.sin(a) + z * Math.cos(a);
            return {
              x: xx,
              y: y * Math.cos(b) - zz * Math.sin(b),
              z: y * Math.sin(b) + zz * Math.cos(b),
            };
          })
          .sort((a, b) => a.z - b.z);
        for (const p of points) {
          const perspective = 3.8 / (3.8 - p.z),
            alpha = 0.18 + (p.z + 1) * 0.36;
          ctx.fillStyle = `rgba(170,218,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(
            width / 2 + p.x * radius * perspective,
            height / 2 + p.y * radius * perspective,
            1.05 * perspective,
            0,
            Math.PI * 2,
          );
          ctx.fill();
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
        draw();
      };
      const tick = () => draw();
      const sync = () => {
        const shouldRun = enabled && visible && !document.hidden;
        if (shouldRun && !attached) {
          gsap.ticker.add(tick);
          attached = true;
        }
        if (!shouldRun && attached) {
          gsap.ticker.remove(tick);
          attached = false;
        }
      };
      redraw.current = draw;
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
        const b = host.getBoundingClientRect();
        xTo((e.clientX - b.left) / b.width - 0.5);
        yTo((e.clientY - b.top) / b.height - 0.5);
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
      host.addEventListener("pointermove", move);
      document.addEventListener("visibilitychange", sync);
      return () => {
        redraw.current = null;
        cancelAnimationFrame(resizeFrame);
        size.disconnect();
        observer.disconnect();
        gsap.ticker.remove(tick);
        host.removeEventListener("pointermove", move);
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
      <p>选择一种形态，让好奇心改变眼前的世界。</p>
    </div>
  );
}
