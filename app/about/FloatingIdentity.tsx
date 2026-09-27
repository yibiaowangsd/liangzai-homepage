"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { useExperience } from "../experience/Motion";
import styles from "./FloatingIdentity.module.css";

export default function FloatingIdentity() {
  const stage = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const { enabled } = useExperience();

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    card.current?.removeAttribute("style");
  }

  useEffect(() => {
    const element = stage.current;
    if (!element || !enabled) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      delete element.dataset.visible;
      reset();
    };
  }, [enabled]);

  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const style = card.current?.style;
      style?.setProperty("--rotate-x", `${(0.5 - y) * 10}deg`);
      style?.setProperty("--rotate-y", `${(x - 0.5) * 14}deg`);
      style?.setProperty("--light-x", `${x * 100}%`);
      style?.setProperty("--light-y", `${y * 100}%`);
      frame.current = null;
    });
  }

  return (
    <aside className={styles.stage} ref={stage} data-intro
      data-enabled={enabled} aria-label="Wang Yibiao 的悬浮个人名片"
      onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.float}>
        <div className={styles.card} ref={card}>
          <div className={styles.surface}>
            <div className={styles.topline}>
              <span className={styles.brand}>个人名片</span>
              <span className={styles.status}>持续探索中</span>
            </div>
            <div className={styles.identity}>
              <div className={styles.name}>
                <p className={styles.label}>WANG YIBIAO</p>
                <h2>Yibiao<span>密码学与工程实践</span></h2>
              </div>
              <svg className={styles.emblem} viewBox="0 0 120 120" fill="none" aria-hidden="true">
                <circle cx="60" cy="60" r="43" />
                <ellipse cx="60" cy="60" rx="24" ry="43" transform="rotate(40 60 60)" />
                <ellipse cx="60" cy="60" rx="24" ry="43" transform="rotate(-40 60 60)" />
                <circle cx="60" cy="60" r="5" className={styles.core} />
                <circle cx="91" cy="30" r="3" className={styles.core} />
              </svg>
            </div>
            <dl className={styles.details}>
              <div><dt>现在</dt><dd>中电信量子集团</dd></div>
              <div><dt>毕业于</dt><dd>山东大学</dd></div>
            </dl>
            <div className={styles.bottomline}>
              <span>抗量子密码 <i /> 安全协议</span>
              <a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer" aria-label="访问 Wang Yibiao 的 GitHub">GitHub<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 8H7a5 5 0 0 0 0 10h3a5 5 0 0 0 5-5M15 16h2a5 5 0 0 0 0-10h-3a5 5 0 0 0-5 5" /></svg></a>
            </div>
          </div>
        </div>
      </div>
      <p className={styles.caption}><span />以好奇为起点<span /></p>
    </aside>
  );
}
