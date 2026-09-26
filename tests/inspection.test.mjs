import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3,Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {rotateInspection,applyInspection} from '../app/experience/three/inspection.ts';
import {prepareCharacter} from '../app/experience/three/character-assets.ts';

test('vertical drag passes the poles and completes an unrestricted revolution',()=>{
 const orientation=new Quaternion(),camera=new Quaternion();
 for(let i=0;i<50;i++)rotateInspection(orientation,0,8,800,800,camera);
 assert.ok(new Vector3(0,1,0).applyQuaternion(orientation).y<-.999,'half-turn must be fully upside down');
 for(let i=0;i<50;i++)rotateInspection(orientation,0,8,800,800,camera);
 assert.ok(orientation.angleTo(new Quaternion())<1e-6);
});
test('mixed screen-space drags remain reversible at upside-down orientations',()=>{
 const q=new Quaternion(),camera=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-.16);
 const drags=[[0,400],[200,0],[85,103],[-72,300]];
 for(const [dx,dy] of drags)rotateInspection(q,dx,dy,800,800,camera);
 for(const [dx,dy] of drags.toReversed())rotateInspection(q,-dx,-dy,800,800,camera);
 assert.ok(q.angleTo(new Quaternion())<1e-6);assert.ok(Math.abs(q.length()-1)<1e-9);
});
test('inspection pivot stays fixed at the body centre rather than the feet',()=>{
 const source=new Group();source.add(new Mesh(new BoxGeometry(2,5,1),new MeshBasicMaterial()));
 const actor=prepareCharacter(source,'liangzai'),pivot=actor.children[0];
 actor.updateMatrixWorld(true);const before=pivot.getWorldPosition(new Vector3());
 const q=new Quaternion();rotateInspection(q,0,400,800,800,new Quaternion());applyInspection(actor,q);actor.updateMatrixWorld(true);
 assert.ok(pivot.getWorldPosition(new Vector3()).distanceTo(before)<1e-9);
 assert.ok(Math.abs(before.y-2.425)<1e-9);assert.equal(actor.rotation.x,0);
});
