"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pages, narrationTracks } from "./storyData";
import { gsap, useGSAP, useExperience } from "../experience/Motion";
import "./cinema-reader.css";

export default function StoryBook() {
  const [current, setCurrent] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(false),
    [contents, setContents] = useState(false);
  const root = useRef<HTMLElement>(null),
    audio = useRef<HTMLAudioElement>(null),
    direction = useRef(1),
    touch = useRef<number | null>(null),
    resume = useRef(false),
    tocButton = useRef<HTMLButtonElement>(null);
  const { enabled } = useExperience();
  const page = pages[current];
  const turn = useCallback(
    (next: number, continuous = false) => {
      if (next < 0 || next >= pages.length || next === current) return;
      direction.current = next > current ? 1 : -1;
      resume.current = continuous;
      audio.current?.pause();
      setPlaying(false);
      setError(false);
      setCurrent(next);
    },
    [current],
  );
  useGSAP(
    () => {
      if (!enabled) return;
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".reader-image", { scale: 1.06, autoAlpha: 0, duration: 1.1 }, 0)
        .from(
          ".reader-copy > *",
          {
            y: direction.current * 22,
            autoAlpha: 0,
            stagger: 0.07,
            duration: 0.7,
          },
          0.12,
        );
    },
    { scope: root, dependencies: [current, enabled], revertOnUpdate: true },
  );
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.load();
    if (resume.current) {
      resume.current = false;
      void a.play().catch(() => setError(true));
    }
  }, [current]);
  useEffect(() => {
    const a = audio.current;
    const pause = () => {
      if (document.hidden) a?.pause();
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      a?.pause();
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.closest("button,a,input,textarea,select,video,audio") ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        turn(current + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turn(current - 1);
      }
      if (e.key === "Escape") setContents(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [current, turn]);
  const toggleAudio = () => {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else void audio.current.play().catch(() => setError(true));
  };
  return (
    <main
      ref={root}
      id="main-content"
      className="cinema-reader"
      data-tone={page.tone}
    >
      <audio
        ref={audio}
        src={narrationTracks[current]}
        preload="none"
        onPlay={() => {
          setPlaying(true);
          setError(false);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError(true);
        }}
        onEnded={() => {
          setPlaying(false);
          if (current < pages.length - 1) turn(current + 1, true);
        }}
      />
      <div className="reader-bar">
        <Link href="/" className="reader-back">
          LIANGZAI / 量子星守护者
        </Link>
        <span>INTERACTIVE STORY · 约 5 分钟</span>
        <button
          ref={tocButton}
          aria-expanded={contents}
          aria-controls="story-contents"
          onClick={() => setContents(!contents)}
        >
          {contents ? "收起章节" : "章节目录"}
          <i aria-hidden="true">{contents ? "－" : "＋"}</i>
        </button>
      </div>
      {contents && (
        <nav
          id="story-contents"
          className="story-contents"
          aria-label="故事章节"
        >
          {pages.map((p, i) => (
            <button
              key={p.title}
              aria-current={current === i ? "step" : undefined}
              aria-label={`跳到第 ${i + 1} 页：${p.title}`}
              onClick={() => {
                turn(i);
                setContents(false);
                tocButton.current?.focus();
              }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {p.title}
            </button>
          ))}
        </nav>
      )}
      <section
        className="reader-stage"
        aria-label="量子星守护者动画书"
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("button,a"))
            touch.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (touch.current !== null) {
            const d = e.clientX - touch.current;
            touch.current = null;
            if (Math.abs(d) > 65) turn(current + (d < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
      >
        <div className="reader-art">
          <img
            className="reader-image"
            key={page.image}
            src={page.image}
            alt={page.alt}
            fetchPriority="high"
          />
          <div className="reader-art-shade" />
          <span className="reader-caption">{page.caption}</span>
        </div>
        <div className="reader-copy" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">{page.chapter}</p>
          <h1>{page.title}</h1>
          <p className="reader-body">{page.body}</p>
          <blockquote>{page.quote}</blockquote>
          {current === 0 && (
            <button className="silver-button" onClick={() => turn(1)}>
              翻开故事
              <i aria-hidden="true" />
            </button>
          )}
          {current === pages.length - 1 && (
            <Link className="silver-button" href="/pqc-arsenal">
              探索真正的 PQC 武器库
              <i aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
      <div className="reader-controls">
        <div className="reader-audio">
          <button
            onClick={toggleAudio}
            aria-label={playing ? "暂停旁白" : "继续旁白"}
            aria-pressed={playing}
          >
            <span className="audio-icon" aria-hidden="true">
              {playing ? "Ⅱ" : "▷"}
            </span>
            {playing ? "暂停旁白" : "继续旁白"}
          </button>
          <span role="status">
            {error
              ? "播放未成功，请再次点击旁白"
              : playing
                ? "正在讲述 · 结束后自动翻页"
                : "点击收听 · 随时暂停"}
          </span>
        </div>
        <div className="reader-pagination">
          <button
            onClick={() => turn(current - 1)}
            disabled={current === 0}
            aria-label="上一页"
          >
            上一页
          </button>
          <span>
            <b>{String(current + 1).padStart(2, "0")}</b> / 11
          </span>
          <button
            onClick={() => turn(current + 1)}
            disabled={current === pages.length - 1}
            aria-label="下一页"
          >
            下一页
          </button>
        </div>
      </div>
      <nav className="reader-timeline" aria-label="全部故事页面">
        {pages.map((p, i) => (
          <button
            key={p.title}
            aria-label={`跳到第 ${i + 1} 页：${p.title}`}
            aria-current={current === i ? "step" : undefined}
            onClick={() => turn(i)}
          >
            <span style={{ backgroundImage: `url(${p.image})` }} />
            <small>{String(i + 1).padStart(2, "0")}</small>
            <strong>{p.title}</strong>
          </button>
        ))}
      </nav>
      <div className="reader-note">
        <span>共 11 页 · 支持左右方向键与触屏滑动</span>
        <span>科学幻想故事 · 算法原理请参阅武器库</span>
      </div>
    </main>
  );
}
