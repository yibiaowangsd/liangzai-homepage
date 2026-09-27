/** A short, non-blocking curtain reveal, shared by React and the standalone lab. */
export function shouldEnterPage(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return ["/", "/storybook", "/archive", "/pqc-arsenal", "/pqc-practice/index.html", "/pqc-practice/audit.html"].includes(path);
}

export function runPageArrival() {
  if (!shouldEnterPage(location.pathname) || document.hidden ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  try { if (localStorage.getItem("liangzai-motion") === "paused") return () => {}; } catch {}

  const curtain = document.createElement("div");
  curtain.className = "page-arrival";
  curtain.setAttribute("aria-hidden", "true");
  document.body.append(curtain);
  let animation: Animation | undefined;
  let finished = false;
  const dispose = () => {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    animation?.cancel();
    curtain.remove();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", dispose);
  };
  const onVisibility = () => { if (document.hidden) dispose(); };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose);
  // A busy standalone page must never leave a persistent curtain behind.
  const deadline = setTimeout(dispose, 1200);
  try {
    animation = curtain.animate([
      { transform: "translateY(0)" },
      { transform: "translateY(-102%)" },
    ], { duration: 720, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
    void animation.finished.then(dispose, dispose);
  } catch { dispose(); }
  return dispose;
}
