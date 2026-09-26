import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,Vector3,Box3} from 'three';
import {createArrivalState} from '../app/experience/three/arrival-state.ts';
import {sampleCharacterSurface} from '../app/experience/three/nebula.ts';
const advance=(s,seconds)=>{for(let i=0;i<Math.ceil(seconds/.02);i++)s.step(.02);};
test('starts as a nebula; an incomplete hold reverses fully on release',()=>{
 const s=createArrivalState();assert.equal(s.phase,'nebula');assert.equal(s.active,false);
 s.hold(true);advance(s,2);assert.equal(s.phase,'gathering');assert.ok(s.progress>.38&&s.progress<.4);
 s.hold(false);advance(s,2);assert.equal(s.phase,'nebula');assert.equal(s.progress,0);assert.equal(s.active,false);
});
test('silhouette locks after four seconds and materializes even after release',()=>{
 const s=createArrivalState();s.hold(true);advance(s,4.05);assert.equal(s.phase,'revealing');
 s.hold(false);advance(s,1.4);assert.equal(s.phase,'formed');assert.equal(s.active,false);
 s.hold(true);advance(s,1);assert.equal(s.progress,1);
 s.reset();assert.equal(s.phase,'nebula');assert.equal(s.active,false);
});
test('background gaps cannot complete a hold in one frame, and model switch clears hold',()=>{
 const s=createArrivalState();s.hold(true);s.step(90);assert.ok(s.progress<.02);
 s.reset();advance(s,5);assert.equal(s.progress,0);
});
test('surface targets include transformed child parts and exclude actor placement',()=>{
 const actor=new Group();actor.position.set(20,0,0);actor.scale.setScalar(.8);
 const mesh=new Mesh(new BoxGeometry(2,4,2),new MeshStandardMaterial({color:0x44aaff}));mesh.position.y=3;actor.add(mesh);
 const {positions,colors}=sampleCharacterSurface(actor,1000);
 const box=new Box3().setFromBufferAttribute({count:positions.length/3,getX:i=>positions[i*3],getY:i=>positions[i*3+1],getZ:i=>positions[i*3+2]});
 assert.ok(box.min.distanceTo(new Vector3(-1,1,-1))<.02);assert.ok(box.max.distanceTo(new Vector3(1,5,1))<.02);
 for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3);assert.ok(Math.min(Math.abs(Math.abs(x)-1),Math.abs(Math.abs(y-3)-2),Math.abs(Math.abs(z)-1))<1e-5);}
 assert.ok(colors.every(Number.isFinite));mesh.geometry.dispose();mesh.material.dispose();
});

// Real assets catch hierarchy/normalization failures that primitive geometry cannot.
for(const id of ['liangzai','nailong'])test(`${id}: actual asset produces a complete finite particle silhouette`,async()=>{
 const {readFile}=await import('node:fs/promises');
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const {MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');
 const {Texture}=await import('three');
 const {prepareCharacter,disposeObject}=await import('../app/experience/three/character-assets.ts');
 const catalog=JSON.parse(await readFile(new URL('../app/experience/three/model-catalog.json',import.meta.url),'utf8'));
 const bytes=Buffer.concat(await Promise.all(catalog[id].parts.map(p=>readFile(new URL('../public'+p.url,import.meta.url)))));
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 loader.register(()=>({name:'CPU_GEOMETRY_CHECK',loadTexture:()=>Promise.resolve(new Texture())}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const actor=prepareCharacter(gltf.scene,id);
 if(id==='liangzai'){const {createLiangzaiRig}=await import('../app/experience/three/liangzai-rig.ts');createLiangzaiRig(actor);}
 const {positions}=sampleCharacterSurface(actor,18000);
 assert.ok(positions.every(Number.isFinite));
 let min=Infinity,max=-Infinity;for(let i=1;i<positions.length;i+=3){min=Math.min(min,positions[i]);max=Math.max(max,positions[i]);}
 const height=id==='liangzai'?4.85:4.12;
 assert.ok(min<.03,'feet captured');assert.ok(max>height-.08,'crown captured');
 assert.ok(max<=height+.001);disposeObject(actor);
});
