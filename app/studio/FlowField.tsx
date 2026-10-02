"use client";
import { useEffect, useRef } from "react";
import { useExperience } from "../experience/Motion";
import { createFrameScheduler } from "../experience/three/render-scheduler";

/** A parametric torus knot, drawn as a bounded, interactive ink study. */
export default function FlowField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { enabled } = useExperience();
  useEffect(() => {
    const el = canvas.current,
      ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const curves = Array.from({ length: 27 }, (_, ring) =>
      Array.from({ length: 181 }, (_, i) => {
        const u = (i / 180) * Math.PI * 2,
          v = (ring / 27) * Math.PI * 2,
          r = 1.05 + 0.32 * Math.cos(3 * u) + 0.11 * Math.cos(v);
        return [
          r * Math.cos(2 * u),
          r * Math.sin(2 * u),
          0.48 * Math.sin(3 * u) + 0.11 * Math.sin(v),
        ];
      }),
    );
    let width = 1,
      height = 1,
      visible = false,
      time = 0;
    const pointer = { x: 0, y: 0 },
      target = { x: 0, y: 0 };
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const scheduler = createFrameScheduler({
      requestFrame: (fn) => requestAnimationFrame(fn),
      cancelFrame: (id) => cancelAnimationFrame(id),
      canRender: () => visible && !document.hidden,
      continuous: () => enabled && !lowPower,
      fps: () => 24,
      render: (_now, dt) => {
        if (enabled) time += dt;
        pointer.x += (target.x - pointer.x) * 0.075;
        pointer.y += (target.y - pointer.y) * 0.075;
        const yaw =
            -0.35 +
            (enabled && !lowPower ? time * 0.045 : 0) +
            pointer.x * 0.32,
          pitch = -0.5 + pointer.y * 0.2;
        const cy = Math.cos(yaw),
          sy = Math.sin(yaw),
          cp = Math.cos(pitch),
          sp = Math.sin(pitch),
          scale = Math.min(width * 0.34, height * 0.4);
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 0.85;
        curves.forEach((curve, n) => {
          ctx.beginPath();
          ctx.strokeStyle = n % 4 === 0 ? "#214be4" : "rgba(41,71,207,.46)";
          curve.forEach(([x, y, z], i) => {
            const xx = x * cy - z * sy,
              zz = x * sy + z * cy,
              yy = y * cp - zz * sp,
              depth = y * sp + zz * cp,
              p = 3.8 / (3.8 + depth),
              px = width / 2 + xx * scale * p,
              py = height / 2 + yy * scale * p;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        });
      },
    });
    const resize = () => {
      const b = el.getBoundingClientRect();
      width = b.width;
      height = b.height;
      const dpr = Math.min(
        devicePixelRatio || 1,
        1.5,
        1500 / Math.max(width, 1),
      );
      el.width = Math.max(1, Math.round(width * dpr));
      el.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scheduler.invalidate();
    };
    const move = (e: PointerEvent) => {
      if (!enabled) return;
      const b = el.getBoundingClientRect();
      target.x = (e.clientX - b.left) / b.width - 0.5;
      target.y = (e.clientY - b.top) / b.height - 0.5;
      if (lowPower) {
        pointer.x = target.x;
        pointer.y = target.y;
      }
      scheduler.invalidate();
    };
    const leave = () => {
      target.x = target.y = 0;
      scheduler.invalidate();
    };
    const visibility = () => {
      scheduler.sync();
      scheduler.invalidate();
    };
    const size = new ResizeObserver(resize);
    size.observe(el);
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      scheduler.sync();
      scheduler.invalidate();
    });
    observer.observe(el);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    resize();
    return () => {
      scheduler.dispose();
      size.disconnect();
      observer.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled]);
  return (
    <canvas
      className="studio-flow"
      ref={canvas}
      role="img"
      aria-label="随指针转动的蓝色数学纽结"
    />
  );
}
