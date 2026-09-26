import * as THREE from "three";

/** Small actual 3D bodies and bounded comet trails, without extra shadow lights. */
export function createCelestialSystem() {
  const group=new THREE.Group();group.name="Nebula_celestial_system";
  const glowData=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const r=Math.hypot(x-31.5,y-31.5)/31.5,i=(y*64+x)*4;glowData[i]=glowData[i+1]=glowData[i+2]=255;glowData[i+3]=Math.round(Math.max(0,Math.exp(-r*r*6)-.0025)*255);}
  const glowTexture=new THREE.DataTexture(glowData,64,64);glowTexture.needsUpdate=true;glowTexture.magFilter=THREE.LinearFilter;
  const stellar=new THREE.MeshBasicMaterial({color:0xffe6ad});
  const star=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),stellar);star.name="恒星";star.position.set(-3.2,4.65,-2);group.add(star);
  const corona=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xffd89b,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));corona.scale.setScalar(1.7);star.add(corona);
  function planet(name:string,radius:number,color:number,position:number[]){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,32,20),new THREE.MeshStandardMaterial({color,metalness:.13,roughness:.67}));mesh.name=name;mesh.position.set(...position as [number,number,number]);group.add(mesh);return mesh;
  }
  const saturn=planet("环状行星",.39,0xc6a787,[3.1,4.25,-1.4]);saturn.rotation.z=-.35;
  const rings=new THREE.Mesh(new THREE.RingGeometry(.53,.82,72),new THREE.MeshStandardMaterial({color:0xbad7e8,transparent:true,opacity:.45,side:THREE.DoubleSide,roughness:.8}));rings.rotation.x=1.08;saturn.add(rings);
  const azure=planet("蓝色行星",.25,0x4c9bbc,[-3.15,1.3,-.5]);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(.266,24,16),new THREE.MeshBasicMaterial({color:0x84d9f9,transparent:true,opacity:.12,depthWrite:false,side:THREE.BackSide}));azure.add(atmosphere);
  const moonOrbit=new THREE.Group();saturn.add(moonOrbit);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.066,14,10),new THREE.MeshStandardMaterial({color:0xe0d9c8,roughness:.92}));moon.name="天然卫星";moon.position.set(.97,.15,.1);moonOrbit.add(moon);
  const satellite=new THREE.Group();satellite.name="量子通信卫星";group.add(satellite);
  const metal=new THREE.MeshStandardMaterial({color:0xd8e1e6,metalness:.75,roughness:.3});
  satellite.add(new THREE.Mesh(new THREE.BoxGeometry(.16,.19,.16),metal));
  const panel=new THREE.MeshStandardMaterial({color:0x145987,emissive:0x103753,emissiveIntensity:.4,metalness:.35,roughness:.4});
  for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(.30,.16,.016),panel);wing.position.x=side*.26;satellite.add(wing);}
  const antenna=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,12),metal);antenna.position.y=.17;satellite.add(antenna);
  const comet=new THREE.Group();comet.name="彗星";group.add(comet);
  const cometHead=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xc9edff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));cometHead.scale.setScalar(.28);comet.add(cometHead);
  const tailPosition=new Float32Array(80*3),life=new Float32Array(80);
  for(let i=0;i<80;i++){const t=i/79;tailPosition[i*3]=-t*2.8;tailPosition[i*3+1]=Math.sin(t*9)*t*.055;life[i]=1-t;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(tailPosition,3));geometry.setAttribute("aLife",new THREE.BufferAttribute(life,1));
  const tailMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uFade:{value:1}},vertexShader:"attribute float aLife;varying float vLife;void main(){vLife=aLife;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=1.+aLife*4.;}",fragmentShader:"uniform float uFade;varying float vLife;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.48,.8,1.,max(0.,1.-r)*vLife*vLife*uFade*.55);}"});comet.add(new THREE.Points(geometry,tailMat));
  const materials=new Map<THREE.Material,number>();group.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Sprite){const list=Array.isArray(object.material)?object.material:[object.material];list.forEach(m=>{materials.set(m,m.opacity);m.transparent=true;});}});
  return {group,update(time:number,progress:number){
    const fade=1-THREE.MathUtils.smoothstep(progress,.12,.67);group.visible=fade>.001;
    if(!group.visible)return;
    materials.forEach((opacity,material)=>material.opacity=opacity*fade);tailMat.uniforms.uFade.value=fade;
    moonOrbit.rotation.y=time*.28;azure.rotation.y=time*.07;
    satellite.position.set(2.6+Math.cos(time*.13)*.35,.8+Math.sin(time*.2)*.18,-.4);satellite.rotation.set(.22,time*.17,-.22);
    corona.material.rotation=time*.025;
    const phase=(time+3)%16;comet.visible=phase<6;
    const travel=phase/6;comet.position.set(-7+travel*15,6-travel*3.8,-1.5);comet.rotation.z=Math.atan2(-3.8,15);
  }};
}
