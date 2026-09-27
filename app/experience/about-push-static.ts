import { runAboutPush } from "./about-push";

// The laboratory is a standalone HTML application. Keep it alive above a real,
// same-origin About page until the same 3D push has finished, then hand off.
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
  const frame = document.createElement('iframe');
  frame.title = '关于我';
  frame.className = 'about-push__destination';
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  let navigating = false;
  runAboutPush(source, {
    navigate(ready) {
      if (!ready) { location.assign(url.href); return; }
      navigating = true;
      frame.onload = () => {
        // The frame has its own styles, fonts and hydrated personal page.
        ready();
      };
      frame.src = url.href;
      document.body.append(frame);
    },
    complete(continueNavigation) {
      if (navigating && continueNavigation) location.assign(url.href);
      else { frame.remove(); busy = false; }
    },
  });
}, true);
