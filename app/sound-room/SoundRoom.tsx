"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createSoundEngine, type Mix, type SoundKey } from "./audio";
import { displayTime, durations, remainingUntil } from "./clock";
import styles from "./room.module.css";

const sources: { id: SoundKey; name: string; detail: string; index: string }[] = [
  { id: "rain", name: "细雨", detail: "轻点窗沿", index: "01" },
  { id: "wind", name: "风声", detail: "穿过树梢", index: "02" },
  { id: "waves", name: "海浪", detail: "缓慢涨落", index: "03" },
  { id: "ember", name: "壁炉", detail: "零星火花", index: "04" },
];
const mixes: { label: string; settings: Mix }[] = [
  { label: "雨落窗边", settings: { rain: 76, wind: 20, waves: 0, ember: 8 } },
  { label: "海岸散步", settings: { rain: 0, wind: 26, waves: 80, ember: 0 } },
  { label: "山间小屋", settings: { rain: 17, wind: 32, waves: 0, ember: 83 } },
];
const storageKey = "liangzai:sound-room:v1";
const defaultMix = mixes[0].settings;

function readSettings(): { mix: Mix; volume: number } {
  const fallback = { mix: defaultMix, volume: 48 };
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
    if (saved && valid(saved.volume) && sources.every(({ id }) => valid(saved.mix?.[id]))) {
      return { mix: Object.fromEntries(sources.map(({ id }) => [id, saved.mix[id]])) as Mix, volume: saved.volume };
    }
  } catch { /* the room stays usable without storage */ }
  return fallback;
}

export default function SoundRoom() {
  const [mix, setMix] = useState<Mix>(defaultMix);
  const [volume, setVolume] = useState(48);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState<number>(25);
  const [remaining, setRemaining] = useState(25 * 60_000);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const engine = useRef<ReturnType<typeof createSoundEngine> | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const frame = window.requestAnimationFrame(() => {
      const settings = readSettings();
      setMix(settings.mix);
      setVolume(settings.volume);
      setLoaded(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      alive.current = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    engine.current?.setMix(mix, volume);
    try { window.localStorage.setItem(storageKey, JSON.stringify({ mix, volume })); } catch { /* optional */ }
  }, [mix, volume, loaded]);

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = remainingUntil(deadline, Date.now());
      setRemaining(left);
      if (left === 0) {
        setDeadline(null);
        setFinished(true);
      }
    };
    const handle = window.setInterval(tick, 220);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline]);

  async function toggleAudio() {
    if (pending.current) return;
    setMessage("");
    setBusy(true);
    pending.current = true;
    const running = engine.current;
    try {
      if (playing && running) {
        await running.pause();
        if (alive.current) setPlaying(false);
      } else {
        const audio = running ?? createSoundEngine();
        engine.current = audio;
        audio.setMix(mix, volume);
        await audio.play();
        if (alive.current) setPlaying(true);
      }
    } catch {
      if (alive.current) setMessage("暂时无法播放。请重试；你仍然可以使用计时器。");
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function selectDuration(value: number) {
    setMinutes(value);
    setDeadline(null);
    setRemaining(value * 60_000);
    setFinished(false);
  }

  function toggleTimer() {
    if (deadline !== null) {
      const left = remainingUntil(deadline, Date.now());
      setRemaining(left);
      setFinished(left === 0);
      setDeadline(null);
      return;
    }
    const left = remaining || minutes * 60_000;
    setRemaining(left);
    setFinished(false);
    setDeadline(Date.now() + left);
  }
  const activeMix = mixes.findIndex(preset => sources.every(({ id }) => mix[id] === preset.settings[id]));
  const progress = Math.max(0, Math.min(100, 100 * (1 - remaining / (minutes * 60_000))));

  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.top}><Link href="/sidequests">← 小工具</Link><span>01 / SOUND ROOM</span></div>
        <header className={styles.hero}>
          <p className={styles.kicker}><span /> 给自己留一点空白</p>
          <h1>声音角落</h1>
          <p className={styles.lede}>把雨、风、浪和火调成你的背景声。想安静地做一件事，就开一段计时。</p>
          <div className={styles.signal} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </header>
        <div className={styles.workspace}>
          <section className={styles.panel} aria-labelledby="mix-title">
            <div className={styles.panelHeading}><div><p>01 / SOUNDSCAPE</p><h2 id="mix-title">调一调</h2></div><button type="button" className={styles.primary} disabled={busy} onClick={toggleAudio}>{playing ? "暂停声音" : "播放声音"}</button></div>
            <p className={styles.status} role="status">{message || (playing ? "声音正在播放" : "当前静音，点播放才出声")}</p>
            <div className={styles.pills} aria-label="声音预设">{mixes.map((preset, index) => <button type="button" aria-pressed={index === activeMix} key={preset.label} onClick={() => setMix(preset.settings)}>{preset.label}</button>)}</div>
            <div className={styles.channels}>
              {sources.map(({ id, name, detail, index }) => <label className={styles.channel} key={id}>
                <span className={styles.channelIntro}><small>{index}</small><strong>{name}</strong><span>{detail}</span></span>
                <input type="range" min="0" max="100" value={mix[id]} aria-label={name} onChange={event => setMix({ ...mix, [id]: Number(event.target.value) })} />
                <span className={styles.value} aria-hidden="true">{mix[id]}%</span>
              </label>)}
            </div>
            <label className={styles.channel + " " + styles.master}>
              <span className={styles.channelIntro}><small>Σ</small><strong>总音量</strong></span>
              <input type="range" min="0" max="100" value={volume} aria-label="总音量" onChange={event => setVolume(Number(event.target.value))} />
              <span className={styles.value} aria-hidden="true">{volume}%</span>
            </label>
          </section>
          <section className={styles.panel + " " + styles.timer} aria-labelledby="timer-title">
            <div className={styles.panelHeading}><div><p>02 / FOCUS TIMER</p><h2 id="timer-title">专注一会</h2></div></div>
            <div className={styles.pills} aria-label="计时时长">{durations.map(value => <button type="button" key={value} aria-pressed={minutes === value} onClick={() => selectDuration(value)}>{value} 分</button>)}</div>
            <p className={styles.clock} role="timer" aria-label="剩余时间">{displayTime(remaining)}</p>
            <progress className={styles.progress} aria-label="计时进度" max={100} value={progress} />
            <div className={styles.timerActions}><button type="button" className={styles.primary} onClick={toggleTimer}>{deadline !== null ? "暂停计时" : finished ? "再来一段" : remaining < minutes * 60_000 ? "继续计时" : "开始计时"}</button><button className={styles.reset} type="button" onClick={() => selectDuration(minutes)}>重置</button></div>
            <p className={styles.status} role="status">{finished ? "时间到。起来走两步，或者再留一段给自己。" : "计时与声音独立，时间到不会突然响铃。"}</p>
          </section>
        </div>
        <footer className={styles.local}><span>无需账号 · 无需麦克风 · 音频在本机合成</span><span>混音设置只存当前浏览器；手机锁屏可能暂停声音。</span></footer>
      </div>
    </main>
  );
}
