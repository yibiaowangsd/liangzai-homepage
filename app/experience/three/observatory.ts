import * as THREE from "three";

/** Restrained blue/purple nebula, with stars at two depths beneath the glass. */
function starAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#030710"; ctx.fillRect(0, 0, 768, 768);
  let seed = 72931;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i=0; i<28; i++) {
    const a=i/28*Math.PI*3.8, r=35+i*10;
    const x=384+Math.cos(a)*r, y=384+Math.sin(a)*r*.72;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,105);
    gradient.addColorStop(0,i%3===0?"#484c791c":"#237baf23"); gradient.addColorStop(1,"#00000000");
    ctx.fillStyle=gradient;ctx.fillRect(x-105,y-105,210,210);
  }
  for(let i=0;i<2100;i++) {
    const a=random()*Math.PI*2, r=Math.sqrt(random())*360;
    const x=384+Math.cos(a)*r,y=384+Math.sin(a)*r;
    const bright=random(), size=bright>.985?1.5:bright>.9?.8:.4;
    ctx.fillStyle=bright>.97?"#f3e4c9":`rgba(157,205,244,${.18+bright*.65})`;
    ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
    if(bright>.985) { ctx.fillStyle="#b3dbff35";ctx.fillRect(x-4,y-.35,8,.7);ctx.fillRect(x-.35,y-4,.7,8); }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

export function createObservatory() {
  const stage = new THREE.Group(); stage.name="Starlight_observatory";
  const graphite=new THREE.MeshStandardMaterial({color:0x101927,metalness:.82,roughness:.32});
  const silver=new THREE.MeshStandardMaterial({color:0x667a8a,metalness:.9,roughness:.28});
  const glow=new THREE.MeshStandardMaterial({color:0x80c7e2,emissive:0x6fbee7,emissiveIntensity:1.05,roughness:.35});
  const ring=(r:number,t:number,parent:THREE.Object3D,material:THREE.Material,y=0)=>{
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,128),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=y;parent.add(mesh);return mesh;
  };
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.57,.25,128),graphite);
  plinth.position.y=-.065;plinth.receiveShadow=true;plinth.castShadow=true;stage.add(plinth);
  ring(2.505,.013,stage,silver,.065);ring(2.54,.008,stage,glow,-.11);
  const atlas=starAtlas();
  const top=new THREE.Mesh(new THREE.CircleGeometry(2.47,128),new THREE.MeshPhysicalMaterial({
    map:atlas,emissiveMap:atlas,emissive:0xb6d9ff,emissiveIntensity:1.55,
    metalness:.32,roughness:.3,clearcoat:.9,clearcoatRoughness:.22,
  }));
  top.name="Starfield_glass_top";top.rotation.x=-Math.PI/2;top.position.y=.069;top.receiveShadow=true;stage.add(top);
  ring(2.35,.004,stage,glow,.076);ring(2.1,.003,stage,silver,.078);
  const stars=new THREE.Group();stars.name="Suspended_starlight";stage.add(stars);
  const dots=new Float32Array(160*3);
  for(let i=0;i<160;i++){
    const r=Math.sqrt(((i*73)%163)/163)*2.3,a=i*2.39996;
    dots[i*3]=Math.cos(a)*r;dots[i*3+1]=.086+((i*17)%23)/23*.045;dots[i*3+2]=Math.sin(a)*r;
  }
  const points=new THREE.BufferGeometry();points.setAttribute("position",new THREE.BufferAttribute(dots,3));
  stars.add(new THREE.Points(points,new THREE.PointsMaterial({color:0xbbe4ff,size:.026,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending})));
  const constellation = [[-1.45,1.25],[-.72,1.73],[-.05,1.47],[.64,1.86],[1.42,1.32]];
  const trail:THREE.Vector3[]=[];
  const starMaterial=new THREE.MeshBasicMaterial({color:0xb9dcff,toneMapped:false});
  const starGeometry=new THREE.SphereGeometry(.021,8,6);
  for(let i=0;i<constellation.length;i++){
    const [x,z]=constellation[i];const star=new THREE.Mesh(starGeometry,starMaterial);star.position.set(x,.094,z);stage.add(star);
    if(i>0){const previous=constellation[i-1];trail.push(new THREE.Vector3(previous[0],.087,previous[1]),new THREE.Vector3(x,.087,z));}
  }
  stage.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(trail),new THREE.LineBasicMaterial({color:0x73a2d4,transparent:true,opacity:.3})));
  const orbit=new THREE.Group();orbit.position.set(0,2.6,-1.35);orbit.rotation.set(.05,-.16,-.12);stage.add(orbit);
  const arc=(radius:number,tube:number,mat:THREE.Material)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,128),mat);orbit.add(m);return m;
  };
  arc(2.78,.07,graphite);arc(2.78,.014,silver).position.z=.07;
  arc(2.685,.007,glow);arc(2.97,.005,silver);
  const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(.017,.09,.045),silver,48),dummy=new THREE.Object3D();
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;dummy.position.set(Math.cos(a)*2.78,Math.sin(a)*2.78,.058);dummy.rotation.z=a-Math.PI/2;dummy.updateMatrix();marks.setMatrixAt(i,dummy.matrix);}orbit.add(marks);
  const pulse=ring(2.43,.012,stage,new THREE.MeshBasicMaterial({color:0x9bdbff,transparent:true,opacity:0,depthWrite:false}),.09);
  const fade=document.createElement("canvas");fade.width=fade.height=128;
  const ctx=fade.getContext("2d")!,g=ctx.createRadialGradient(64,64,13,64,64,63);
  g.addColorStop(0,"white");g.addColorStop(1,"black");ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(fade);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshStandardMaterial({color:0x070d18,metalness:.35,roughness:.55,transparent:true,alphaMap:shadowTexture,depthWrite:false}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.195;floor.receiveShadow=true;stage.add(floor);
  const dustPositions=new Float32Array(96*3);
  for(let i=0;i<96;i++){dustPositions[i*3]=Math.sin(i*42.7)*6;dustPositions[i*3+1]=((i*47)%101)/101*8;dustPositions[i*3+2]=-3-((i*37)%97)/97*4;}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute("position",new THREE.BufferAttribute(dustPositions,3));
  stage.add(new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xa1bddb,size:.014,transparent:true,opacity:.35,depthWrite:false})));
  return {stage,stars,orbit,glow,pulse};
}

/** Large reflection panels produce broad highlights instead of harsh hotspots. */
export function createStudioEnvironment() {
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x333b48);
  const panel=(color:number,intensity:number,width:number,height:number,position:number[])=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(position[0],position[1],position[2]);mesh.lookAt(0,2,0);environment.add(mesh);
  };
  panel(0xfff3df,3,5,6,[-4,7,5]);panel(0xbcd6ff,1.5,3,6,[5,4,2]);panel(0xabcfff,2.5,2,5,[1,5,-5]);
  return environment;
}
