type FrameSchedulerOptions = {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
  canRender(): boolean;
  continuous(): boolean;
  fps(): number;
  render(nowMs: number, deltaSeconds: number): void;
};

/** One owner for GPU submissions; invalidations never draw synchronously. */
export function createFrameScheduler(options: FrameSchedulerOptions) {
  let frame: number | null = null;
  let dirty = false;
  let disposed = false;
  let lastFrame: number | null = null;

  function schedule() {
    if (!disposed && frame === null && options.canRender() && (dirty || options.continuous())) {
      frame = options.requestFrame(tick);
    }
  }

  function tick(now: number) {
    frame = null;
    if (disposed || !options.canRender()) {
      lastFrame = null;
      return;
    }
    const continuous = options.continuous();
    const elapsed = lastFrame === null ? 0 : (now - lastFrame) / 1000;
    // Preserve the existing 30/45 FPS budget, including during pose tweens.
    if (continuous && lastFrame !== null && elapsed < 1 / options.fps()) {
      schedule();
      return;
    }
    if (!dirty && !continuous) return;
    dirty = false;
    lastFrame = now;
    options.render(now, Math.min(elapsed, 0.06));
    schedule();
  }

  return {
    invalidate() {
      if (disposed) return;
      dirty = true;
      schedule();
    },
    sync() {
      if (disposed) return;
      if (!options.canRender()) {
        if (frame !== null) options.cancelFrame(frame);
        frame = null;
        lastFrame = null;
      } else {
        schedule();
      }
    },
    dispose() {
      disposed = true;
      if (frame !== null) options.cancelFrame(frame);
      frame = null;
      dirty = false;
    },
  };
}

/** Pose changes update immediately; gentle idle bobbing updates at most 10 Hz. */
export function createShadowBudget(intervalMs = 100) {
  let dirty = true;
  let lastUpdate = -Infinity;
  return {
    invalidate() { dirty = true; },
    shouldUpdate(nowMs: number, idleMotion: boolean) {
      if (!dirty && (!idleMotion || nowMs - lastUpdate < intervalMs)) return false;
      dirty = false;
      lastUpdate = nowMs;
      return true;
    },
  };
}
