import { createMetalRenderer } from "./metal-card-renderer";

export type MetalSessionState = "starting" | "ready" | "restoring" | "failed" | "blocked" | "disposed";
type Backend = ReturnType<typeof createMetalRenderer>;
type Notify = (state: MetalSessionState, error?: Error) => void;

/** Own one canvas. Recovery follows browser events; it never forces a context reset. */
export function createMetalSession(
  canvas: HTMLCanvasElement,
  notify: Notify,
  create: (canvas: HTMLCanvasElement) => Backend = createMetalRenderer,
) {
  let renderer: Backend | null = null;
  let state: MetalSessionState = "starting";
  let closed = false;
  const change = (next: MetalSessionState, error?: Error) => { state = next; notify(next, error); };
  const release = () => { const previous = renderer; renderer = null; previous?.dispose(); };
  function fail(reason: unknown) {
    release();
    const error = reason instanceof Error ? reason : new Error(String(reason));
    change(/web page caused context loss and was blocked/i.test(error.message) ? "blocked" : "failed", error);
  }
  function initialize() {
    change("starting");
    try {
      renderer = create(canvas);
      change("ready");
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }
  function suspend() {
    if (closed || state === "restoring" || state === "blocked") return;
    release();
    change("restoring");
  }
  function lost(event: Event) {
    // Opt in to browser-managed restoration. Do not create another context here.
    event.preventDefault();
    suspend();
  }
  function restored() {
    if (!closed && state === "restoring") initialize();
  }
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  initialize();
  return {
    get state() { return state; },
    draw(time: number, x: number, y: number, light: number) {
      if (closed || state !== "ready" || !renderer) return false;
      try {
        if (!renderer.render(time, x, y, light)) { suspend(); return false; }
        return true;
      } catch (error) { fail(error); return false; }
    },
    retry() {
      // Chromium's domain block belongs to the browser. Repeated context
      // creation cannot clear it and must not turn into an allocation loop.
      if (closed || state === "blocked" || state === "restoring") return false;
      if (state === "ready") return true;
      return initialize();
    },
    dispose() {
      if (closed) return;
      closed = true;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      release();
      state = "disposed";
    },
  };
}
