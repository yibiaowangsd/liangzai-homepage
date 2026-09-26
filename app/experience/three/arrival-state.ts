export type ArrivalPhase = "nebula" | "gathering" | "revealing" | "formed";

/** Hold is reversible until the silhouette locks; the final reveal then completes itself. */
export function createArrivalState() {
  let progress = 0, holding = false, settledSeconds = 0;
  const phase = (): ArrivalPhase => progress >= 1 ? "formed" : progress >= .78 ? "revealing" : progress > 0 ? "gathering" : "nebula";
  return {
    get progress() { return progress; },
    get phase() { return phase(); },
    get afterglow() { return progress>=1 ? Math.max(0,1-settledSeconds/3) : 0; },
    get active() { return holding || (progress > 0 && progress < 1) || (progress>=1&&settledSeconds<3); },
    hold(value: boolean) { holding = value && progress < .78; },
    reset() { progress = 0; holding = false; settledSeconds = 0; },
    step(seconds: number) {
      const dt = Math.min(Math.max(seconds, 0), .06);
      if(progress>=1)settledSeconds=Math.min(3,settledSeconds+dt);
      if (progress >= .78) { holding = false; progress = Math.min(1, progress + dt * .17); }
      else if (holding) progress = Math.min(.78, progress + dt * .195);
      else progress = Math.max(0, progress - dt * .32);
      return progress;
    },
  };
}


/** Each exhibit keeps its own arrival state until the page is left. */
export function createArrivalMemory() {
  const states = new Map<string,ReturnType<typeof createArrivalState>>();
  return { select(mode:string) {
    for(const state of states.values())state.hold(false);
    let state=states.get(mode);
    if(!state){state=createArrivalState();states.set(mode,state);}
    return state;
  }};
}
