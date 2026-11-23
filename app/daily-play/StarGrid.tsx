"use client";

import Link from "next/link";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { allStars, boardAfter, columns, dailyShare, dateKey, decodeProgress, isLit, masks, puzzleFor, remainingMoves, size, type Progress } from "./puzzle";

const difficulty = { "轻松": 4, "进阶": 7, "硬核": 10 } as const;
type Difficulty = keyof typeof difficulty;
type Session = { mode: "daily" | "practice"; day: string; seed: string; optimum: number };
const storagePrefix = "liangzai:stargrid:v1:";
const empty = () => ({ moves: [], hints: 0 });
const daily = (day: string): Session => ({ mode: "daily", day, seed: day, optimum: 6 + Number(day.slice(-2)) % 3 });

export default function StarGrid() {
  const [session, setSession] = useState<Session | null>(null);
  const [today, setToday] = useState("");
  const [progress, setProgress] = useState<Progress>(empty);
  const [focus, setFocus] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [copyText, setCopyText] = useState("");
  const [level, setLevel] = useState<Difficulty>("轻松");
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const currentDate = useRef("");

  const puzzle = session ? puzzleFor(session.seed, session.optimum) : null;
  const board = puzzle ? boardAfter(puzzle.start, progress.moves) : 0;
  const done = Boolean(puzzle && board === allStars);
  const lit = masks.reduce((count, _, i) => count + Number(isLit(board, i)), 0);

  function switchSession(next: Session) {
    let loaded = empty() as Progress;
    if (next.mode === "daily") {
      try { loaded = decodeProgress(localStorage.getItem(storagePrefix + next.day)); } catch { /* Storage may be unavailable. */ }
    }
    setSession(next); setProgress(loaded); setHint(null); setFocus(0); setPreview(null); setNotice(""); setCopyText("");
  }

  useEffect(() => {
    const check = () => {
      const next = dateKey();
      if (!currentDate.current) switchSession(daily(next));
      if (next !== currentDate.current) {
        currentDate.current = next;
        setToday(next);
      }
    };
    // The Beijing date and optional localStorage are client-only external state.
    const initialize = window.setTimeout(check, 0);
    const timer = window.setInterval(check, 45_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(initialize);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  useEffect(() => {
    if (session?.mode !== "daily") return;
    try { localStorage.setItem(storagePrefix + session.day, JSON.stringify(progress)); } catch { /* Optional persistence. */ }
  }, [session, progress]);

  function press(index: number) {
    if (!puzzle || done) return;
    if (progress.moves.length >= 500) { setNotice("步数已达上限，可以撤回或重开。"); return; }
    setFocus(index); setHint(null); setNotice("");
    setProgress(p => ({ ...p, moves: [...p.moves, index] }));
  }
  function giveHint() {
    if (!puzzle || done) return;
    const next = remainingMoves(puzzle.solution, progress.moves)[0];
    if (next === undefined) return;
    if (hint !== next) setProgress(p => ({ ...p, hints: Math.min(500, p.hints + 1) }));
    setHint(next); setNotice(`试试第 ${Math.floor(next / columns) + 1} 行、第 ${next % columns + 1} 列。`);
  }
  function keyMove(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const deltas: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -columns, ArrowDown: columns };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    if (Math.abs(delta) === 1 && Math.floor(index / columns) !== Math.floor((index + delta) / columns)) return;
    const next = index + delta;
    if (next < 0 || next >= size) return;
    setFocus(next); cells.current[next]?.focus();
  }
  function practice(nextLevel = level) {
    const seed = `practice:${Math.random().toString(36).slice(2)}`;
    switchSession({ mode: "practice", day: today, seed, optimum: difficulty[nextLevel] });
  }
  async function share() {
    if (!session || session.mode !== "daily" || !done) return;
    const result = dailyShare(session.day, progress.moves.length, session.optimum, progress.hints);
    setCopyText(result);
    setNotice("可选择下方的成绩文字，内容不含答案。");
    try {
      await navigator.clipboard.writeText(result);
      setNotice("已复制 · 分享不包含答案。");
    } catch {
      setNotice("无法自动复制，可以长按或选择下面的文字。");
    }
  }

  return (
    <main id="main-content" className="dp-shell">
      <div className="dp-layout">
        <header className="dp-story">
          <p className="dp-kicker"><Link className="play-room-back" href="/play">好奇游乐场</Link> <span aria-hidden="true"> / </span>每日谜题</p>
          <h1>星阵<span>点灯</span></h1>
          <p className="dp-intro">一座熄了灯的星图，等你把它点亮。</p>
          <div className="dp-rule"><span className="dp-icon" aria-hidden="true">✚</span><p>点一颗星，它和<strong>上下左右</strong>的邻星会一起翻转。<br />让二十颗星全部亮起，就算通关。</p></div>
          <p className="dp-note">每天北京时间零点换题。今日谜题对所有人相同，进度只保存在本机。</p>
        </header>

        <section className="dp-game" aria-labelledby="dp-board-title">
          <div className="dp-bar">
            <div className="dp-segment" aria-label="游戏模式">
              <button type="button" aria-pressed={session?.mode !== "practice"} disabled={!today} onClick={() => switchSession(daily(today))}>今日</button>
              <button type="button" aria-pressed={session?.mode === "practice"} disabled={!today} onClick={() => { if (session?.mode !== "practice") practice(); }}>练习</button>
            </div>
            <span className="dp-date">{session?.mode === "practice" ? "PRACTICE" : session?.day || "DAILY"}</span>
          </div>
          {session?.mode === "daily" && session.day !== today ? <button type="button" className="dp-new" onClick={() => switchSession(daily(today))}>新谜题已到 · 切换至今天</button> : null}
          {session?.mode === "practice" ? (
            <div className="dp-practice">
              <label>难度 <select value={level} onChange={event => { const next = event.target.value as Difficulty; setLevel(next); practice(next); }}>{Object.keys(difficulty).map(item => <option key={item}>{item}</option>)}</select></label>
              <button type="button" onClick={() => practice()}>换一题 ↻</button>
            </div>
          ) : null}
          <div className="dp-board-head">
            <h2 id="dp-board-title">{done ? "星图已点亮" : "天幕 01"}</h2>
            <span><strong>{lit}</strong> / {size} 星</span>
          </div>
          <div className="dp-grid" role="group" aria-label="四列五行星阵；方向键移动、回车或空格点灯" onMouseLeave={() => setPreview(null)}>
            {masks.map((mask, index) => {
              const on = isLit(board, index);
              const highlighted = preview === null ? false : Boolean(masks[preview] & (1 << index));
              return (
                <button type="button" key={mask} tabIndex={index === focus && session ? 0 : -1}
                  ref={element => { cells.current[index] = element; }} disabled={!session}
                  aria-pressed={on} aria-disabled={done} className="dp-cell"
                  data-hint={hint === index || undefined} data-preview={highlighted || undefined}
                  aria-label={`第 ${Math.floor(index / columns) + 1} 行、第 ${index % columns + 1} 列，${on ? "亮" : "暗"}${hint === index ? "，建议点这里" : ""}`}
                  onFocus={() => setFocus(index)} onMouseEnter={() => setPreview(index)}
                  onKeyDown={event => keyMove(event, index)} onClick={() => press(index)}>
                  <span aria-hidden="true">{on ? "✦" : "·"}</span>
                </button>
              );
            })}
          </div>
          <div className="dp-score"><span>已用 <strong>{progress.moves.length}</strong> 步</span><span>最少 <strong>{session?.optimum ?? "·"}</strong> 步</span></div>
          <div className="dp-actions">
            <button type="button" disabled={!progress.moves.length} onClick={() => { setHint(null); setNotice(""); setCopyText(""); setProgress(p => ({ ...p, moves: p.moves.slice(0, -1) })); }}>撤回</button>
            <button type="button" disabled={!session || done} onClick={giveHint}>提示</button>
            <button type="button" disabled={!progress.moves.length && !progress.hints} onClick={() => { setProgress(empty()); setHint(null); setPreview(null); setNotice(""); setCopyText(""); }}>重开</button>
            {done && session?.mode === "daily" ? <button type="button" className="dp-share" onClick={share}>复制成绩</button> : null}
            {done && session?.mode === "practice" ? <button type="button" className="dp-share" onClick={() => practice()}>下一题</button> : null}
          </div>
          <div className="dp-status" role="status">{notice || (done ? (progress.moves.length === session?.optimum && !progress.hints ? "✦ 完美点亮！无提示，使用最少步数。" : "✦ 通关！二十颗星全亮了。") : "可用方向键移动，空格或回车点灯。")}</div>
          {copyText ? <textarea className="dp-copy" rows={3} readOnly aria-label="可复制成绩" onFocus={event => event.currentTarget.select()} value={copyText} /> : null}
        </section>
      </div>
    </main>
  );
}
