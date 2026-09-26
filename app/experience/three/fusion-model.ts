import * as THREE from "three";

/** A2: original quantum screen head on a sculpted, pear-shaped golden dragon body. */
export function createFusionGuardian(liangzai:THREE.Group) {
  const actor=new THREE.Group();actor.name="Lianglong_A2_fusion";
  const pivot=new THREE.Group();pivot.position.y=2.65;actor.add(pivot);
  const body=new THREE.Group();body.position.y=-2.65;pivot.add(body);
  const white=new THREE.MeshPhysicalMaterial({color:0xf2f1eb,metalness:0,roughness:.32,clearcoat:.24,clearcoatRoughness:.25});
  const blue=new THREE.MeshPhysicalMaterial({color:0x075bd3,metalness:.10,roughness:.26,clearcoat:.35});
  const gold=new THREE.MeshStandardMaterial({color:0xffd36b,metalness:0,roughness:.40});
  const cream=new THREE.MeshStandardMaterial({color:0xffe6a2,metalness:0,roughness:.43});
  const navy=new THREE.MeshStandardMaterial({color:0x071c46,roughness:.36});
  const cyan=new THREE.MeshStandardMaterial({color:0x8cecf5,emissive:0x40c6de,emissiveIntensity:.7,roughness:.36});
  const sphere=new THREE.SphereGeometry(1,32,24);
  function mesh(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=body){
    const item=new THREE.Mesh(geometry,material);item.name=name;item.castShadow=item.receiveShadow=true;parent.add(item);return item;
  }
  function oval(name:string,material:THREE.Material,position:number[],scale:number[],parent:THREE.Object3D=body){
    const item=mesh(name,sphere,material,parent);item.position.fromArray(position);item.scale.fromArray(scale);return item;
  }
  function ring(name:string,radius:number,tube:number,material:THREE.Material,position:number[]){
    const item=mesh(name,new THREE.TorusGeometry(radius,tube,10,64),material);item.position.fromArray(position);return item;
  }
  // Clone the real head in its own neutral coordinates, independent of the actor's inspection pose.
  const sourceHead=liangzai.getObjectByName("joint_head");
  if(!sourceHead)throw new Error("A2 requires the original Liangzai head rig");
  const sourceRoot=sourceHead.parent!;
  const content=liangzai.getObjectByName("liangzai_content")!,normalize=content.scale.x;
  const head=sourceHead.clone(true);head.name="A2_screen_head";
  head.position.copy(sourceHead.position);head.quaternion.identity();head.scale.setScalar(1);
  const headFrame=new THREE.Group(),toContent=new THREE.Matrix4();
  // Preserve all original GLTF ancestor transforms, excluding the interactive inspection pivot.
  for(let node:THREE.Object3D|null=sourceRoot;node&&node!==content;node=node.parent){node.updateMatrix();toContent.premultiply(node.matrix);}
  headFrame.applyMatrix4(new THREE.Matrix4().makeScale(normalize*1.05,normalize*1.05,normalize*1.05).multiply(toContent));headFrame.position.y+=.20;
  headFrame.add(head);body.add(headFrame);
  const clonedMaterials=new Map<THREE.Material,THREE.Material>();
  const remove:THREE.Object3D[]=[];
  head.traverse(object=>{
    if(/^[LR]_ear_/.test(object.name))remove.push(object);
    if(object.name.startsWith("joint_")){object.rotation.set(0,0,0);object.scale.setScalar(1);}
    if(object instanceof THREE.Mesh){
      const clone=(original:THREE.Material)=>{let copy=clonedMaterials.get(original);if(!copy){copy=original.clone();clonedMaterials.set(original,copy);}return copy;};
      object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
    }
  });
  remove.forEach(part=>part.removeFromParent());
  const eyes=[head.getObjectByName("joint_leftEye")!,head.getObjectByName("joint_rightEye")!];
  // Smooth, small golden horns replace the source's pointed white ears.
  for(const side of [-1,1]){
    oval("Horn_ceramic_socket",white,[side*.75,4.00,-.025],[.23,.23,.21]);
    const hornProfile=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.15,.015,0),new THREE.Vector3(.18,.13,0),new THREE.Vector3(.13,.29,0),new THREE.Vector3(.06,.37,0),new THREE.Vector3(0,.40,0)]).getPoints(28);
    const horn=mesh("Rounded_gold_horn",new THREE.LatheGeometry(hornProfile.map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),32),gold);horn.position.set(side*.76,3.96,.05);horn.rotation.z=-side*.20;
  }

  const profile=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,.51,0),new THREE.Vector3(.36,.53,0),new THREE.Vector3(.78,.84,0),
    new THREE.Vector3(1.01,1.30,0),new THREE.Vector3(.94,1.78,0),new THREE.Vector3(.72,2.14,0),
    new THREE.Vector3(.47,2.44,0),new THREE.Vector3(0,2.55,0),
  ]).getPoints(64);
  const torso=mesh("Golden_pear_body",new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),64),gold);
  torso.scale.z=.73;torso.position.z=.035;
  function bodyRadius(y:number){
    for(let i=1;i<profile.length;i++)if(profile[i].y>=y){const a=profile[i-1],b=profile[i];return THREE.MathUtils.lerp(a.x,b.x,(y-a.y)/Math.max(.0001,b.y-a.y));}
    return .01;
  }
  function surfaceZ(x:number,y:number){const r=Math.max(.001,bodyRadius(y));return .035+Math.sqrt(Math.max(0,r*r-x*x))*.73;}
  // A thin cream surface follows the continuous body rather than a second intersecting belly sphere.
  function bodyPatch(name:string,material:THREE.Material,centerY:number,width:number,height:number,front=true){
    const positions:number[]=[],indices:number[]=[];const rows=24,segments=64;
    for(let row=0;row<=rows;row++){const radius=row/rows;for(let col=0;col<=segments;col++){
      const angle=col/segments*Math.PI*2,x=Math.cos(angle)*radius*width,y=centerY+Math.sin(angle)*radius*height;
      positions.push(x,y,front?surfaceZ(x,y)+.018:.07-surfaceZ(x,y)-.018);
    }}
    for(let row=0;row<rows;row++)for(let col=0;col<segments;col++){const a=row*(segments+1)+col,b=a+segments+1;if(front)indices.push(a,b,b+1,a,b+1,a+1);else indices.push(a,b+1,b,a,a+1,b+1);}
    const geometry=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    return mesh(name,geometry,material);
  }
  bodyPatch("Cream_belly_patch",cream,1.45,.76,.80);
  bodyPatch("Ceramic_back_panel",white,2.20,.45,.26,false);

  for(const side of [-1,1]){
    oval("Golden_short_leg",gold,[side*.46,.49,.05],[.31,.47,.35]);
    oval("Rounded_dragon_foot",gold,[side*.48,.18,.23],[.37,.18,.45]);
    for(let toe=0;toe<3;toe++)oval("Round_toe",gold,[side*.48+(toe-1)*.19,.125,.52],[.13,.125,.18]);
    oval("Heel_white_disc",white,[side*.79,.25,-.04],[.058,.17,.17]);
    oval("Heel_blue_disc",blue,[side*.836,.25,-.04],[.03,.12,.12]);
    const arm=new THREE.Group();arm.position.set(side*.82,2.15,.02);arm.rotation.z=side*.32;body.add(arm);
    oval("Golden_arm",gold,[side*.04,-.34,0],[.22,.49,.25],arm);
    oval("Ceramic_shoulder",white,[side*.01,.025,0],[.27,.255,.29],arm);
    oval("Cobalt_cuff",blue,[side*.045,-.59,.015],[.235,.067,.265],arm);
    oval("Golden_mitten",gold,[side*.06,-.79,.055],[.255,.26,.25],arm);
    for(let finger=0;finger<3;finger++)oval("Rounded_finger",gold,[side*.06+(finger-1)*.115,-.94,.13],[.083,.14,.11],arm);
    oval("Rounded_thumb",gold,[-side*.13,-.79,.17],[.10,.16,.11],arm);
  }
  // Curved, tapered tail: a broad organic root, a soft lifted tip, no constant-width tube.
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.02,-.38),new THREE.Vector3(0,.97,-.83),new THREE.Vector3(0,1.04,-1.30),new THREE.Vector3(0,1.25,-1.84)]);
  const tailGeometry=new THREE.TubeGeometry(curve,48,1,24,false),attribute=tailGeometry.getAttribute("position"),point=new THREE.Vector3();
  for(let i=0;i<=48;i++){const t=i/48,center=curve.getPointAt(t),radius=.40*Math.pow(1-t,.74)+.003;
    for(let j=0;j<=24;j++){const index=i*25+j;point.fromBufferAttribute(attribute,index).sub(center).multiplyScalar(radius).add(center);attribute.setXYZ(index,point.x,point.y,point.z);}
  }
  tailGeometry.computeVertexNormals();mesh("Thick_tapered_tail",tailGeometry,gold);
  oval("Tail_tip",gold,[0,1.25,-1.84],[.006,.006,.006]);
  for(let i=0;i<3;i++){const y=1.94-i*.30;oval("Rounded_cobalt_spine",blue,[0,y,.035-bodyRadius(y)*.73-.032],[.115,.155,.09]);}
  // Recessed quantum badge matches the reference without the old bright floating spheres.
  const coreY=1.98,coreZ=surfaceZ(0,coreY)+.06;
  const core=oval("Quantum_core",navy,[0,coreY,coreZ],[.257,.257,.055]);
  ring("Core_white_bezel",.289,.020,white,[0,coreY,coreZ]);
  ring("Core_cobalt_bezel",.263,.027,blue,[0,coreY,coreZ+.02]);
  ring("Quantum_Q",.118,.022,cyan,[0,coreY,coreZ+.060]);
  const qStroke=mesh("Q_tail",new THREE.CapsuleGeometry(.018,.10,4,8),cyan);qStroke.position.set(.098,coreY-.098,coreZ+.063);qStroke.rotation.z=Math.PI/4;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;oval("Core_tick",cyan,[Math.cos(a)*.208,coreY+Math.sin(a)*.208,coreZ+.041],[.012,.012,.008]);}
  actor.userData={character:"量子奶龙仔",design:"A2 approved turnaround",height:5.293,sourceHead:"original Liangzai geometry, independent cloned materials"};
  return {actor,core,update(time:number,energy:number,motion:boolean){
    cyan.emissiveIntensity=.7+energy*.8;
    const phase=time%5.2,blink=motion&&phase>4.8&&phase<5.06?Math.max(.07,Math.abs(phase-4.93)/.13):1;
    eyes.forEach(eye=>eye.scale.y=blink);
  }};
}
