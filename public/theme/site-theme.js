/* Shared, deliberately parser-blocking bootstrap: apply the palette before either
 * the React app or standalone laboratory can paint. No application state is read
 * or replaced. Keep this outside /assets, whose delivery policy is immutable. */
(function () {
  "use strict";

  var storageKey = "liangzai-theme";
  var palettes = {
    paper: "#F6F5EF",
    midnight: "#101820",
  };
  var root = document.documentElement;

  function isTheme(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(palettes, value);
  }

  function readPreference(fallback) {
    try {
      var saved = window.localStorage.getItem(storageKey);
      return isTheme(saved) ? saved : "paper";
    } catch {
      return fallback || "paper";
    }
  }

  var preference = readPreference("paper");

  function syncControls() {
    document.querySelectorAll('[data-theme-select="static"]').forEach(function (select) {
      select.value = preference;
    });
  }

  function apply() {
    var theme = preference;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = theme === "midnight" ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", palettes[theme]);
    syncControls();
    window.dispatchEvent(new CustomEvent("liangzai:theme-change"));
  }

  function setPreference(value) {
    if (!isTheme(value)) return;
    preference = value;
    try {
      window.localStorage.setItem(storageKey, preference);
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
    preference = isTheme(event.newValue) ? event.newValue : "paper";
    apply();
  });
  window.addEventListener("pageshow", function () {
    preference = readPreference(preference);
    apply();
  });
  document.addEventListener("change", function (event) {
    var target = event.target;
    if (target && target.matches && target.matches('[data-theme-select="static"]')) {
      setPreference(target.value);
    }
  });
  document.addEventListener("DOMContentLoaded", syncControls, { once: true });
  apply();
})();
