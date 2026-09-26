import * as THREE from "three";

/** A standalone, texture-free dragon guardian: golden face, ceramic armour, twin quantum core. */
export function createFusionGuardian() {
  const actor=new THREE.Group();actor.name="Lianglong_fusion";
  const pivot=new THREE.Group();pivot.position.y=2.45;actor.add(pivot);
  const body=new THREE.Group();body.position.y=-2.45;pivot.add(body);
  const white=new THREE.MeshStandardMaterial({color:0xe9f0f5,metalness:.5,roughness:.24});
  const blue=new THREE.MeshStandardMaterial({color:0x177bc1,metalness:.65,roughness:.25});
  const gold=new THREE.MeshStandardMaterial({color:0xffc84b,metalness:.24,roughness:.34});
  const cream=new THREE.MeshStandardMaterial({color:0xffe5a9,metalness:.12,roughness:.43});
  const dark=new THREE.MeshStandardMaterial({color:0x102334,metalness:.3,roughness:.3});
  const cyan=new THREE.MeshStandardMaterial({color:0x99efff,emissive:0x47ceff,emissiveIntensity:2,metalness:.3,roughness:.2});
  const warm=new THREE.MeshStandardMaterial({color:0xffd674,emissive:0xffa832,emissiveIntensity:1.3,roughness:.3});
  const eye=new THREE.MeshStandardMaterial({color:0x073536,roughness:.12,metalness:.1});
  const sphere=new THREE.SphereGeometry(1,32,24);
  function ellipsoid(name:string,material:THREE.Material,position:number[],scale:number[],parent:THREE.Object3D=body){
    const mesh=new THREE.Mesh(sphere,material);mesh.name=name;mesh.position.set(position[0],position[1],position[2]);mesh.scale.set(scale[0],scale[1],scale[2]);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function ring(name:string,radius:number,tube:number,material:THREE.Material,position:number[],parent:THREE.Object3D=body){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,48),material);mesh.name=name;mesh.position.set(position[0],position[1],position[2]);parent.add(mesh);return mesh;
  }
  function rod(name:string,a:THREE.Vector3,b:THREE.Vector3,radius:number,material:THREE.Material){
    const axis=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,axis.length(),12),material);
    mesh.name=name;mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());body.add(mesh);return mesh;
  }
  ellipsoid("Dragon_torso",gold,[0,1.95,0],[.78,1.02,.52]);
  ellipsoid("Ivory_belly",cream,[0,1.82,.40],[.59,.70,.19]);
  ellipsoid("Ceramic_chest",white,[0,2.52,.14],[.76,.40,.48]);
  ellipsoid("Blue_waist",blue,[0,1.35,0],[.70,.18,.46]);
  for(const side of [-1,1]){
    ellipsoid("Hip_armour",white,[side*.59,1.45,.04],[.23,.31,.39]);
    const thigh=ellipsoid("Golden_leg",gold,[side*.40,.94,.02],[.25,.53,.26]);thigh.rotation.z=side*-.10;
    ellipsoid("Knee_guard",blue,[side*.43,.66,.21],[.26,.23,.16]);
    ellipsoid("Boot_shell",white,[side*.46,.29,.16],[.34,.30,.50]);
    ellipsoid("Boot_sole",blue,[side*.46,.085,.19],[.35,.085,.49]);
    const arm=new THREE.Group();arm.name=side<0?"fusion_left_arm":"fusion_right_arm";arm.position.set(side*.76,2.55,0);arm.rotation.z=side*.42;body.add(arm);
    ellipsoid("Shoulder_shell",white,[side*.07,-.05,0],[.33,.30,.35],arm);
    ellipsoid("Dragon_arm",gold,[side*.10,-.42,.02],[.22,.46,.22],arm);
    ellipsoid("Blue_cuff",blue,[side*.12,-.73,.06],[.265,.17,.27],arm);
    ellipsoid("White_cuff",white,[side*.12,-.81,.06],[.28,.10,.28],arm);
    ellipsoid("Dragon_palm",gold,[side*.12,-1.00,.1],[.26,.25,.23],arm);
    for(let finger=0;finger<3;finger++)ellipsoid("Golden_finger",gold,[side*(.03+finger*.105),-1.16,.19],[.074,.145,.075],arm);
    ellipsoid("Thumb",gold,[-side*.1,-1.01,.19],[.1,.16,.1],arm);
    // White helmet shell and blue radio pods wrap the golden dragon face.
    ellipsoid("Radio_pod",blue,[side*.95,3.75,-.02],[.19,.33,.31]);
    ellipsoid("Radio_gold_disc",gold,[side*1.09,3.75,-.02],[.07,.20,.20]);
    rod("Side_aerial",new THREE.Vector3(side*.98,3.97,-.06),new THREE.Vector3(side*1.02,4.58,-.08),.027,blue);
  }
  ellipsoid("Ceramic_helmet",white,[0,3.78,-.13],[1.0,.95,.67]);
  ellipsoid("Golden_dragon_face",gold,[0,3.75,.43],[.85,.74,.35]);
  for(const side of [-1,1]){
    const ear=ellipsoid("Helmet_ear",white,[side*.67,4.45,-.04],[.25,.35,.27]);ear.rotation.z=side*-.32;
    const inner=ellipsoid("Golden_ear",gold,[side*.67,4.49,.18],[.13,.19,.055]);inner.rotation.z=side*-.32;
    ellipsoid("Eye_cream",cream,[side*.33,3.94,.746],[.245,.30,.09]);
    ellipsoid("Jade_iris",blue,[side*.33,3.95,.817],[.172,.226,.055]);
    ellipsoid("Eye_pupil",eye,[side*.33,3.95,.855],[.126,.173,.043]);
    ellipsoid("Eye_glint",white,[side*.33-.045,4.027,.895],[.043,.053,.018]);
    ellipsoid("Cheek",warm,[side*.58,3.63,.72],[.11,.045,.012]);
  }
  ellipsoid("Dragon_muzzle",gold,[0,3.50,.75],[.38,.18,.13]);
  const smileCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.22,3.47,.861),new THREE.Vector3(0,3.42,.90),new THREE.Vector3(.22,3.47,.861)]);
  const smile=new THREE.Mesh(new THREE.TubeGeometry(smileCurve,20,.014,6,false),dark);smile.name="Dragon_smile";body.add(smile);
  const core=ellipsoid("Quantum_core",cyan,[0,2.55,.63],[.235,.235,.085]);
  ring("Core_white_bezel",.31,.055,white,[0,2.55,.58]);
  ring("Core_blue_orbit",.38,.025,blue,[0,2.55,.55]);
  ring("Core_gold_orbit",.265,.016,warm,[0,2.55,.70]).rotation.z=.7;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipsoid("Core_marker",cyan,[Math.cos(a)*.365,2.55+Math.sin(a)*.365,.58],[.018,.018,.016]);}
  const springPoints=Array.from({length:50},(_,i)=>{const t=i/49;return new THREE.Vector3(Math.sin(t*Math.PI*6)*.053,4.62+t*.32,-.10+Math.cos(t*Math.PI*6)*.053);});
  body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),64,.021,6,false),dark));
  ellipsoid("Quantum_antenna",blue,[0,5.01,-.10],[.145,.145,.145]);
  ellipsoid("Quantum_satellite",cyan,[.22,5.14,-.10],[.07,.07,.07]);
  const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.4,-.38),new THREE.Vector3(.35,1.2,-.95),new THREE.Vector3(.82,1.52,-1.13),new THREE.Vector3(1.0,1.8,-1.08)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,28,.14,12,false),gold);tail.name="Dragon_tail";body.add(tail);
  for(let i=0;i<4;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.10,.23,4),blue);spike.position.set(0,2.6-i*.28,-.50);spike.rotation.x=-Math.PI/2;body.add(spike);}
  actor.userData={character:"靓龙",recipe:"golden dragon face, blue-white armour, twin quantum core",height:5.21};
  return {actor,core,update(time:number,energy:number,motion:boolean){cyan.emissiveIntensity=1.8+energy*1.5+(motion?Math.sin(time*1.6)*.12:0);},};
}
