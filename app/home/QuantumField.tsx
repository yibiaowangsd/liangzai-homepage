"use client";

import { useEffect, useRef } from "react";
import { useMotionPreference } from "./Motion";
import s from "../QuantumHome.module.css";

type Point = {
  x: number;
  y: number;
  z: number;
  brightness: number;
  hue: number;
};

/** A projected particle sculpture. No WebGL context or external render engine. */
export default function QuantumField({ mode }: { mode: "orbit" | "sphere" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { enabled } = useMotionPreference();
  const targetMode = useRef(mode);
  const staticMode = enabled ? null : mode;
  useEffect(() => {
    targetMode.current = mode;
  }, [mode]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d", { alpha: true });
    if (!element || !ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      last = 0,
      elapsed = 0;
    let visible = true,
      blend = targetMode.current === "sphere" ? 1 : 0;
    let pointerX = 0,
      pointerY = 0,
      easedX = 0,
      easedY = 0;
    let points: Point[] = [];
    const mobile = window.matchMedia("(max-width: 760px)");
    const context = ctx;
    const surface = element;

    function paint() {
      context.clearRect(0, 0, width, height);
      const radius = Math.min(width * 0.36, height * 0.38);
      const centerX = width * 0.5,
        centerY = height * 0.49;
      const angle = 0.3 + Math.sin(elapsed * 0.00008) * 0.42 + easedX * 0.3;
      const tilt = -0.45 + easedY * 0.12;
      const ca = Math.cos(angle),
        sa = Math.sin(angle),
        ct = Math.cos(tilt),
        st = Math.sin(tilt);
      points = [];
      const rings = mobile.matches ? 48 : 84,
        segments = mobile.matches ? 22 : 34;
      for (let i = 0; i < rings; i++) {
        const u = (i / rings) * Math.PI * 2;
        for (let j = 0; j < segments; j++) {
          const v = (j / segments) * Math.PI * 2;
          const twist = v + u * 2 + elapsed * 0.00008;
          const r = 0.84 + 0.22 * Math.cos(twist);
          const tx = r * Math.cos(u),
            ty = r * Math.sin(u),
            tz = 0.32 * Math.sin(twist);
          const latitude = Math.acos(
            1 - 2 * ((i * segments + j + 0.5) / (rings * segments)),
          );
          const longitude = (i * segments + j) * 2.3999632297;
          const sx = Math.sin(latitude) * Math.cos(longitude),
            sy = Math.cos(latitude),
            sz = Math.sin(latitude) * Math.sin(longitude);
          const x = tx * (1 - blend) + sx * blend;
          const y = ty * (1 - blend) + sy * blend;
          const z = tz * (1 - blend) + sz * blend;
          const rx = x * ca - z * sa,
            rz = x * sa + z * ca;
          const ry = y * ct - rz * st,
            depth = y * st + rz * ct;
          const perspective = 3.8 / (3.8 - depth);
          points.push({
            x: centerX + rx * radius * perspective,
            y: centerY + ry * radius * perspective,
            z: depth,
            brightness: 0.3 + ((depth + 1.25) / 2.5) * 0.7,
            hue: 186 + (i / rings) * 48,
          });
        }
      }
      // A fine mesh reveals the continuous surface, without a large glow layer.
      if (blend < 0.9) {
        context.lineWidth = 0.55;
        for (let i = 0; i < rings; i++) {
          for (let j = 0; j < segments; j += 2) {
            const a = points[i * segments + j];
            const b = points[((i + 1) % rings) * segments + j];
            context.strokeStyle = `rgba(129,194,240,${(0.07 + a.brightness * 0.13) * (1 - blend)})`;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
      // Depth sorting makes the silhouette read as a sculptural volume.
      points.sort((a, b) => a.z - b.z);
      for (const point of points) {
        context.fillStyle = `hsla(${point.hue},85%,${64 + point.brightness * 20}%,${point.brightness * 0.82})`;
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          (mobile.matches ? 0.75 : 0.9) + point.brightness * 0.85,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      // Fine orbit trails sit behind the main field, with moving signal heads.
      for (let orbit = 0; orbit < 3; orbit++) {
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-0.42 + orbit * 1.02 + easedX * 0.045);
        context.strokeStyle = `rgba(136,185,237,${0.16 - orbit * 0.025})`;
        context.lineWidth = 0.7;
        context.beginPath();
        context.ellipse(
          0,
          0,
          radius * (1.36 + orbit * 0.065),
          radius * 0.48,
          0,
          0,
          Math.PI * 2,
        );
        context.stroke();
        const t = elapsed * 0.0002 + orbit * 2.1;
        const px = Math.cos(t) * radius * (1.36 + orbit * 0.065),
          py = Math.sin(t) * radius * 0.48;
        const glow = context.createRadialGradient(px, py, 0, px, py, 13);
        glow.addColorStop(0, "#d7f5ff");
        glow.addColorStop(0.15, "#7dcaff");
        glow.addColorStop(1, "#71bcff00");
        context.fillStyle = glow;
        context.fillRect(px - 13, py - 13, 26, 26);
        context.restore();
      }
      // Sparse deterministic stars avoid hydration randomness and particle noise.
      for (let n = 0; n < 36; n++) {
        const x = (((Math.sin(n * 127.1) * 43758.5453) % 1) + 1) % 1;
        const y = (((Math.sin(n * 269.5) * 43758.5453) % 1) + 1) % 1;
        const alpha = 0.14 + (Math.sin(elapsed * 0.0005 + n) + 1) * 0.14;
        context.fillStyle = `rgba(187,217,246,${alpha})`;
        context.fillRect(
          x * width,
          y * height,
          n % 7 === 0 ? 2 : 1,
          n % 7 === 0 ? 2 : 1,
        );
      }
    }

    function tick(now: number) {
      if (!visible || document.hidden || !enabled) {
        frame = 0;
        return;
      }
      if (now - last >= 1000 / 30) {
        elapsed += Math.min(now - (last || now), 60);
        last = now;
        easedX += (pointerX - easedX) * 0.06;
        easedY += (pointerY - easedY) * 0.06;
        blend += ((targetMode.current === "sphere" ? 1 : 0) - blend) * 0.055;
        paint();
      }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      if (enabled && visible && !document.hidden && !frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    function resize() {
      const rect = surface.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const rect = surface.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    }
    function leave() {
      pointerX = 0;
      pointerY = 0;
    }
    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else resume();
      },
      { rootMargin: "80px" },
    );
    resizeObserver.observe(surface);
    intersection.observe(surface);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", resume);
    resize();
    resume();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled, staticMode]);

  return <canvas ref={canvas} className={s.quantumCanvas} aria-hidden="true" />;
}
