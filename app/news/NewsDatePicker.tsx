"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { isEditionDate, monthCells, monthLabel, shiftEditionDate, shiftEditionMonth } from "./calendar";
import { newsListingHref } from "./navigation";
import { formatEditionDate } from "./news-api";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

export default function NewsDatePicker({
  date,
  dates: rawDates,
  category,
  variant = "toolbar",
}: {
  date: string;
  dates: string[];
  category?: string;
  variant?: "toolbar" | "stamp" | "heading";
}) {
  const router = useRouter();
  const id = useId();
  const popoverId = "news-calendar-" + id;
  const hintId = popoverId + "-hint";
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const focusDay = useRef(false);
  const dates = [...new Set(rawDates.filter(isEditionDate))].sort().reverse();
  const available = new Set(dates);
  const initialDate = available.has(date) ? date : dates.find(value => value <= date) || dates.at(-1) || date;
  const firstMonth = (dates.at(-1) || date).slice(0, 7);
  const lastMonth = (dates[0] || date).slice(0, 7);
  const months: string[] = [];
  for (let value = firstMonth; value <= lastMonth; value = shiftEditionMonth(value + "-01", 1).slice(0, 7)) {
    months.push(value);
  }
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [focusedDate, setFocusedDate] = useState(initialDate);
  const cells = monthCells(month);
  const monthIndex = months.indexOf(month);

  // A native popover stays above the sticky toolbar and closes on outside click
  // or Escape. Position it within the viewport, including short mobile screens.
  useEffect(() => {
    if (!open) return;
    function position() {
      if (!trigger.current || !calendar.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const width = calendar.current.offsetWidth;
      const height = calendar.current.offsetHeight;
      const left = Math.max(12, Math.min(anchor.left + (anchor.width - width) / 2, window.innerWidth - width - 12));
      const below = anchor.bottom + 8;
      const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, anchor.top - height - 8);
      calendar.current.style.left = left + "px";
      calendar.current.style.top = Math.min(top, Math.max(12, window.innerHeight - height - 12)) + "px";
    }
    position();
    if (focusDay.current) {
      calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus({ preventScroll: true });
      focusDay.current = false;
    }
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, month, focusedDate]);

  function showMonth(value: string) {
    const next = dates.find(day => day.startsWith(value)) || value + "-01";
    setMonth(value);
    setFocusedDate(next);
  }

  function chooseDate(value: string) {
    if (!available.has(value)) return;
    calendar.current?.hidePopover();
    router.push(newsListingHref({ page: 1, date: value, category }));
  }

  function navigateDays(event: KeyboardEvent<HTMLButtonElement>, value: string) {
    let next: string;
    const weekday = (new Date(value + "T00:00:00Z").getUTCDay() + 6) % 7;
    switch (event.key) {
      case "ArrowLeft": next = shiftEditionDate(value, -1); break;
      case "ArrowRight": next = shiftEditionDate(value, 1); break;
      case "ArrowUp": next = shiftEditionDate(value, -7); break;
      case "ArrowDown": next = shiftEditionDate(value, 7); break;
      case "Home": next = shiftEditionDate(value, -weekday); break;
      case "End": next = shiftEditionDate(value, 6 - weekday); break;
      case "PageUp": next = shiftEditionMonth(value, -1); break;
      case "PageDown": next = shiftEditionMonth(value, 1); break;
      default: return;
    }
    event.preventDefault();
    if (next.slice(0, 7) < firstMonth || next.slice(0, 7) > lastMonth) return;
    focusDay.current = true;
    setMonth(next.slice(0, 7));
    setFocusedDate(next);
  }

  const dateButton = (
    <button
      ref={trigger}
      type="button"
      className="news-date-trigger"
      popoverTarget={popoverId}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={popoverId}
      aria-label={formatEditionDate(date) + "，选择日刊日期"}
    >
      <time dateTime={date}>{variant === "stamp" ? date.replaceAll("-", ".") : formatEditionDate(date)}</time>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-12 4h2m2 0h2" />
      </svg>
    </button>
  );

  return (
    <div className={"news-date-picker news-date-picker--" + variant}>
      {variant === "heading" ? <h2>{dateButton}</h2> : dateButton}
      <div
        ref={calendar}
        id={popoverId}
        className="news-calendar"
        popover="auto"
        role="dialog"
        aria-label="选择日刊日期"
        aria-describedby={hintId}
        onBeforeToggle={event => {
          if ((event.nativeEvent as ToggleEvent).newState === "open") {
            focusDay.current = true;
            setMonth(initialDate.slice(0, 7));
            setFocusedDate(initialDate);
          }
        }}
        onToggle={event => setOpen((event.nativeEvent as ToggleEvent).newState === "open")}
      >
        <header className="news-calendar-header">
          <strong>选择日刊日期</strong>
          <button type="button" aria-label="关闭日历" popoverTarget={popoverId} popoverTargetAction="hide">×</button>
        </header>
        <div className="news-calendar-month-nav">
          <button type="button" aria-label="上一个月" disabled={monthIndex <= 0} onClick={() => showMonth(months[monthIndex - 1])}>‹</button>
          <select aria-label="选择月份" value={month} onChange={event => showMonth(event.target.value)}>
            {months.map(value => <option value={value} key={value}>{monthLabel(value)}</option>)}
          </select>
          <button type="button" aria-label="下一个月" disabled={monthIndex >= months.length - 1} onClick={() => showMonth(months[monthIndex + 1])}>›</button>
        </div>
        <p className="news-calendar-announcement" aria-live="polite">{monthLabel(month)}</p>
        <table className="news-calendar-grid" role="grid" aria-label={monthLabel(month)}>
          <thead><tr>{weekdays.map(day => <th scope="col" key={day} abbr={"星期" + day}>{day}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <tr key={week}>
                {cells.slice(week * 7, week * 7 + 7).map((value, index) => (
                  <td key={value || index} aria-selected={value === date}>
                    {value && <button
                      type="button"
                      data-date={value}
                      className={available.has(value) ? "is-published" : undefined}
                      aria-label={formatEditionDate(value) + (available.has(value) ? "，已发布日报" : "，暂无日报")}
                      aria-disabled={!available.has(value)}
                      tabIndex={value === focusedDate ? 0 : -1}
                      onFocus={() => setFocusedDate(value)}
                      onKeyDown={event => navigateDays(event, value)}
                      onClick={() => chooseDate(value)}
                    >{Number(value.slice(-2))}</button>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="news-calendar-footer">
          <p id={hintId}>仅可选择已发布的日刊</p>
          <button type="button" disabled={!dates.length} onClick={() => chooseDate(dates[0])}>最新一期</button>
        </footer>
      </div>
    </div>
  );
}
