"use client";
import { useEffect, useRef } from "react";
import { useExperience } from "./Motion";

/** One small canvas for the home constellation, pointer wake and antenna pulse. */
export default function QuantumAtmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { enabled } = useExperience();
  useEffect(() => {
    document.documentElement.classList.add("liangzai-home-active");
    return () => document.documentElement.classList.remove("liangzai-home-active");
  }, []);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let width = 1, height = 1, frame = 0, previous = 0;
    const pointer = { x: -1000, y: -1000, shown: false, hover: false };
    const trail: { x: number; y: number; born: number }[] = [];
    const pulses: { x: number; y: number; born: number }[] = [];
    const stars = Array.from({ length: 82 }, (_, i) => ({
      x: ((i * 7919 + 1237) % 10000) / 10000,
      y: ((i * 3571 + 719) % 10000) / 10000,
      r: .65 + (i % 4) * .22,
    }));
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const dpr = Math.min(devicePixelRatio, 1.5);
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!enabled) draw(0);
    };
    function draw(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const [i, star] of stars.entries()) {
        const x = star.x * width, y = star.y * height + (enabled ? Math.sin(now / 4200 + i) * 8 : 0);
        const proximity = pointer.shown ? Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / 180) : 0;
        ctx.fillStyle = `rgba(161,219,255,${.18 + proximity * .7})`;
        ctx.beginPath(); ctx.arc(x, y, star.r + proximity, 0, Math.PI * 2); ctx.fill();
        if (proximity > .15) {
          ctx.strokeStyle = `rgba(111,203,255,${proximity * .2})`;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
      if (pointer.shown) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 230);
        glow.addColorStop(0, "#408ed518"); glow.addColorStop(1, "#408ed500");
        ctx.fillStyle = glow; ctx.fillRect(pointer.x - 230, pointer.y - 230, 460, 460);
        ctx.strokeStyle = "#a6dfff85"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, pointer.hover ? 23 : 14, -.8, 3.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, pointer.hover ? 29 : 20, 2.4, 4.6); ctx.stroke();
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const point = trail[i], life = 1 - (now - point.born) / 420;
        if (life <= 0) { trail.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(127,217,255,${life * .65})`;
        ctx.beginPath(); ctx.arc(point.x, point.y, life * 2, 0, 2 * Math.PI); ctx.fill();
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i], age = (now - pulse.born) / 750;
        if (age >= 1) { pulses.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(143,222,255,${(1 - age) * .7})`;
        ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 12 + age * 100, 0, 2 * Math.PI); ctx.stroke();
      }
    }
    const tick = (now: number) => {
      if (now - previous >= 32) { draw(now); previous = now; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (enabled && !document.hidden) frame = requestAnimationFrame(tick);
      else { pointer.shown = false; trail.length = pulses.length = 0; draw(0); }
    };
    const move = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.shown = true;
      pointer.hover = event.target instanceof Element && Boolean(event.target.closest("a,button,summary"));
      if (trail.length >= 32) trail.shift();
      trail.push({ x: pointer.x, y: pointer.y, born: performance.now() });
    };
    const leave = () => { pointer.shown = false; };
    const press = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      if (pulses.length >= 4) pulses.shift();
      pulses.push({ x: event.clientX, y: event.clientY, born: performance.now() });
    };
    resize(); sync();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);
  return <canvas ref={canvas} className="quantum-atmosphere" aria-hidden="true" />;
}
