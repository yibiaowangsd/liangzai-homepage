"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  buildSchedule, cities, dayMinutes, dayNote, stepMinutes, timeLabel, utcDateOf, utcStart,
  type City,
} from "./time";
import styles from "./time-desk.module.css";

const defaults: City[] = [cities[0], cities[5], cities[6]];
const subscribe = () => () => {};
const getNow = () => utcDateOf(new Date());
const getServerDate = () => "";
const ticks = [0, 6, 12, 18, 24];

export default function TimeDesk() {
  const today = useSyncExternalStore(subscribe, getNow, getServerDate);
  const [chosenDate, setChosenDate] = useState("");
  const date = chosenDate || today;
  const [minute, setMinute] = useState(9 * 60);
  const [active, setActive] = useState<City[]>(defaults);
  const [addId, setAddId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fallback, setFallback] = useState("");
  const addField = useRef<HTMLSelectElement>(null);
  const copyRevision = useRef(0);
  const schedule = useMemo(() => {
    const base = utcStart(date);
    return Number.isFinite(base) ? buildSchedule(base, active) : null;
  }, [date, active]);
  const slotIndex = minute / stepMinutes;
  const slotSelected = schedule?.overlap[slotIndex];
  const options = cities.filter(city => !active.includes(city));
  const selectedText = `${date} ${timeLabel(minute)} UTC`;

  function clearCopy() {
    copyRevision.current++;
    setFeedback("");
    setFallback("");
  }

  function moveTo(value: number) {
    setMinute(value);
    clearCopy();
  }

  function addCity() {
    const city = options.find(item => item.id === addId);
    if (!city || active.length >= 5) return;
    setActive(previous => [...previous, city]);
    setAddId("");
    clearCopy();
  }

  async function copyPlan() {
    if (!schedule) return;
    const lines = [
      `时差桌 | ${selectedText}`,
      ...schedule.allRows.map(({ city, slots }) => {
        const local = slots[slotIndex];
        return `${city.name}：${local.date}（周${local.weekday}）${timeLabel(local.minute)} ${local.offset}${local.dayDelta ? ` · ${dayNote(local.dayDelta)}` : ""}`;
      }),
    ];
    const plan = lines.join("\n");
    const revision = ++copyRevision.current;
    try {
      await navigator.clipboard.writeText(plan);
      if (revision !== copyRevision.current) return;
      setFeedback("方案已复制");
      setFallback("");
    } catch {
      if (revision !== copyRevision.current) return;
      setFallback(plan);
      setFeedback("浏览器未允许自动复制，可手动选中下方文本。");
    }
  }

  return (
    <main className={styles.desk} id="main-content">
      <div className={styles.back}><Link href="/sidequests">← 小工具</Link></div>
      <header className={styles.hero}>
        <div className={styles.kicker}><span aria-hidden="true" /> 世界时钟 / MEETING PLANNER</div>
        <h1>时差桌<span aria-hidden="true">.</span></h1>
        <p>定下一个时刻，让每个城市都看见自己的时间。</p>
      </header>

      <section className={styles.panel} aria-label="选择日期和时间">
        <div className={styles.controls}>
          <label htmlFor="time-desk-date">计划日期（UTC）</label>
          <input id="time-desk-date" type="date" min="1970-01-02" max="2099-12-30"
            value={date} onChange={event => {
              const next = event.currentTarget.value;
              if (Number.isFinite(utcStart(next)) && next >= '1970-01-02' && next <= '2099-12-30') {
                setChosenDate(next); clearCopy();
              }
            }} />
          <button type="button" className={styles.ghost} onClick={() => { setChosenDate(""); clearCopy(); }}>今天</button>
          <label htmlFor="time-desk-time" className={styles.readout}>
            <span>选定时刻</span><strong aria-hidden="true">{timeLabel(minute)} <small>UTC</small></strong>
          </label>
        </div>
        <div className={styles.axis}>
          <input id="time-desk-time" type="range" min={0} max={dayMinutes - stepMinutes} step={stepMinutes}
            value={minute} aria-valuetext={`${timeLabel(minute)} UTC`}
            onChange={event => moveTo(Number(event.currentTarget.value))} />
          <div className={styles.ticks} aria-hidden="true">{ticks.map(tick => <span key={tick}>{String(tick).padStart(2, "0")}:00</span>)}</div>
        </div>
        <div className={styles.overlap}>
          <p><b>共同工作时段</b><span> 各地周一至周五，09:00–18:00；不计节假日。</span></p>
          {schedule && schedule.windows.length > 0
            ? <div className={styles.windows}>{schedule.windows.map(window =>
                <button type="button" key={window.start} onClick={() => moveTo(window.start)}>
                  {timeLabel(window.start)}–{timeLabel(window.end)} UTC
                </button>)}</div>
            : <p className={styles.empty} role="status">{schedule ? "这一天没有共同工作时段。" : "正在读取本机日期…"}</p>}
        </div>
      </section>

      <section className={styles.cities} aria-label="各地当地时间">
        <div className={styles.cityControls}>
          <div>
            <h2>各地时间 <span>{active.length}/5</span></h2>
            <p>同一时刻下，按城市当地日期显示。</p>
          </div>
          <div className={styles.add}>
            <label className={styles.sr} htmlFor="time-desk-city">选择添加城市</label>
            <select ref={addField} id="time-desk-city" value={addId} disabled={active.length >= 5}
              onChange={event => setAddId(event.currentTarget.value)}>
              <option value="">{active.length >= 5 ? "已选满五地" : "选择城市"}</option>
              {options.map(city => <option value={city.id} key={city.id}>{city.name}</option>)}
            </select>
            <button type="button" disabled={!addId || active.length >= 5} onClick={addCity}>添加</button>
          </div>
        </div>
        <div className={styles.grid}>
          {schedule?.allRows.map(({ city, slots, offsets }) => {
            const local = slots[slotIndex];
            return (
              <article className={styles.city} key={city.id} aria-label={city.name}>
                <div className={styles.cityHead}>
                  <span>{city.code} / {local.offset}</span>
                  <button type="button" disabled={active.length === 1} aria-label={`移除${city.name}`}
                    onClick={() => { setActive(items => items.filter(item => item !== city)); clearCopy(); requestAnimationFrame(() => addField.current?.focus()); }}>×</button>
                </div>
                <h3>{city.name}</h3>
                <div className={styles.localTime}>{timeLabel(local.minute)}</div>
                <p className={styles.localDate}>{local.date} · 周{local.weekday}
                  {local.dayDelta !== 0 && <span>{dayNote(local.dayDelta)}</span>}
                </p>
                <div className={styles.band} aria-hidden="true">
                  {slots.map((slot, i) => <i key={i} data-working={slot.working} data-selected={i === slotIndex} />)}
                </div>
                <p className={styles.work} data-working={local.working}>
                  {local.working ? "工作时段内" : "非工作时段"}
                </p>
                {offsets.length > 1 && <p className={styles.offsetNote}>当天 UTC 偏移切换：{offsets.join(" → ")}</p>}
              </article>
            );
          })}
        </div>
        <footer className={styles.summary}>
          <div>
            <p><b>{schedule && selectedText}</b>{schedule && (slotSelected ? " · 全员工作时间内" : " · 并非所有城市都在工作时间内")}</p>
            <small>时区以浏览器内置规则为准，工作时间仅作排期参考；不上传选择。</small>
          </div>
          <button type="button" disabled={!schedule} className={styles.copy} onClick={copyPlan}>复制方案 <span aria-hidden="true">↗</span></button>
          <p className={styles.feedback} role="status">{feedback}</p>
          {fallback && <textarea className={styles.fallback} aria-label="可复制的会议时间方案" readOnly value={fallback} onFocus={event => event.currentTarget.select()} />}
        </footer>
      </section>
    </main>
  );
}
