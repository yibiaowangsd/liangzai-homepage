'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { blank, decodePicture, encodePicture, palettes, side, stroke, templates } from './pixels';
import type { PaletteId, Picture, Point } from './pixels';
import styles from './postcard.module.css';

type Timeline = { past: Picture[]; next: Picture[] };
const initial = templates[0].picture;
const limit = 48;
const clamp = (value: number) => Math.min(side - 1, Math.max(0, value));
const hint = '方向键移动；空格或回车涂色；按 Delete 擦除。也可用鼠标或手指划过画板。';

export default function Postcard() {
  const [picture, setPicture] = useState(initial);
  const latest = useRef(initial);
  const [timeline, setTimeline] = useState<Timeline>({ past: [], next: [] });
  const [brush, setBrush] = useState(3);
  const [cursor, setCursor] = useState<Point>({ x: 7, y: 7 });
  const [message, setMessage] = useState('');
  const [shareText, setShareText] = useState('');
  const revision = useRef(0);
  const grid = useRef<HTMLDivElement>(null);
  const shareField = useRef<HTMLInputElement>(null);
  const dragging = useRef<{ source: Picture; last: Point; pointer: number; ink: number } | null>(null);
  const palette = palettes.find(item => item.id === picture.palette) ?? palettes[0];

  function paint(next: Picture) {
    latest.current = next;
    setPicture(next);
  }
  function changed() {
    revision.current++;
    setShareText('');
    setMessage('');
  }

  useEffect(() => {
    let active = true;
    function readLink() {
      const hash = window.location.hash;
      if (!hash.startsWith('#stamp1=')) return;
      const decoded = decodePicture(hash);
      if (!decoded) {
        setMessage('这张明信片的链接不完整，已保留当前画面。');
        return;
      }
      revision.current++;
      paint(decoded);
      setTimeline({ past: [], next: [] });
      setShareText('');
      setMessage('已打开一张明信片。可以继续画，也可以原样下载。');
    }
    queueMicrotask(() => { if (active) readLink(); });
    window.addEventListener('hashchange', readLink);
    return () => { active = false; window.removeEventListener('hashchange', readLink); };
  }, []);

  function replace(next: Picture) {
    const current = latest.current;
    if (next === current) return;
    changed();
    paint(next);
    setTimeline(history => ({ past: [...history.past.slice(1 - limit), current], next: [] }));
  }
  function moveHistory(redo: boolean) {
    const from = redo ? timeline.next : timeline.past;
    const prior = from.at(-1);
    if (!prior) return;
    const now = latest.current;
    changed();
    paint(prior);
    setTimeline(redo
      ? { past: [...timeline.past.slice(1 - limit), now], next: from.slice(0, -1) }
      : { past: from.slice(0, -1), next: [...timeline.next.slice(1 - limit), now] });
  }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !(event.target instanceof HTMLInputElement)) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        moveHistory(key === 'y' || event.shiftKey);
      }
    }
  }
  function gridKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    let { x, y } = cursor;
    switch (event.key) {
      case 'ArrowLeft': x--; break;
      case 'ArrowRight': x++; break;
      case 'ArrowUp': y--; break;
      case 'ArrowDown': y++; break;
      case 'Home': x = 0; break;
      case 'End': x = side - 1; break;
      case ' ':
      case 'Enter':
      case 'Delete':
      case 'Backspace': {
        event.preventDefault();
        const now = latest.current;
        const cells = stroke(now.cells, cursor, cursor, ['Delete', 'Backspace'].includes(event.key) ? 0 : brush);
        if (cells !== now.cells) replace({ ...now, cells });
        return;
      }
      default: return;
    }
    event.preventDefault();
    setCursor({ x: clamp(x), y: clamp(y) });
  }
  function point(event: PointerEvent<HTMLDivElement>): Point {
    const board = event.currentTarget;
    const rect = board.getBoundingClientRect();
    return { x: clamp(Math.floor((event.clientX - rect.left - board.clientLeft) / board.clientWidth * side)),
      y: clamp(Math.floor((event.clientY - rect.top - board.clientTop) / board.clientHeight * side)) };
  }
  function draw(from: Point, to: Point, ink: number) {
    const current = latest.current;
    const cells = stroke(current.cells, from, to, ink);
    if (cells !== current.cells) paint({ ...current, cells });
    setCursor(to);
  }
  function pointerStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || dragging.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') grid.current?.focus({ preventScroll: true });
    const start = point(event);
    dragging.current = { source: latest.current, last: start, pointer: event.pointerId, ink: brush };
    changed();
    draw(start, start, brush);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = dragging.current;
    if (!active || event.pointerId !== active.pointer) return;
    const next = point(event);
    if (next.x !== active.last.x || next.y !== active.last.y) {
      draw(active.last, next, active.ink);
      active.last = next;
    }
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const active = dragging.current;
    if (!active || event.pointerId !== active.pointer) return;
    dragging.current = null;
    if (latest.current !== active.source) {
      setTimeline(history => ({ past: [...history.past.slice(1 - limit), active.source], next: [] }));
    }
  }
  function setPalette(id: PaletteId) {
    const now = latest.current;
    if (now.palette !== id) replace({ ...now, palette: id });
  }
  async function share() {
    const url = new URL(window.location.pathname, window.location.origin);
    url.hash = encodePicture(latest.current);
    const token = ++revision.current;
    setShareText(url.href);
    setMessage('链接已生成。如果没有自动复制，也可以手动复制下方链接。');
    try {
      await navigator.clipboard.writeText(url.href);
      if (token !== revision.current) return;
      setMessage('明信片链接已复制。打开它的人可以看到并续画。');
    } catch {
      if (token !== revision.current) return;
      setMessage('浏览器未允许自动复制，请手动复制下方链接。');
      requestAnimationFrame(() => {
        if (token === revision.current) { shareField.current?.focus(); shareField.current?.select(); }
      });
    }
  }
  function save() {
    const snapshot = latest.current;
    const inks = (palettes.find(item => item.id === snapshot.palette) ?? palettes[0]).inks;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setMessage('此浏览器无法导出图像，可以复制明信片链接。'); return; }
    ctx.fillStyle = '#fbf2de';
    ctx.fillRect(0, 0, 640, 640);
    ctx.fillStyle = '#26243a';
    ctx.fillRect(54, 54, 532, 532);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      ctx.fillStyle = inks[snapshot.cells[y * side + x]];
      ctx.fillRect(64 + x * 32, 64 + y * 32, 32, 32);
    }
    ctx.fillStyle = '#5a4f60';
    ctx.font = '14px monospace';
    ctx.fillText('PIXEL POSTCARD / 16 × 16', 64, 613);
    ctx.textAlign = 'right';
    ctx.fillText('WANGYIBIAO.COM', 576, 613);
    if (typeof canvas.toBlob !== 'function') { setMessage('此浏览器无法导出 PNG，可以复制明信片链接。'); return; }
    canvas.toBlob(blob => {
      if (!blob) { setMessage('没能生成 PNG，可以复制明信片链接。'); return; }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'pixel-postcard.png';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
      setMessage('PNG 已生成。请在浏览器的下载记录中查看。');
    }, 'image/png');
  }

  return (
    <main className={styles.post} id="main-content" onKeyDown={keyboard}>
      <Link href="/play" className={styles.back + ' play-room-back'}><span aria-hidden="true">← </span>好奇游乐场</Link>
      <header className={styles.heading}>
        <div>
          <p className={styles.kicker}>量仔邮局 <span aria-hidden="true">·</span> PIXEL POST</p>
          <h1>像素明信片<span aria-hidden="true">.</span></h1>
          <p className={styles.lede}>把今天的小心情，塞进一张十六格见方的邮票。</p>
        </div>
        <div className={styles.postmark} aria-hidden="true"><b>LOCAL</b><span>★ ★ ★</span><b>16 × 16</b></div>
      </header>

      <div className={styles.desk}>
        <section className={styles.card} aria-label="像素画板">
          <div className={styles.cardHead}><b>POSTCARD</b><span>面值：一点想念</span></div>
          <div className={styles.paintbar}>
          <div className={styles.swatches} role="group" aria-label="画笔">
            {palette.inks.map((ink, index) => <button type="button" key={index} aria-pressed={brush === index}
              onClick={() => setBrush(index)} title={index === 0 ? '橡皮' : palette.names[index]}
              aria-label={index === 0 ? '橡皮' : palette.names[index]} style={{ '--swatch': ink } as CSSProperties}>
              {index === 0 ? <span aria-hidden="true">×</span> : null}
            </button>)}
          </div>
          <p className={styles.brush}>当前：{brush === 0 ? '橡皮' : palette.names[brush]}</p>
          </div>
          <div className={styles.stamp}>
            <div ref={grid} className={styles.grid} tabIndex={0} role="grid" aria-label="16 × 16 像素画板"
              aria-describedby="pixel-hint" aria-activedescendant={`pixel-${cursor.y}-${cursor.x}`}
              onKeyDown={gridKeyboard} onPointerDown={pointerStart} onPointerMove={pointerMove}
              onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
              {Array.from({ length: side }, (_, y) => (
                <div key={y} role="row" className={styles.row}>
                  {Array.from({ length: side }, (_, x) => {
                    const index = y * side + x;
                    const color = picture.cells[index];
                    return <span key={x} id={`pixel-${y}-${x}`} role="gridcell" aria-label={`第 ${y + 1} 行第 ${x + 1} 列，${palette.names[color]}`}
                      className={styles.pixel} data-cursor={x === cursor.x && y === cursor.y}
                      style={{ '--ink': palette.inks[color] } as CSSProperties} />;
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.cardFoot}><span>FROM THE LITTLE POST OFFICE</span><b>NO. 016</b></div>
          <p className={styles.hint} id="pixel-hint">{hint}</p>
        </section>

        <section className={styles.controls} aria-label="画笔和寄出">
          <div className={styles.controlTop}>
            <p className={styles.kicker}>01 / THE INK DESK</p>
            <h2>挑一盘颜色</h2>
            <div className={styles.options} aria-label="色盘">
              {palettes.map(item => <button type="button" key={item.id} aria-pressed={item.id === picture.palette} onClick={() => setPalette(item.id)}>{item.name}</button>)}
            </div>
          </div>
          <div className={styles.controlSection}>
            <p className={styles.kicker}>02 / FIRST DRAFT</p>
            <h2>从一段风景开始</h2>
            <div className={styles.options} aria-label="明信片底稿">
              {templates.map(item => <button type="button" key={item.name} onClick={() => replace({ ...item.picture })}>{item.name}</button>)}
            </div>
            <div className={styles.options} aria-label="画板历史">
              <button type="button" disabled={timeline.past.length === 0} onClick={() => moveHistory(false)}>撤销</button>
              <button type="button" disabled={timeline.next.length === 0} onClick={() => moveHistory(true)}>重做</button>
              <button type="button" onClick={() => replace({ ...latest.current, cells: blank() })}>清空画板</button>
            </div>
          </div>
          <div className={styles.controlSection}>
            <p className={styles.kicker}>03 / OUTGOING</p>
            <h2>寄出去吧</h2>
            <div className={styles.send}>
              <button type="button" onClick={save}>下载 PNG</button>
              <button type="button" onClick={() => { void share(); }}>复制明信片链接</button>
            </div>
            <p className={styles.privacy}>不上传画作。链接把画面本身装在网址里，拿到链接的人就能看到；离开前请下载或复制留存。</p>
            <p role="status" className={styles.status}>{message}</p>
            {shareText && <input className={styles.manual} ref={shareField} aria-label="手动复制明信片链接" value={shareText} readOnly onFocus={event => event.currentTarget.select()} />}
          </div>
        </section>
      </div>
    </main>
  );
}
