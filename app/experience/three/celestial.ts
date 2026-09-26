import * as THREE from "three";


/** Small actual 3D bodies and bounded comet trails, without extra shadow lights. */
export function createCelestialSystem() {
  const group=new THREE.Group();group.name="Nebula_celestial_system";
  const glowData=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const r=Math.hypot(x-31.5,y-31.5)/31.5,i=(y*64+x)*4;glowData[i]=glowData[i+1]=glowData[i+2]=255;glowData[i+3]=Math.round(Math.max(0,Math.exp(-r*r*6)-.0025)*255);}
  const glowTexture=new THREE.DataTexture(glowData,64,64);glowTexture.needsUpdate=true;glowTexture.magFilter=THREE.LinearFilter;
  const stellar=new THREE.MeshBasicMaterial({map:createCelestialTexture("star"),color:0xffffff});
  const star=new THREE.Mesh(new THREE.SphereGeometry(.22,48,32),stellar);star.name="恒星";star.position.set(-3.2,4.65,-2);group.add(star);
  const corona=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xffd89b,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));corona.scale.setScalar(1.7);star.add(corona);
  function planet(name:string,radius:number,color:number,position:number[]){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,64,40),new THREE.MeshStandardMaterial({color,metalness:0,roughness:.72}));mesh.name=name;mesh.position.set(...position as [number,number,number]);group.add(mesh);return mesh;
  }
  const saturn=planet("环状行星",.52,0xffffff,[3.1,4.25,-1.4]);saturn.rotation.z=-.35;
  const gasMap=createCelestialTexture("gas");saturn.material.map=gasMap;saturn.material.bumpMap=gasMap;saturn.material.bumpScale=.006;
  const ringGeometry=new THREE.RingGeometry(.70,1.13,128,8),rp=ringGeometry.getAttribute("position"),uv=ringGeometry.getAttribute("uv");
  for(let i=0;i<rp.count;i++)uv.setXY(i,(Math.hypot(rp.getX(i),rp.getY(i))-.70)/.43,.5);
  const rings=new THREE.Mesh(ringGeometry,new THREE.MeshStandardMaterial({map:createRingTexture(),transparent:true,opacity:.85,side:THREE.DoubleSide,roughness:.92,depthWrite:false}));rings.name="分层冰尘环";rings.rotation.x=1.08;saturn.add(rings);
  const azure=planet("蓝色行星",.36,0xffffff,[-3.15,1.3,-.5]);
  const oceanMap=createCelestialTexture("ocean");azure.material.map=oceanMap;azure.material.bumpMap=oceanMap;azure.material.bumpScale=.009;azure.material.roughness=.48;
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(.367,48,32),new THREE.MeshStandardMaterial({map:createCelestialTexture("cloud"),transparent:true,opacity:.7,depthWrite:false,roughness:1}));clouds.name="云层";azure.add(clouds);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(.381,40,28),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{uFade:{value:1}},vertexShader:"varying vec3 vNormal,vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",fragmentShader:"uniform float uFade;varying vec3 vNormal,vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.);gl_FragColor=vec4(.24,.59,.9,rim*.34*uFade);}"}));azure.add(atmosphere);
  const moonOrbit=new THREE.Group();saturn.add(moonOrbit);
  const moonMap=createCelestialTexture("moon");
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.105,32,24),new THREE.MeshStandardMaterial({map:moonMap,bumpMap:moonMap,bumpScale:.014,roughness:.96}));moon.name="天然卫星";moon.position.set(1.36,.18,.1);moonOrbit.add(moon);
  const satellite=new THREE.Group();satellite.name="量子通信卫星";group.add(satellite);
  const metal=new THREE.MeshStandardMaterial({color:0xd8e1e6,metalness:.75,roughness:.3});
  const bus=new THREE.Mesh(new THREE.BoxGeometry(.19,.23,.19),new THREE.MeshStandardMaterial({color:0xb4a476,metalness:.62,roughness:.47}));satellite.add(bus);
  const frame=new THREE.LineSegments(new THREE.EdgesGeometry(bus.geometry),new THREE.LineBasicMaterial({color:0xe7e6dc}));bus.add(frame);
  const panel=new THREE.MeshStandardMaterial({color:0x145987,emissive:0x103753,emissiveIntensity:.4,metalness:.35,roughness:.4});
  for(const side of [-1,1]){
    const wing=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.016),metal);wing.position.x=side*.31;satellite.add(wing);
    const cells=new THREE.InstancedMesh(new THREE.BoxGeometry(.064,.058,.019),panel,15),cellMatrix=new THREE.Matrix4();
    for(let col=0;col<5;col++)for(let row=0;row<3;row++)cells.setMatrixAt(col*3+row,cellMatrix.makeTranslation((col-2)*.073,(row-1)*.067,.004));
    wing.add(cells);
    const strut=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.22,8),metal);strut.rotation.z=Math.PI/2;strut.position.x=side*.16;satellite.add(strut);
  }
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.096,32,16,0,Math.PI*2,0,.85),new THREE.MeshStandardMaterial({color:0xe0e3e4,metalness:.5,roughness:.38,side:THREE.DoubleSide}));dish.rotation.x=.6;dish.position.y=.17;satellite.add(dish);
  const antenna=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,12),metal);antenna.position.y=.17;satellite.add(antenna);
  const comet=new THREE.Group();comet.name="彗星";group.add(comet);
  const nucleus=new THREE.Mesh(new THREE.IcosahedronGeometry(.035,2),new THREE.MeshStandardMaterial({map:moonMap,color:0x93aab5,roughness:1}));comet.add(nucleus);
  const cometHead=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xc9edff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));cometHead.scale.setScalar(.28);comet.add(cometHead);
  const tailPosition=new Float32Array(80*3),life=new Float32Array(80);
  for(let i=0;i<80;i++){const t=i/79;tailPosition[i*3]=-t*2.8;tailPosition[i*3+1]=Math.sin(t*9)*t*.055;life[i]=1-t;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(tailPosition,3));geometry.setAttribute("aLife",new THREE.BufferAttribute(life,1));
  const tailMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uFade:{value:1}},vertexShader:"attribute float aLife;varying float vLife;void main(){vLife=aLife;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=1.+aLife*4.;}",fragmentShader:"uniform float uFade;varying float vLife;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.48,.8,1.,max(0.,1.-r)*vLife*vLife*uFade*.55);}"});comet.add(new THREE.Points(geometry,tailMat));
  // Continuous curved dust tail alongside the narrow blue ion trail.
  const dustPositions=new Float32Array(65*2*3),dustUv=new Float32Array(65*2*2),dustIndex:number[]=[];
  for(let i=0;i<=64;i++){const t=i/64;for(let side=0;side<2;side++){
    const n=i*2+side;dustPositions[n*3]=-t*2.4;dustPositions[n*3+1]=t*t*.35+(side-.5)*(.04+t*.30);dustUv[n*2]=t;dustUv[n*2+1]=side;
  }if(i<64){const n=i*2;dustIndex.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const dustGeometry=new THREE.BufferGeometry().setAttribute("position",new THREE.BufferAttribute(dustPositions,3)).setAttribute("uv",new THREE.BufferAttribute(dustUv,2));dustGeometry.setIndex(dustIndex);
  const dustMaterial=new THREE.ShaderMaterial({uniforms:{uFade:{value:1}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform float uFade;varying vec2 vUv;void main(){float edge=pow(max(0.,1.-abs(vUv.y-.5)*2.),2.);gl_FragColor=vec4(.84,.75,.56,edge*pow(1.-vUv.x,1.8)*uFade*.28);}"});
  comet.add(new THREE.Mesh(dustGeometry,dustMaterial));
  const materials=new Map<THREE.Material,number>();group.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Sprite){const list=Array.isArray(object.material)?object.material:[object.material];list.forEach(m=>{materials.set(m,m.opacity);m.transparent=true;});}});
  return {group,update(time:number,progress:number){
    const fade=1-THREE.MathUtils.smoothstep(progress,.12,.67);group.visible=fade>.001;
    if(!group.visible)return;
    atmosphere.material.uniforms.uFade.value=fade;dustMaterial.uniforms.uFade.value=fade;clouds.rotation.y=time*.026;star.rotation.y=time*.038;
    materials.forEach((opacity,material)=>material.opacity=opacity*fade);tailMat.uniforms.uFade.value=fade;
    moonOrbit.rotation.y=time*.28;azure.rotation.y=time*.07;
    satellite.position.set(2.6+Math.cos(time*.13)*.35,.8+Math.sin(time*.2)*.18,-.4);satellite.rotation.set(.22,time*.17,-.22);
    corona.material.rotation=time*.025;
    const phase=(time+3)%16;comet.visible=phase<6;
    const travel=phase/6;comet.position.set(-7+travel*15,6-travel*3.8,-1.5);comet.rotation.z=Math.atan2(-3.8,15);
  }};
}



const fract=(x:number)=>x-Math.floor(x);
const hash=(x:number,y:number,z:number)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const smooth=(t:number)=>t*t*(3-2*t),u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
  const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),u),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w);
}
function fbm(x:number,y:number,z:number){return noise(x,y,z)*.57+noise(x*2.1,y*2.1,z*2.1)*.28+noise(x*4.3,y*4.3,z*4.3)*.15;}
export type SurfaceKind="gas"|"ocean"|"moon"|"star"|"cloud";
/** Seamless equirectangular maps sampled from 3D noise, generated once, never per frame. */
export function createCelestialTexture(kind:SurfaceKind) {
  const width=256,height=128,data=new Uint8Array(width*height*4);
  const craters=Array.from({length:22},(_,i)=>{const y=hash(i,3,1)*2-1,a=hash(i,5,2)*Math.PI*2,r=Math.sqrt(1-y*y);return {x:Math.cos(a)*r,y,z:Math.sin(a)*r,radius:.04+hash(i,6,9)*.2};});
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const u=i/(width-1),v=j/(height-1),theta=u*Math.PI*2,phi=v*Math.PI;
    const x=Math.cos(theta)*Math.sin(phi),y=Math.cos(phi),z=Math.sin(theta)*Math.sin(phi);
    const n=fbm(x*4+7,y*4+11,z*4+2),fine=noise(x*65,y*65,z*65);
    let r=0,g=0,b=0,alpha=255;
    if(kind==="gas"){
      const bands=.5+.5*Math.sin(y*52+(n-.5)*11),thin=.5+.5*Math.sin(y*173+n*4);
      const storm=Math.exp(-(((x-.72)*9)**2+((y+.22)*15)**2+((z-.59)*9)**2));
      r=140+bands*77+thin*18+storm*22;g=109+bands*68+thin*16-storm*35;b=79+bands*54+thin*13-storm*35;
    }else if(kind==="ocean"){
      const land=THREE.MathUtils.smoothstep(n,.49,.54),ice=THREE.MathUtils.smoothstep(Math.abs(y),.88,.98);
      r=THREE.MathUtils.lerp(13+n*15,69+fine*34,land);g=THREE.MathUtils.lerp(57+n*42,105+fine*30,land);b=THREE.MathUtils.lerp(103+n*62,83+fine*20,land);
      r=THREE.MathUtils.lerp(r,214,ice);g=THREE.MathUtils.lerp(g,225,ice);b=THREE.MathUtils.lerp(b,222,ice);
    }else if(kind==="moon"){
      let crater=0;for(const c of craters){const d=Math.hypot(x-c.x,y-c.y,z-c.z)/c.radius;if(d<1.3)crater+=Math.exp(-(((d-1)*11)**2))*25-Math.exp(-(d*d)*3)*29;}
      r=92+n*88+fine*18+crater;g=r*.97;b=r*.91;
    }else if(kind==="star"){
      const cell=fbm(x*31+1,y*31+3,z*31+7),spots=THREE.MathUtils.smoothstep(n,.59,.67);
      r=238+cell*17-spots*84;g=103+cell*108-spots*78;b=24+cell*67-spots*21;
    }else{
      const density=THREE.MathUtils.smoothstep(fbm(x*7+3,y*8,z*7),.49,.68);
      r=224;g=237;b=243;alpha=density*185;
    }
    const offset=(j*width+i)*4;data[offset]=THREE.MathUtils.clamp(r,0,255);data[offset+1]=THREE.MathUtils.clamp(g,0,255);data[offset+2]=THREE.MathUtils.clamp(b,0,255);data[offset+3]=alpha;
  }
  const texture=new THREE.DataTexture(data,width,height);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}
export function createRingTexture(){
  const width=512,data=new Uint8Array(width*4);
  for(let i=0;i<width;i++){const t=i/(width-1),band=.55+.18*Math.sin(i*.42)+.12*Math.sin(i*1.77),gap=t>.55&&t<.60;
    data[i*4]=185+band*52;data[i*4+1]=163+band*48;data[i*4+2]=126+band*50;
    data[i*4+3]=gap?8:Math.round(band*205*Math.sin(Math.PI*t)**.35);
  }
  const texture=new THREE.DataTexture(data,width,1);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
