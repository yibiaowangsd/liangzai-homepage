"use client";
import "./cinema.css";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { shouldSkipCinema } from "./cinema-shortcut.ts";
const subscribeSkip = (notify: () => void) => { window.addEventListener("yibiao:cinema-skip", notify); window.addEventListener("storage", notify); return () => { window.removeEventListener("yibiao:cinema-skip", notify); window.removeEventListener("storage", notify); }; };
const readSkip = () => { try { return localStorage.getItem("yibiao-cinema-skipped") === "true"; } catch { return false; } };
/** A self-contained opening sequence. No hardware scoring or reduced-quality branch. */
export default function CinemaEntrance({ autoPlay = false }: { autoPlay?: boolean }) {
    const skipped = useSyncExternalStore(subscribeSkip, readSkip, () => false);
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
        try { localStorage.setItem("yibiao-cinema-skipped", "true"); } catch {}
        window.dispatchEvent(new Event("yibiao:cinema-skip"));
        el.close();
        document.body.style.overflow = overflow.current;
        previous.current?.focus({ preventScroll: true });
    }, []);
    const skip = useCallback(() => {
      try { localStorage.setItem("yibiao-cinema-skipped", "true"); } catch {}
      window.dispatchEvent(new Event("yibiao:cinema-skip"));
      finish();
    }, [finish]);
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
    useEffect(() => { if (autoPlay) play(); }, [autoPlay, play]);
    useEffect(() => {
        const el = dialog.current;
        // A stored skip choice keeps future entrances opt-in.
        // The entrance is opt-in: content is available on every first visit.
        return () => { if (timer.current)
            clearTimeout(timer.current); if (el?.open) {
            el.close();
            document.body.style.overflow = overflow.current;
        } };
    }, []);
    return <>
    <button className="portal-replay secondary-button" type="button" onClick={play}>{skipped ? "重播序幕" : "播放序幕"}</button>
    <dialog ref={dialog} className="cinema-entrance" aria-label="量仔首页电影序幕" onClick={skip} onCancel={e => { e.preventDefault(); skip(); }} onKeyDown={e => {
      if (e.currentTarget.open && shouldSkipCinema(e)) { e.preventDefault(); skip(); }
    }}>
      <img src="/assets/cinematic/vault-entrance-v2.webp" alt="" className="cinema-scene"/>
      <div className="cinema-shade"/>
      <div className="cinema-credit"><span>YIBIAO PRESENTS</span><strong>LIANGZAI</strong><p>从一个问题，走进无限可能。</p></div>
      <div className="cinema-matte cinema-matte-top"/><div className="cinema-matte cinema-matte-bottom"/>
      <button className="cinema-skip" onClick={skip} type="button" aria-label="跳过序幕（空格键或 Escape）" aria-keyshortcuts="Space Escape"><span>点按任意处跳过</span><kbd>Space / Esc</kbd></button>
      <span className="cinema-progress" aria-hidden="true"/>
    </dialog>
  </>;
}
