import { Vector2, Vector3, Vector4 } from "three";

export const WAKE_LIFETIME = .34;
export const WAKE_SEGMENTS = 6;

/** Deposited strokes stay where the mouse actually travelled; they never chase it. */
export function createNebulaWake() {
  const segments = Array.from({ length: WAKE_SEGMENTS }, () => new Vector4());
  const metadata = Array.from({ length: WAKE_SEGMENTS }, () => new Vector2(-100, 0));
  const pointer = new Vector3();
  let previous: { x: number; y: number; time: number } | null = null;
  let next = 0, active = false, lastMove = -100;
  return {
    segments, metadata, pointer,
    sample(x: number, y: number, now: number) {
      active = true;
      pointer.set(x, y, 1);
      const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
      // Entering or returning after a pause must not draw a bridge across the scene.
      if (previous && now - previous.time < .12 && distance > .002) {
        const speed = distance / Math.max(.008, now - previous.time);
        segments[next].set(previous.x, previous.y, x, y);
        metadata[next].set(now, .38 + .30 * Math.min(1, speed / 12));
        next = (next + 1) % WAKE_SEGMENTS;
      }
      if (!previous || distance > .002) lastMove = now;
      previous = { x, y, time: now };
    },
    update(now: number) {
      // A stationary pointer cannot keep refreshing an old stroke's lifetime.
      pointer.z = active ? Math.max(0, 1 - (now - lastMove) / WAKE_LIFETIME) : 0;
      for (const item of metadata) if (now - item.x >= WAKE_LIFETIME) item.y = 0;
    },
    leave() { previous = null; active = false; pointer.z = 0; },
    clear() {
      previous = null; active = false; next = 0; lastMove = -100;
      pointer.set(0, 0, 0);
      for (const item of metadata) item.set(-100, 0);
    },
  };
}
