"use client";
import { useCallback, useEffect, useRef } from "react";
import { shouldSkipCinema } from "./cinema-shortcut.ts";
/** A self-contained opening sequence. No hardware scoring or reduced-quality branch. */
export default function CinemaEntrance() {
    const dialog = useRef<HTMLDialogElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previous = useRef<HTMLElement | null>(null);
    const overflow = useRef("");
    const finish = useCallback(() => {
        if (timer.current)
            clearTimeout(timer.current);
        const el = dialog.current;
        if (!el?.open)
            return;
        el.close();
        document.body.style.overflow = overflow.current;
        previous.current?.focus({ preventScroll: true });
    }, []);
    const play = useCallback(() => {
        const el = dialog.current;
        if (!el || el.open)
            return;
        previous.current = document.activeElement as HTMLElement;
        overflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        el.showModal();
        el.querySelector<HTMLButtonElement>("button")?.focus();
        timer.current = setTimeout(finish, 4800);
    }, [finish]);
    useEffect(() => {
        const el = dialog.current;
        // The entrance is opt-in: content is available on every first visit.
        return () => { if (timer.current)
            clearTimeout(timer.current); if (el?.open) {
            el.close();
            document.body.style.overflow = overflow.current;
        } };
    }, []);
    return <>
    <button className="portal-replay" type="button" onClick={play}>播放序幕</button>
    <dialog ref={dialog} className="cinema-entrance" aria-label="量仔首页电影序幕" onCancel={e => { e.preventDefault(); finish(); }} onKeyDown={e => {
      if (e.currentTarget.open && shouldSkipCinema(e)) { e.preventDefault(); finish(); }
    }}>
      <img src="/assets/cinematic/vault-entrance-v2.webp" alt="" className="cinema-scene"/>
      <div className="cinema-shade"/>
      <div className="cinema-credit"><span>YIBIAO PRESENTS</span><strong>LIANGZAI</strong><p>从一个问题，走进无限可能。</p></div>
      <div className="cinema-matte cinema-matte-top"/><div className="cinema-matte cinema-matte-bottom"/>
      <button className="cinema-skip" onClick={finish} type="button" aria-label="跳过序幕（空格键或 Escape）" aria-keyshortcuts="Space Escape"><kbd>Space</kbd><span>跳过</span></button>
      <span className="cinema-progress" aria-hidden="true"/>
    </dialog>
  </>;
}
