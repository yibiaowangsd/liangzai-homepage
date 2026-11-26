"use client";

import { isLocale, localeCookie, locales } from "./locales";
import { useSiteLanguage } from "./LocaleProvider";
import "./language-picker.css";

export default function LanguagePicker() {
  const { locale, chrome } = useSiteLanguage();

  function selectLanguage(value: string) {
    if (!isLocale(value) || value === locale) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${localeCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    // All translated server content and metadata are rendered with the new cookie.
    window.location.reload();
  }

  return (
    <label className="language-picker">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
        <ellipse cx="10" cy="10" rx="3.5" ry="8" />
        <path d="M2 10h16" />
      </svg>
      <span aria-hidden="true">{locales[locale].short}</span>
      <select aria-label={chrome.settings.language} value={locale} onChange={event => selectLanguage(event.currentTarget.value)}>
        {Object.entries(locales).map(([code, details]) => (
          <option key={code} value={code} lang={code}>{details.name}</option>
        ))}
      </select>
    </label>
  );
}
