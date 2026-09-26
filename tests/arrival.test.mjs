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
 s.hold(false);advance(s,1.4);assert.equal(s.phase,'formed');assert.ok(s.afterglow>.9);advance(s,3.1);assert.equal(s.active,false);assert.equal(s.afterglow,0);
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


test('initial field covers a broad volume with sparse outer stars and dense filaments',async()=>{
 const {createNebulaField}=await import('../app/experience/three/nebula.ts');
 let seed=7123;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const {positions,seeds}=createNebulaField(18000,random);
 assert.ok(positions.every(Number.isFinite));assert.ok(seeds.every(x=>x>=0&&x<1));
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,far=0;
 for(let i=0;i<positions.length;i+=3){left=Math.min(left,positions[i]);right=Math.max(right,positions[i]);bottom=Math.min(bottom,positions[i+1]);top=Math.max(top,positions[i+1]);if(Math.abs(positions[i])>4)far++;}
 assert.ok(right-left>14,'wider than the previous 7.4-unit field');
 assert.ok(top-bottom>7,'cloud has vertical breadth');
 assert.ok(far>2000,'outer field contains meaningful star coverage');
});

test('cursor wake cannot rewrite silhouette targets and all nebula layers disappear when formed',async()=>{
 const {createNebula}=await import('../app/experience/three/nebula.ts');
 const {Vector4}=await import('three');
 const nebula=createNebula(null,'nailong',1000),target=nebula.points.geometry.getAttribute('position').array.slice();
 const wake=Array.from({length:6},(_,i)=>new Vector4(i,2,1,2));
 nebula.interact(wake,new Vector3(1,2,1),new Vector3(1,2,1));
 nebula.update(1.2,.4,800,true);
 assert.deepEqual(nebula.points.geometry.getAttribute('position').array,target);
 assert.equal(nebula.points.visible,true);assert.ok(nebula.points.children[0].visible);
 nebula.update(2,.7,800,true);assert.equal(nebula.points.children[0].visible,false);
 nebula.update(3,1,800,true);assert.equal(nebula.points.visible,false);
 nebula.dispose();
});


test('switching between exhibits preserves formed models and a settling particle tail',async()=>{
 const {createArrivalMemory}=await import('../app/experience/three/arrival-state.ts');const memory=createArrivalMemory();
 const single=memory.select('liangzai');single.hold(true);advance(single,5.4);assert.equal(single.phase,'formed');
 const a=single.afterglow;assert.ok(a>0);advance(single,1);assert.ok(single.afterglow<a);
 assert.equal(memory.select('nailong').phase,'nebula');assert.equal(memory.select('liangzai'),single);assert.equal(single.phase,'formed');
 const duo=memory.select('duo');duo.hold(true);advance(duo,5.4);memory.select('nailong');assert.equal(memory.select('duo').phase,'formed');
 single.hold(false);advance(single,30);assert.equal(single.phase,'formed');assert.equal(single.afterglow,0);
});
test('quantum orbital ribbons and dragon nursery clouds have distinct geometry with the same random input',async()=>{
 const {createNebulaField,localWakeWeight,LOCAL_WAKE_RADIUS,createNebula}=await import('../app/experience/three/nebula.ts');
 const rng=()=>{let seed=319;return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);};
 const a=createNebulaField(4000,rng(),'liangzai'),b=createNebulaField(4000,rng(),'nailong');
 let different=0;for(let i=0;i<a.positions.length;i++)if(Math.abs(a.positions[i]-b.positions[i])>.3)different++;
 assert.ok(different>7000);assert.equal(localWakeWeight(LOCAL_WAKE_RADIUS),0);assert.equal(localWakeWeight(5),0);assert.ok(localWakeWeight(.4)>.5);
 const cloud=createNebula(null,'liangzai',200);cloud.update(5,1,800,true,.7);assert.equal(cloud.points.visible,true);cloud.update(9,1,800,true,0);assert.equal(cloud.points.visible,false);cloud.dispose();
});


test('afterglow crosses the materialization boundary continuously, without a bright single-frame reappearance',async()=>{
 const {createNebula}=await import('../app/experience/three/nebula.ts');const cloud=createNebula(null,'liangzai',200);
 cloud.update(5,.9999,800,true,0);const before=cloud.points.material.uniforms.uAfterglow.value;
 cloud.update(5.01,1,800,true,1);assert.ok(Math.abs(before-cloud.points.material.uniforms.uAfterglow.value)<.001);cloud.dispose();
});
