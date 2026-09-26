import { Box3, Group, Vector3, type Object3D } from "three";

export type GuardianAction = "wave" | "nod" | "look" | "stretch" | "march" | "antenna" | "blink";
const rest = { headYaw:0, headPitch:0, headRoll:0, leftArm:0, rightArm:0, leftArmX:0, rightArmX:0, leftWrist:0, rightWrist:0, leftLeg:0, rightLeg:0, leftFoot:0, rightFoot:0, antenna:0, blink:1 };

/** Rigid joints for the supplied robot's named parts; no remeshing or skinning. */
export function createLiangzaiRig(source: Group) {
  const root = source.getObjectByName("Liangzai");
  if (!root) throw new Error("Liangzai component hierarchy missing");
  source.updateMatrixWorld(true);
  const parts = [...root.children];
  const select = (pattern: RegExp) => parts.filter(part => pattern.test(part.name));
  function joint(name: string, point: Vector3, members: Object3D[], parent: Object3D = root!) {
    if (!members.length) throw new Error(`Liangzai joint has no parts: ${name}`);
    const pivot = new Group(); pivot.name = `joint_${name}`; pivot.position.copy(point);
    root!.add(pivot); source.updateMatrixWorld(true);
    for (const member of members) pivot.attach(member);
    if (parent !== root) parent.attach(pivot);
    return pivot;
  }
  const head = joint("head", new Vector3(0,2.45,-.05), select(/^(Head_|Crown_|Rear_crown_|Visor_|Small_coral|Left_eye|Right_eye|[LR]_(ear|headset|radio)_|Antenna_)/));
  const antenna = joint("antenna",new Vector3(0,4.57,-.1),select(/^Antenna_/),head);
  const eye = (side: string) => {
    const members=select(new RegExp(`^${side}_eye_`)),bounds=new Box3();
    for(const member of members)bounds.expandByObject(member);
    const centre=root.worldToLocal(bounds.getCenter(new Vector3()));
    return joint(`${side.toLowerCase()}Eye`,centre,members,head);
  };
  const leftEye=eye("Left"),rightEye=eye("Right");
  const leftArm=joint("leftArm",new Vector3(-.48,2.22,-.05),select(/^L_(arm|cuff|glove)_/));
  const rightArm=joint("rightArm",new Vector3(.48,2.22,-.05),select(/^R_(arm|cuff|glove)_/));
  const leftHand=joint("leftHand",new Vector3(-.78,1.5,0),select(/^L_glove_/),leftArm);
  const rightHand=joint("rightHand",new Vector3(.78,1.5,0),select(/^R_glove_/),rightArm);
  const leftLeg=joint("leftLeg",new Vector3(-.35,1.15,0),select(/^L_(leg|ankle|shoe)_/));
  const rightLeg=joint("rightLeg",new Vector3(.35,1.15,0),select(/^R_(leg|ankle|shoe)_/));
  const leftFoot=joint("leftFoot",new Vector3(-.35,.5,0),select(/^L_(ankle|shoe)_/),leftLeg);
  const rightFoot=joint("rightFoot",new Vector3(.35,.5,0),select(/^R_(ankle|shoe)_/),rightLeg);
  const pose={...rest},look={x:0,y:0};
  function apply(time:number,enabled:boolean){
    const idle=enabled?Math.sin(time*1.4)*.014:0;
    head.rotation.set(pose.headPitch+look.y*.16,pose.headYaw+look.x*.3,pose.headRoll);
    leftArm.rotation.set(pose.leftArmX,0,pose.leftArm-idle);rightArm.rotation.set(pose.rightArmX,0,pose.rightArm+idle);
    leftHand.rotation.x=pose.leftWrist;rightHand.rotation.x=pose.rightWrist;
    leftLeg.rotation.x=pose.leftLeg;rightLeg.rotation.x=pose.rightLeg;
    leftFoot.rotation.x=pose.leftFoot;rightFoot.rotation.x=pose.rightFoot;
    antenna.rotation.z=pose.antenna+(enabled?Math.sin(time*2.1)*.025:0);
    const blinkPhase=time%5.2;
    const automatic=enabled&&blinkPhase>4.8&&blinkPhase<5.06?Math.max(.07,Math.abs(blinkPhase-4.93)/.13):1;
    leftEye.scale.y=rightEye.scale.y=Math.min(pose.blink,automatic);
  }
  function reset(){Object.assign(pose,rest);look.x=look.y=0;apply(0,false);}
  return {pose,look,apply,reset,joints:{head,antenna,leftEye,rightEye,leftArm,rightArm,leftHand,rightHand,leftLeg,rightLeg,leftFoot,rightFoot}};
}
export type LiangzaiRig=ReturnType<typeof createLiangzaiRig>;
