/* Shared, deliberately parser-blocking bootstrap: apply the palette before either
 * the React app or standalone laboratory can paint. No application state is read
 * or replaced. Keep this outside /assets, whose delivery policy is immutable. */
(function () {
  "use strict";

  var storageKey = "liangzai-theme";
  var palettes = {
    paper: "#F6F5EF",
    midnight: "#101820",
    mist: "#EEF5F5",
    sand: "#F4EEE5",
  };
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function isTheme(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(palettes, value);
  }

  function readPreference(fallback) {
    try {
      var saved = window.localStorage.getItem(storageKey);
      return isTheme(saved) ? saved : null;
    } catch {
      return fallback || null;
    }
  }

  var preference = readPreference(null);

  function syncControls() {
    document.querySelectorAll('[data-theme-select="static"]').forEach(function (select) {
      select.value = preference || "system";
    });
  }

  function apply() {
    var theme = preference || (media && media.matches ? "midnight" : "paper");
    root.dataset.theme = theme;
    root.dataset.themePreference = preference || "system";
    root.style.colorScheme = theme === "midnight" ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", palettes[theme]);
    syncControls();
    window.dispatchEvent(new CustomEvent("liangzai:theme-change"));
  }

  function setPreference(value) {
    if (value !== "system" && !isTheme(value)) return;
    preference = value === "system" ? null : value;
    try {
      if (preference) window.localStorage.setItem(storageKey, preference);
      else window.localStorage.removeItem(storageKey);
    } catch {
      // Private/blocked storage still permits a theme for this document session.
    }
    apply();
  }

  window.LiangzaiTheme = { setPreference: setPreference };
  window.addEventListener("liangzai:theme-request", function (event) {
    setPreference(event.detail);
  });
  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    preference = isTheme(event.newValue) ? event.newValue : null;
    apply();
  });
  window.addEventListener("pageshow", function () {
    preference = readPreference(preference);
    apply();
  });
  if (media) {
    var onSystemChange = function () { if (!preference) apply(); };
    if (media.addEventListener) media.addEventListener("change", onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }
  document.addEventListener("change", function (event) {
    var target = event.target;
    if (target && target.matches && target.matches('[data-theme-select="static"]')) {
      setPreference(target.value);
    }
  });
  document.addEventListener("DOMContentLoaded", syncControls, { once: true });
  apply();
})();
