export type FusionPhase = "idle" | "charging" | "merging" | "fused" | "docked";
/** A second intentional hold. Dragging cancels charge; committed fusion completes itself. */
export function createFusionState() {
  let charge=0,progress=0,holding=false,committed=false,settledSeconds=0,docked=false;
  return {
    get phase():FusionPhase { return progress>=1?(docked?"docked":"fused"):committed?"merging":charge>0?"charging":"idle"; },
    get suppressClick(){return committed?progress<1:charge>.12;},
    get charge(){return charge;},get progress(){return progress;},
    get afterglow(){return progress>=1?Math.max(0,1-settledSeconds/3):0;},
    get active(){return holding||charge>0&&!committed||committed&&(progress<1||settledSeconds<3);},
    hold(value:boolean){holding=value&&!committed;},
    reset(){charge=progress=settledSeconds=0;holding=committed=docked=false;},
    returnToStage(){holding=false;if(progress>=1)docked=true;else{charge=progress=settledSeconds=0;committed=docked=false;}},
    step(seconds:number){
      const dt=Math.min(.06,Math.max(0,seconds));
      if(progress>=1)settledSeconds=Math.min(3,settledSeconds+dt);
      if(committed){progress=Math.min(1,progress+dt/4.2);return;}
      charge=Math.max(0,Math.min(1,charge+dt*(holding?.5:-1.5)));
      if(charge>=1){committed=true;holding=false;}
    },
  };
}
