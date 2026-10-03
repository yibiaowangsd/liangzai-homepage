import { runAboutPush } from "./about-push";
import { runPageArrival } from "./page-arrival";

runPageArrival();

// The laboratory is a standalone document. Push it away, then navigate once.
// An iframe preview followed by a top-level visit loads and reveals About twice.
let busy = false;
document.addEventListener("click", event => {
  if (!(event.target instanceof Element) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname.replace(/\/$/, '') !== '/about') return;
  let paused = false;
  try { paused = localStorage.getItem('liangzai-motion') === 'paused'; } catch {}
  if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const source = document.querySelector<HTMLElement>('body > .page');
  if (!source) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (busy) return;
  busy = true;
  // Release the native dialog top layer and its scroll lock before snapshotting.
  document.dispatchEvent(new Event("liangzai:close-directory"));
  const visibility = source.style.visibility;
  let navigating = false;
  const navigateOnce = () => {
    if (navigating) return;
    navigating = true;
    // Keep the old document hidden during the handoff, including slow networks.
    source.style.visibility = "hidden";
    location.assign(url.href);
  };
  const restore = () => {
    source.style.visibility = visibility;
    busy = false;
    navigating = false;
  };
  // BFCache restores the laboratory as it was left, so undo our hiding then.
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    window.removeEventListener("pageshow", onPageShow);
    restore();
  };
  window.addEventListener("pageshow", onPageShow);
  runAboutPush(source, {
    navigate(ready) {
      if (!ready) { navigateOnce(); return; }
      source.style.visibility = "hidden";
      ready();
    },
    complete(continueNavigation) {
      if (continueNavigation) navigateOnce();
      else {
        window.removeEventListener("pageshow", onPageShow);
        restore();
      }
    },
  });
}, true);
