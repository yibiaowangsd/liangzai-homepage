"use client";

import { useEffect, useId, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { useExperience } from "../experience/Motion";
import styles from "./FloatingIdentity.module.css";

export default function FloatingIdentity() {
  const goldId = useId();
  const stage = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const scale = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const { enabled } = useExperience();

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    // A canonical physical card: never enlarge it on a desktop. On a narrow
    // phone, scale the entire object rather than reflowing its typography.
    const fit = () => scale.current?.style.setProperty("--card-scale", String(Math.min(1, element.clientWidth / 460)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
      style?.setProperty("--rotate-x", `${(0.5 - y) * 5}deg`);
      style?.setProperty("--rotate-y", `${(x - 0.5) * 7}deg`);
      style?.setProperty("--light-x", `${x * 100}%`);
      style?.setProperty("--light-y", `${y * 100}%`);
      frame.current = null;
    });
  }

  return (
    <aside data-theme-surface="silver" className={styles.stage} ref={stage} data-intro
      data-enabled={enabled} aria-label="Wang Yibiao 的悬浮个人名片"
      onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.scale} ref={scale}>
      <div className={styles.float}>
        <div className={styles.card} ref={card} data-identity-card>
          <div className={styles.surface}>
            <svg className={styles.engraving} viewBox="0 0 140 400" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id={goldId} x1="0" y1="0" x2="140" y2="400" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#77603a" /><stop offset=".22" stopColor="#d1b67d" />
                  <stop offset=".48" stopColor="#917243" /><stop offset=".72" stopColor="#f1deb0" />
                  <stop offset="1" stopColor="#806338" />
                </linearGradient>
              </defs>
              <g stroke={`url(#${goldId})`} strokeWidth=".7">
                {Array.from({ length: 16 }, (_, i) => (
                  <path key={i} d={`M ${36 + i * 4} -20 C ${-64 + i * 7} 82, ${199 - i * 5} 132, ${81 + i * 3} 207 S ${-48 + i * 8} 334, ${84 + i * 4} 420`} />
                ))}
                <path d="M118 0V158M118 242V400" strokeWidth="1" />
                <path d="M118 179l9 21-9 21-9-21Z" strokeWidth="1" />
                <path d="M118 190l4 10-4 10-4-10Z" />
              </g>
            </svg>
            <div className={styles.content}>
              <div className={styles.topline}>
                <span className={styles.brand}><i aria-hidden="true" />密码学与工程实践</span>
              </div>
              <div className={styles.identity}>
                <h2>Wang Yibiao</h2>
                <p>抗量子密码与安全协议</p>
              </div>
              <dl className={styles.details}>
                <div><dt>工作</dt><dd>中电信量子集团<span>PQC 与 QKD 融合应用</span></dd></div>
                <div><dt>教育</dt><dd>山东大学<span>网络空间安全 本科与硕士</span></dd></div>
              </dl>
            </div>
            <div className={styles.bottomline}>
              <Link href="/" aria-label="返回 Wang Yibiao 的主页">wangyibiao.com</Link>
              <a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer" aria-label="访问 Wang Yibiao 的 GitHub">GitHub<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 8H7a5 5 0 0 0 0 10h3a5 5 0 0 0 5-5M15 16h2a5 5 0 0 0 0-10h-3a5 5 0 0 0-5 5" /></svg></a>
            </div>
          </div>
        </div>
      </div>
      </div>

    </aside>
  );
}
