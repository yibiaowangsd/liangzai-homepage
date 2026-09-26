import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Vector3} from 'three';
import {prepareCharacter} from '../app/experience/three/character-assets.ts';
import {createLiangzaiRig} from '../app/experience/three/liangzai-rig.ts';
async function load(){
 const cat=JSON.parse(await readFile(new URL('../app/experience/three/model-catalog.json',import.meta.url),'utf8')).liangzai;
 const b=Buffer.concat(await Promise.all(cat.parts.map(p=>readFile(new URL('../public'+p.url,import.meta.url)))));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 return prepareCharacter(gltf.scene,'liangzai');
}
test('adding rigid joints preserves every original mesh and its exact rest transform',async()=>{
 const actor=await load();actor.updateMatrixWorld(true);const before=new Map();
 actor.traverse(n=>{if(n.isMesh)before.set(n,{geometry:n.geometry,matrix:n.matrixWorld.clone()});});
 const rig=createLiangzaiRig(actor);rig.reset();actor.updateMatrixWorld(true);
 let meshes=0;actor.traverse(n=>{if(!n.isMesh)return;meshes++;const saved=before.get(n);assert.ok(saved);assert.equal(n.geometry,saved.geometry);n.matrixWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-saved.matrix.elements[i])<1e-6,n.parent.name));});
 assert.equal(meshes,68);assert.equal(Object.keys(rig.joints).length,12);
});
test('head, arm, antenna and eye actions move their own components without moving the torso',async()=>{
 const actor=await load(),rig=createLiangzaiRig(actor);
 const torso=actor.getObjectByName('Torso_|_continuous_white_suit');actor.updateMatrixWorld(true);
 const torsoRest=torso.matrixWorld.clone(),head=actor.getObjectByName('Head_|_broad_curved_shell'),arm=actor.getObjectByName('L_glove_|_smooth_mitten');
 const headRest=head.matrixWorld.clone(),handRest=arm.getWorldPosition(new Vector3());
 rig.pose.headYaw=.4;rig.pose.leftArm=-1.35;rig.pose.antenna=.2;rig.pose.blink=.07;rig.apply(0,false);actor.updateMatrixWorld(true);
 assert.deepEqual(torso.matrixWorld.elements,torsoRest.elements);
 assert.ok(head.matrixWorld.elements.some((v,i)=>Math.abs(v-headRest.elements[i])>.01));
 assert.ok(arm.getWorldPosition(new Vector3()).distanceTo(handRest)>.6);
 assert.equal(rig.joints.antenna.rotation.z,.2);assert.equal(rig.joints.leftEye.scale.y,.07);
 assert.equal(actor.rotation.x,0);assert.equal(actor.rotation.y,0);assert.equal(actor.position.y,0);
 rig.reset();actor.updateMatrixWorld(true);assert.ok(arm.getWorldPosition(new Vector3()).distanceTo(handRest)<1e-6);
});


test('idle LED eyes retain their brightness geometry across former automatic blink boundaries',async()=>{
 const actor=await load(),rig=createLiangzaiRig(actor);
 for(let time=0;time<30;time+=.02){rig.apply(time,true);assert.equal(rig.joints.leftEye.scale.y,1);assert.equal(rig.joints.rightEye.scale.y,1);}
 rig.pose.blink=.07;rig.apply(4.93,true);assert.equal(rig.joints.leftEye.scale.y,.07,'explicit click blink remains supported');
});
