import { gsap } from "gsap";
import { createAboutPushImage } from "./about-push-image";
import "./about-push.css";
type PushScene = Awaited<ReturnType<typeof import("./three/about-push-scene").createAboutPushScene>>;
import { freezePage } from "./page-snapshot";

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
  // The standalone laboratory paints its paper background on body, not .page.
  page.style.background = getComputedStyle(document.body).background;
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
      const motion = { edge: 0, approach: 0 };
      actor.style.visibility = "visible";
      timeline = gsap.timeline({ id: "about-push", onComplete: () => finish(), onUpdate() {
        if (!scene) return;
        // Distance-driven gait stays still during the planted anticipation beat.
        scene.pose.stride = motion.edge / width * 4.8;
        scene.render(timeline!.time());
        const reach = width * (1 - motion.approach) + scene.contactX * width * motion.approach;
        gsap.set(page, { x: motion.edge });
        gsap.set(actor, { x: motion.edge - reach });
      } });
      // Overlapping weight shifts replace the abrupt recoil and rigid, uniform march.
      timeline.to(motion, { approach: 1, duration: .46, ease: "sine.inOut" }, 0)
        .to(scene.pose, { leftReach: 1, duration: .4, ease: "sine.inOut" }, .08)
        .to(scene.pose, { rightReach: 1, duration: .4, ease: "sine.inOut" }, .18)
        .to(scene.pose, { effort: .7, lean: .12, walking: .8, duration: .4, ease: "sine.inOut" }, .12)
        .to(motion, { edge: width * .82, duration: .65, ease: "sine.inOut" }, .2)
        .to(scene.pose, { walking: 0, compression: 1, lean: .17, duration: .26, ease: "sine.inOut" }, .68)
        .to(scene.pose, { effort: 1, lean: .27, duration: .35, ease: "sine.inOut" }, .88)
        .to(scene.pose, { walking: 1, compression: .3, duration: .42, ease: "sine.inOut" }, 1.04)
        .to(motion, { edge: innerWidth + width, duration: 2, ease: "power1.inOut" }, 1.04)
        .to(scene.pose, { lean: .20, effort: .85, compression: .08, duration: .65, ease: "sine.inOut" }, 2.1);

    });
  };
  void (async () => {
    try {
      let loaded: PushScene;
      try {
        const { createAboutPushScene } = await import("./three/about-push-scene");
        if (done) return;
        loaded = await createAboutPushScene(canvas, AbortSignal.any([controller.signal, AbortSignal.timeout(2200)]));
      } catch {
        if (done) return;
        canvas.hidden = true;
        loaded = await createAboutPushImage(actor, controller.signal);
      }
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
