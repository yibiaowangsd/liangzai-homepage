"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("liangzai:theme-change", onChange);
  return () => window.removeEventListener("liangzai:theme-change", onChange);
}

function getPreference() {
  return document.documentElement.dataset.themePreference || "paper";
}

// A stable server snapshot keeps hydration independent of browser preference.
function getServerPreference() { return "paper"; }

export default function ThemePicker({ en = false }: { en?: boolean }) {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  return (
    <label className="theme-picker">
      <span className="theme-picker-swatch" aria-hidden="true" />
      <span className="theme-picker-label">{en ? "Theme" : "主题"}</span>
      <select
        aria-label={en ? "Page theme" : "页面主题"}
        data-theme-select="react"
        value={preference}
        onChange={(event) => window.dispatchEvent(new CustomEvent("liangzai:theme-request", {
          detail: event.currentTarget.value,
        }))}
      >
        <option value="paper">{en ? "Paper" : "纸白"}</option>
        <option value="midnight">{en ? "Midnight" : "午夜"}</option>
      </select>
    </label>
  );
}
