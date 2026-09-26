export type FusionPhase = "idle" | "charging" | "merging" | "fused";
/** A second intentional hold. Dragging cancels charge; committed fusion completes itself. */
export function createFusionState() {
  let charge=0,progress=0,holding=false,committed=false;
  return {
    get phase():FusionPhase { return progress>=1?"fused":committed?"merging":charge>0?"charging":"idle"; },
    get charge(){return charge;},get progress(){return progress;},
    get active(){return holding||charge>0&&!committed||committed&&progress<1;},
    hold(value:boolean){holding=value&&!committed;},
    reset(){charge=progress=0;holding=committed=false;},
    step(seconds:number){
      const dt=Math.min(.06,Math.max(0,seconds));
      if(committed){progress=Math.min(1,progress+dt/4.2);return;}
      charge=Math.max(0,Math.min(1,charge+dt*(holding?.5:-1.5)));
      if(charge>=1){committed=true;holding=false;}
    },
  };
}
