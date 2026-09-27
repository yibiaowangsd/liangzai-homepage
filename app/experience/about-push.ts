import { gsap } from "gsap";
import "./about-push.css";
type PushScene = Awaited<ReturnType<typeof import("./three/about-push-scene").createAboutPushScene>>;
/** Freeze the actual viewport, including form values, scrollers and WebGL pixels. */
function freezePage(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  originals.forEach((original, index) => {
    const copy = copies[index];
    const position = getComputedStyle(original).position;
    if (position === "fixed" || position === "sticky") {
      const rect = original.getBoundingClientRect();
      // Portaled to the snapshot root so transformed ancestors cannot displace it.
      clone.append(copy);
      Object.assign(copy.style, { position: "absolute", top: `${rect.top + scrollY}px`, left: `${rect.left + scrollX}px`, width: `${rect.width}px`, height: `${rect.height}px`, bottom: "auto", right: "auto", margin: "0", transform: "none" });
    }
    if (original instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
      copy.width = original.width; copy.height = original.height;
      const context = copy.getContext("2d");
      if (context) {
        try { context.drawImage(original, 0, 0); } catch { /* A missing frame must never block navigation. */ }
        // WebGL clears its drawing buffer after compositing: ask its owner for one fresh frame.
        original.dispatchEvent(new CustomEvent("liangzai:snapshot", { detail: context }));
      }
    }
    if (original instanceof HTMLInputElement && copy instanceof HTMLInputElement) { copy.value = original.value; copy.checked = original.checked; }
    if (original instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) copy.value = original.value;
    if (original instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) copy.selectedIndex = original.selectedIndex;
    copy.removeAttribute("id");
  });
  clone.style.width = `${innerWidth}px`;
  clone.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
  clone.setAttribute("aria-hidden", "true");
  clone.inert = true;
  return { clone, restoreScrollers() {
    originals.forEach((original, index) => {
      copies[index].scrollTop = original.scrollTop;
      copies[index].scrollLeft = original.scrollLeft;
    });
  } };
}

export function runAboutPush(source: HTMLElement, options: {
  navigate(ready?: () => void): void;
  complete(continueNavigation: boolean): void;
}) {
  const controller = new AbortController();
  const overlay = document.createElement("div");
  overlay.className = "about-push";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-label", "量仔正在推开页面，进入关于我");
  const page = document.createElement("div");
  page.className = "about-push__page";
  const actor = document.createElement("div");
  actor.className = "about-push__actor";
  actor.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  const shadow = document.createElement("div");
  shadow.className = "about-push__shadow";
  actor.append(shadow, canvas);
  const skip = document.createElement("button");
  skip.className = "about-push__skip";
  skip.textContent = "跳过动画";
  overlay.append(page, actor, skip);
  document.body.append(overlay);
  let scene: PushScene | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let done = false, navigated = false, started = false;
  let timeout: ReturnType<typeof setTimeout>;
  let frame = 0;
  const previousOverflow = document.body.style.overflow;
  const previousInert = source.inert;
  const finish = (navigate = false, cancelled = false) => {
    if (done) return;
    done = true;
    clearTimeout(timeout);
    cancelAnimationFrame(frame);
    controller.abort();
    timeline?.kill();
    scene?.dispose();
  
    overlay.remove();
    source.inert = previousInert;
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("keydown", key);
    window.removeEventListener("popstate", back);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", visibility);
    options.complete(!cancelled);
    if (navigate && !navigated) options.navigate();
    if (location.pathname.replace(/\/$/, "") === "/about") {
      const heading = source.querySelector<HTMLElement>("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  };
  const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); finish(true); } };
  const back = () => finish(false, true);
  const resize = () => finish(true);
  const visibility = () => { if (document.hidden) finish(true); };
  skip.onclick = () => finish(true);
  window.addEventListener("keydown", key);
  window.addEventListener("popstate", back);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);

  // Covers slow module/model loads and failed route requests; never trap the visitor.
  timeout = setTimeout(() => finish(true), 6500);
  const begin = () => {
    if (done || started || !scene) return;
    started = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => finish(true), 4500);
    frame = requestAnimationFrame(() => {
      if (done || !scene) return;
      const width = actor.offsetWidth;
      // Both the page edge and the actor derive from this same displacement.
      const motion = { edge: 0, enter: -width, stride: 0 };
      actor.style.visibility = "visible";
      timeline = gsap.timeline({ id: "about-push", onComplete: () => finish(), onUpdate() {
        if (!scene) return;
        gsap.set(page, { x: motion.edge });
        gsap.set(actor, { x: motion.edge + motion.enter });
        scene.pose.stride = motion.stride;
        scene.render(timeline!.time());
      } });
      // Arrive, plant both palms, recoil with effort, then accelerate the heavy page.
      timeline.to(motion, { enter: -width * .76, duration: .32, ease: "power2.out" }, 0)
        .to(scene.pose, { effort: 1, lean: .18, duration: .28 }, .18)
        .to(motion, { edge: width * .84, duration: .44, ease: "power2.out" }, .26)
        .to(motion, { stride: Math.PI * 3, duration: .7, ease: "none" }, 0)
        .to(motion, { edge: width * .84 + 12, duration: .16, ease: "power2.out" }, .7)
        .to(motion, { edge: width * .84 - 4, duration: .15, ease: "power1.inOut" }, .86)
        .to(scene.pose, { lean: .28, duration: .18 }, .86)
        .to(motion, { edge: innerWidth + width, duration: 1.35, ease: "power2.in" }, 1.05)
        .to(motion, { stride: Math.PI * 13, duration: 1.35, ease: "power1.in" }, 1.05)
        .to(scene.pose, { effort: .8, lean: .22, duration: .3 }, 2);

    });
  };
  void (async () => {
    try {
      const { createAboutPushScene } = await import("./three/about-push-scene");
      if (done) return;
      const loaded = await createAboutPushScene(canvas, AbortSignal.any([controller.signal, AbortSignal.timeout(2200)]));
      if (done) { loaded.dispose(); return; }
      scene = loaded;
      const frozen = freezePage(source);
      page.append(frozen.clone);
      frozen.restoreScrollers();
      // Preserve homepage-specific ancestor styles while the real route unmounts.
      page.classList.toggle("liangzai-home-active", document.body.classList.contains("liangzai-home-active"));
      page.classList.add("about-push__page--ready");
      document.body.style.overflow = "hidden";
      source.inert = true;
      skip.focus({ preventScroll: true });
      navigated = true;
      options.navigate(begin);
    } catch { finish(true); }
  })();
  return { cancel: finish };
}
