"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useExperience } from "../experience/Motion";
import { createFrameScheduler } from "../experience/three/render-scheduler";
import {
  createArtPoints,
  modes,
  type ArtSettings,
  type ArtPoint,
} from "./art-state";
import { defaultArtView, drawArt } from "./art-renderer";

export default function ArtCanvas({
  settings,
  playing = false,
  interactive = false,
  canvasRef,
}: {
  settings: ArtSettings;
  playing?: boolean;
  interactive?: boolean;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(canvasRef, () => canvas.current!, []);
  const { enabled } = useExperience();
  const [unavailable, setUnavailable] = useState(false);
  const scene = useRef<{
    settings: ArtSettings;
    points: ArtPoint[];
    time: number;
    view: { yaw: number; pitch: number };
  } | null>(null);
  useEffect(() => {
    const el = canvas.current,
      ctx = el?.getContext("2d", { alpha: false });
    if (!el || !ctx) {
      const frame = requestAnimationFrame(() => setUnavailable(true));
      return () => cancelAnimationFrame(frame);
    }
    if (scene.current?.settings !== settings)
      scene.current = {
        settings,
        points: createArtPoints(settings.seed),
        time: 0,
        view: { ...defaultArtView },
      };
    const composition = scene.current;
    const points = composition.points;
    let width = 1,
      height = 1,
      visible = false;
    let dragging = false,
      lastX = 0,
      lastY = 0,
      downX = 0,
      downY = 0;
    const view = composition.view;
    const frames = createFrameScheduler({
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (handle) => cancelAnimationFrame(handle),
      canRender: () => visible && !document.hidden,
      continuous: () => playing && enabled,
      fps: () => 30,
      render: (_now, delta) => {
        if (playing && enabled) composition.time += delta;
        drawArt(ctx, width, height, settings, points, composition.time, view);
      },
    });
    const resize = () => {
      const bounds = el.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      // High DPI and giant screens cannot multiply the backing store unboundedly.
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        1800 / width,
        1200 / height,
      );
      const pixelWidth = Math.max(1, Math.round(width * ratio)),
        pixelHeight = Math.max(1, Math.round(height * ratio));
      // Preserve the previous image between parameter updates; assigning width
      // unconditionally clears a canvas even when its dimensions didn't change.
      if (el.width !== pixelWidth) el.width = pixelWidth;
      if (el.height !== pixelHeight) el.height = pixelHeight;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      frames.invalidate();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        frames.sync();
        frames.invalidate();
      },
      { rootMargin: "40px" },
    );
    const size = new ResizeObserver(resize);
    observer.observe(el);
    size.observe(el);
    resize();
    const sync = () => {
      if (document.hidden) dragging = false;
      frames.sync();
      frames.invalidate();
    };
    const down = (event: PointerEvent) => {
      if (!interactive || (event.pointerType === "mouse" && event.button !== 0))
        return;
      dragging = true;
      lastX = downX = event.clientX;
      lastY = downY = event.clientY;
      el.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      view.yaw += (event.clientX - lastX) * 0.006;
      view.pitch = Math.max(
        -0.8,
        Math.min(0.8, view.pitch + (event.clientY - lastY) * 0.004),
      );
      lastX = event.clientX;
      lastY = event.clientY;
      frames.invalidate();
    };
    const up = (event: PointerEvent) => {
      if (
        dragging &&
        Math.hypot(event.clientX - downX, event.clientY - downY) < 6
      ) {
        Object.assign(view, defaultArtView);
        composition.time = 0;
        frames.invalidate();
      }
      dragging = false;
      if (el.hasPointerCapture(event.pointerId))
        el.releasePointerCapture(event.pointerId);
    };
    const cancel = () => {
      dragging = false;
    };
    const key = (event: KeyboardEvent) => {
      if (!interactive) return;
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === "ArrowLeft") view.yaw -= 0.16;
      if (event.key === "ArrowRight") view.yaw += 0.16;
      if (event.key === "ArrowUp")
        view.pitch = Math.max(-0.8, view.pitch - 0.12);
      if (event.key === "ArrowDown")
        view.pitch = Math.min(0.8, view.pitch + 0.12);
      if (event.key === "Home") {
        Object.assign(view, defaultArtView);
        composition.time = 0;
      }
      frames.invalidate();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("lostpointercapture", cancel);
    el.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", sync);
    return () => {
      frames.dispose();
      observer.disconnect();
      size.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("lostpointercapture", cancel);
      el.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [settings, playing, enabled, interactive]);
  return (
    <>
      <canvas
        ref={canvas}
        className="art-canvas"
        tabIndex={interactive ? 0 : undefined}
        role="img"
        aria-label={
          interactive
            ? "生成式光场。拖动或用方向键旋转，轻点或按 Home 复位。"
            : `生成式${modes.find((item) => item.id === settings.mode)!.name}光场`
        }
      />
      {unavailable && (
        <p className="art-fallback" role="status">
          此浏览器暂不支持画布，请换一个浏览器继续创作。
        </p>
      )}
    </>
  );
}
