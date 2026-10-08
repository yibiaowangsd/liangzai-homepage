/** One subtle content entry; never cover a page that is already visible. */
export function shouldEnterPage(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return ["/", "/storybook", "/archive", "/pqc-arsenal", "/pqc-practice", "/pqc-practice/index.html", "/pqc-practice/audit", "/news"].includes(path)
    || path.startsWith("/news/");
}

export function runPageArrival(pathname = location.pathname) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const paused = () => {
    try { return localStorage.getItem("liangzai-motion") === "paused"; } catch { return false; }
  };
  if (!shouldEnterPage(pathname) || document.hidden || reduced.matches || paused()) return () => {};
  const content = document.querySelector<HTMLElement>("#main-content, body > .page");
  if (!content) return () => {};

  let animation: Animation | undefined;
  let finished = false;
  const dispose = () => {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    animation?.cancel();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", dispose);
    window.removeEventListener("liangzai-motion-change", onPreference);
    window.removeEventListener("storage", onPreference);
    reduced.removeEventListener("change", onPreference);
  };
  const onVisibility = () => { if (document.hidden) dispose(); };
  const onPreference = () => { if (reduced.matches || paused()) dispose(); };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose);
  window.addEventListener("liangzai-motion-change", onPreference);
  window.addEventListener("storage", onPreference);
  reduced.addEventListener("change", onPreference);
  const deadline = setTimeout(dispose, 1000);
  try {
    animation = content.animate([
      { opacity: .86, transform: "translateY(12px)" },
      { opacity: 1, transform: "none" },
    ], { duration: 560, easing: "cubic-bezier(.22,1,.36,1)" });
    animation.id = "page-arrival";
    void animation.finished.then(dispose, dispose);
  } catch { dispose(); }
  return dispose;
}
