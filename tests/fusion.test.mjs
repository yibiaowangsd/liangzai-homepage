import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {createFusionState} from '../app/experience/three/fusion-state.ts';
import {createFusionGuardian} from '../app/experience/three/fusion-model.ts';
import {createCelestialSystem} from '../app/experience/three/celestial.ts';
import {disposeObject} from '../app/experience/three/character-assets.ts';
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
test('fusion model is a separate complete shaded mesh with a surface matching its bounds',()=>{
 const {actor,update}=createFusionGuardian();const b=new Box3().setFromObject(actor),size=b.getSize(new Vector3());
 assert.ok(b.min.y>=-.02);assert.ok(size.y>5&&size.y<5.5);assert.ok(size.x>2&&size.x<4);
 for(const name of ['Golden_dragon_face','Ceramic_helmet','Quantum_core','Quantum_antenna','Dragon_tail','Dragon_smile'])assert.ok(actor.getObjectByName(name),name);
 let triangles=0;actor.traverse(o=>{if(o.geometry){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));triangles+=(o.geometry.index?.count??p.count)/3;}});
 assert.ok(triangles<150000,'fusion stays inside its geometry budget');
 const cloud=sampleCharacterSurface(actor,4000);assert.ok(cloud.positions.every(Number.isFinite));update(2,1,true);disposeObject(actor);
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
