import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {createFusionState} from '../app/experience/three/fusion-state.ts';
import {createFusionGuardian} from '../app/experience/three/fusion-model.ts';
import {createCelestialSystem} from '../app/experience/three/celestial.ts';
import {prepareCharacter,disposeObject} from '../app/experience/three/character-assets.ts';
import {sampleCharacterSurface} from '../app/experience/three/nebula.ts';
const advance=(s,t)=>{for(let i=0;i<Math.ceil(t/.02);i++)s.step(.02);};
test('short holds and cancelled drags never enter fusion',()=>{
 const s=createFusionState();s.hold(true);advance(s,.8);assert.equal(s.phase,'charging');
 s.hold(false);advance(s,1);assert.equal(s.phase,'idle');assert.equal(s.active,false);
});
test('two-second second hold commits fusion; completion and exit are independent of release',()=>{
 const s=createFusionState();s.hold(true);advance(s,2.1);assert.equal(s.phase,'merging');
 s.hold(false);advance(s,4.3);assert.equal(s.phase,'fused');assert.ok(s.afterglow>.9);advance(s,3.1);assert.equal(s.active,false);assert.equal(s.afterglow,0);s.hold(false);advance(s,15);assert.equal(s.phase,'fused');
 s.reset();assert.equal(s.phase,'idle');assert.equal(s.progress,0);assert.equal(s.charge,0);
 s.hold(true);s.step(300);assert.equal(s.phase,'charging');assert.ok(s.charge<.04);
});
async function sourceModel(){
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');
 const {createLiangzaiRig}=await import('../app/experience/three/liangzai-rig.ts');
 const catalog=JSON.parse(await readFile(new URL('../app/experience/three/model-catalog.json',import.meta.url),'utf8')).liangzai;
 const bytes=Buffer.concat(await Promise.all(catalog.parts.map(p=>readFile(new URL('../public'+p.url,import.meta.url)))));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const source=prepareCharacter(gltf.scene,'liangzai');createLiangzaiRig(source);return source;
}
test('A2 model retains the real screen head with independent materials, a pear body and tapered tail',async()=>{
 const source=await sourceModel(),{actor,update}=createFusionGuardian(source);const b=new Box3().setFromObject(actor),size=b.getSize(new Vector3());
 assert.ok(b.min.y>=-.02);assert.ok(size.y>5&&size.y<5.5);assert.ok(size.x>2&&size.x<4);
 for(const name of ['A2_screen_head','Golden_pear_body','Cream_belly_patch','Quantum_core','Thick_tapered_tail','Rounded_gold_horn'])assert.ok(actor.getObjectByName(name),name);
 let triangles=0;actor.traverse(o=>{if(o.geometry){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));triangles+=(o.geometry.index?.count??p.count)/3;}});
 assert.ok(triangles<250000,'fusion stays inside its geometry budget');
 const cloud=sampleCharacterSurface(actor,4000);assert.ok(cloud.positions.every(Number.isFinite));update(2,1,true);
 const originalEye=source.getObjectByName('joint_leftEye'),fusionEye=actor.getObjectByName('joint_leftEye');
 update(4.93,1,true);assert.ok(fusionEye.scale.y<.1);assert.ok(Math.abs(originalEye.scale.y-1)<1e-12);
 let originalMesh;originalEye.traverse(o=>{if(o.isMesh)originalMesh=o;});let clonedMesh;fusionEye.traverse(o=>{if(o.isMesh)clonedMesh=o;});
 assert.equal(clonedMesh.geometry,originalMesh.geometry,'reuses real surface geometry');assert.notEqual(clonedMesh.material,originalMesh.material,'reveal and shading uniforms stay independent');
 update(5.2,0,true);assert.equal(fusionEye.scale.y,1);update(4.93,0,false);assert.equal(fusionEye.scale.y,1);
 const tail=new Box3().setFromObject(actor.getObjectByName('Thick_tapered_tail'));assert.ok(tail.min.z < -1.7);
 const body=new Box3().setFromObject(actor.getObjectByName('Golden_pear_body'));assert.ok(body.max.x-body.min.x>1.9);
 disposeObject(actor);disposeObject(source);
});
test('celestial system contains all requested bodies and retreats during model formation',()=>{
 const c=createCelestialSystem();for(const name of ['恒星','环状行星','蓝色行星','天然卫星','量子通信卫星','彗星'])assert.ok(c.group.getObjectByName(name),name);
 c.update(1,0);assert.equal(c.group.visible,true);c.update(2,1);assert.equal(c.group.visible,false);disposeObject(c.group);
});


test('celestial surfaces have seam-safe detail maps and remain inside a bounded geometry budget',()=>{
 const c=createCelestialSystem();let triangles=0;
 for(const name of ['恒星','环状行星','蓝色行星','天然卫星']){
   const map=c.group.getObjectByName(name).material.map;assert.ok(map);assert.equal(map.image.width,256);
   const pixels=map.image.data;assert.ok(new Set(pixels.filter((_,i)=>i%4===0)).size>35);
   for(let y=0;y<128;y++)for(let k=0;k<4;k++)assert.ok(Math.abs(pixels[y*256*4+k]-pixels[(y*256+255)*4+k])<=1,'seam is continuous');
 }
 assert.ok(c.group.getObjectByName('分层冰尘环'));assert.ok(c.group.getObjectByName('云层'));
 c.group.traverse(o=>{if(o.geometry)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
 assert.ok(triangles<45000);disposeObject(c.group);
});


test('returning from completed fusion docks the result without resetting its model or progress',()=>{
 const fusion=createFusionState();fusion.hold(true);advance(fusion,6.5);assert.equal(fusion.phase,'fused');
 fusion.returnToStage();assert.equal(fusion.phase,'docked');assert.equal(fusion.progress,1);assert.equal(fusion.suppressClick,false,'completed charge must not suppress future model clicks');
 fusion.hold(false);advance(fusion,8);assert.equal(fusion.phase,'docked');assert.equal(fusion.progress,1);assert.equal(fusion.active,false);
 fusion.returnToStage();assert.equal(fusion.phase,'docked','switching away and returning retains the completed result');
 fusion.reset();fusion.hold(true);advance(fusion,3);assert.equal(fusion.phase,'merging');fusion.returnToStage();assert.equal(fusion.phase,'idle','explicit early exit cancels only unfinished fusion');
});
