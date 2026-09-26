export type ArrivalPhase = "nebula" | "gathering" | "revealing" | "formed";

/** Hold is reversible until the silhouette locks; the final reveal then completes itself. */
export function createArrivalState() {
  let progress = 0, holding = false;
  const phase = (): ArrivalPhase => progress >= 1 ? "formed" : progress >= .78 ? "revealing" : progress > 0 ? "gathering" : "nebula";
  return {
    get progress() { return progress; },
    get phase() { return phase(); },
    get active() { return holding || (progress > 0 && progress < 1); },
    hold(value: boolean) { holding = value && progress < .78; },
    reset() { progress = 0; holding = false; },
    step(seconds: number) {
      const dt = Math.min(Math.max(seconds, 0), .06);
      if (progress >= .78) { holding = false; progress = Math.min(1, progress + dt * .17); }
      else if (holding) progress = Math.min(.78, progress + dt * .195);
      else progress = Math.max(0, progress - dt * .32);
      return progress;
    },
  };
}
