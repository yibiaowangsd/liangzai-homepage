"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, useExperience } from "./Motion";
export default function FilmDialog() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { enabled } = useExperience();
  useEffect(() => {
    if (!open) return;
    const d = dialog.current!;
    d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const v = video.current;
    const pause = () => {
      if (document.hidden) v?.pause();
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      v?.pause();
      d.close();
      document.body.style.overflow = prev;
      document.removeEventListener("visibilitychange", pause);
    };
  }, [open]);
  useGSAP(
    () => {
      if (open && enabled)
        gsap.from(dialog.current, {
          autoAlpha: 0,
          y: 32,
          scale: 0.97,
          duration: 0.55,
          ease: "power3.out",
        });
    },
    { scope: dialog, dependencies: [open, enabled], revertOnUpdate: true },
  );
  return (
    <>
      <button
        className="film-launch"
        data-magnetic
        onClick={() => setOpen(true)}
      >
        <span className="play-symbol" aria-hidden="true" />
        <span>
          观看宇宙序章<small>12 SEC / VISUAL FILM</small>
        </span>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="film-dialog"
          aria-labelledby="film-title"
          onCancel={() => setOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="film-titlebar">
            <h2 id="film-title">量子星 · 宇宙序章</h2>
            <button onClick={() => setOpen(false)} aria-label="关闭视频">
              关闭 ×
            </button>
          </div>
          <video
            ref={video}
            controls
            playsInline
            preload="metadata"
            poster="/assets/book-v2/01-peace.webp"
          >
            <source
              src="/assets/cinematic/quantum-prologue-v1.mp4"
              type="video/mp4"
            />
            你的浏览器不支持视频播放。
          </video>
          <div className="film-caption">
            <p>
              从和平，到觉醒，再到并肩守护。
              <br />
              <small>12 秒无声视觉短片 · 点击播放器开始</small>
            </p>
            <Link href="/storybook" onClick={() => setOpen(false)}>
              阅读完整故事
            </Link>
          </div>
        </dialog>
      )}
    </>
  );
}
