"use client";

import { useSyncExternalStore } from "react";
import { useSiteLanguage } from "../i18n/LocaleProvider";

function subscribe(onChange: () => void) {
  window.addEventListener("liangzai:theme-change", onChange);
  return () => window.removeEventListener("liangzai:theme-change", onChange);
}

function getPreference() {
  return document.documentElement.dataset.themePreference || "paper";
}

// A stable server snapshot keeps hydration independent of browser preference.
function getServerPreference() { return "paper"; }

export default function ThemePicker() {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  const { chrome: { settings } } = useSiteLanguage();
  return (
    <label className="theme-picker">
      <span className="theme-picker-swatch" aria-hidden="true" />
      <select
        aria-label={settings.theme}
        data-theme-select="react"
        value={preference}
        onChange={(event) => window.dispatchEvent(new CustomEvent("liangzai:theme-request", {
          detail: event.currentTarget.value,
        }))}
      >
        <option value="paper">{settings.paper}</option>
        <option value="midnight">{settings.midnight}</option>
      </select>
    </label>
  );
}
