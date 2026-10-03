"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("liangzai:theme-change", onChange);
  return () => window.removeEventListener("liangzai:theme-change", onChange);
}

function getPreference() {
  return document.documentElement.dataset.themePreference || "system";
}

// A stable server snapshot keeps hydration independent of browser preference.
function getServerPreference() { return "system"; }

export default function ThemePicker() {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  return (
    <label className="theme-picker">
      <span className="theme-picker-swatch" aria-hidden="true" />
      <span className="theme-picker-label">主题</span>
      <select
        aria-label="页面主题"
        data-theme-select="react"
        value={preference}
        onChange={(event) => window.dispatchEvent(new CustomEvent("liangzai:theme-request", {
          detail: event.currentTarget.value,
        }))}
      >
        <option value="system">跟随系统</option>
        <option value="paper">纸白</option>
        <option value="midnight">午夜</option>
        <option value="mist">雾青</option>
        <option value="sand">暖沙</option>
      </select>
    </label>
  );
}
