import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3, Vector3, Texture } from 'three';
import { prepareCharacter } from '../app/experience/three/character-assets.ts';
import sharp from 'sharp';
const catalog=JSON.parse(await readFile(new URL('../app/experience/three/model-catalog.json',import.meta.url),'utf8'));
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
async function load(id){
 const m=catalog[id],parts=await Promise.all(m.parts.map(p=>readFile(new URL('../public'+p.url,import.meta.url))));
 parts.forEach((part,i)=>assert.equal(part.length,m.parts[i].bytes));
 const binary=Buffer.concat(parts);assert.equal(binary.length,m.bytes);assert.equal(sha(binary),m.sha256);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 // Geometry tests don't need a browser image decoder. Embedded image bytes are checked separately.
 loader.register(()=>({name:'CPU_GEOMETRY_CHECK',loadTexture:()=>Promise.resolve(new Texture())}));
 const gltf=await loader.parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
 return {gltf,binary};
}
for(const id of ['liangzai','nailong'])test(`${id}: uploaded geometry decodes and Web texture metadata matches`,async()=>{
 const {gltf,binary}=await load(id),m=catalog[id];
 assert.ok(m.bytes<m.sourceBytes*.3);assert.ok(m.geometry.triangles>=m.sourceGeometry.triangles*.998);
 assert.equal(m.geometry.materials,m.sourceGeometry.materials);
 const json=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());
 const start=28+binary.readUInt32LE(12);
 const images=(json.images??[]).map(im=>{const v=json.bufferViews[im.bufferView];return sha(binary.subarray(start+(v.byteOffset??0),start+(v.byteOffset??0)+v.byteLength));});
 assert.deepEqual(images,m.imageHashes,'Embedded artwork must match the published Web asset');
 assert.equal(images.length,m.sourceImageHashes.length,'Texture resizing must not add or drop artwork');
 for(let i=0;i<(json.images??[]).length;i++){
  const v=json.bufferViews[json.images[i].bufferView];
  const data=binary.subarray(start+(v.byteOffset??0),start+(v.byteOffset??0)+v.byteLength);
  const decoded=await sharp(data).raw().toBuffer({resolveWithObject:true});
  assert.equal(decoded.info.width,m.images[i].width);assert.equal(decoded.info.height,m.images[i].height);
  if(id==='nailong'){assert.equal(decoded.info.width,2048);assert.equal(decoded.info.height,1024);}
 }
 let vertices=0;gltf.scene.traverse(node=>{if(node.geometry){const p=node.geometry.getAttribute('position');vertices+=p.count;for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));}});
 assert.ok(vertices>10000);assert.equal(gltf.animations.length,0,'Uploads are static models; do not invent an embedded rig');
 const normalized=prepareCharacter(gltf.scene,id);const b=new Box3().setFromObject(normalized);
 assert.ok(Math.abs(b.min.y)<.001,'Feet should rest on the pedestal');assert.ok(Math.abs(b.getSize(new Vector3()).y-(id==='liangzai'?4.85:4.12))<.001);
});
test('both models fit the shared pedestal without overlapping silhouettes',async()=>{
 const boxes=[];
 for(const id of ['liangzai','nailong']){const {gltf}=await load(id);const actor=prepareCharacter(gltf.scene,id);actor.scale.setScalar(.87);actor.position.x=id==='liangzai'?-1.24:1.22;boxes.push(new Box3().setFromObject(actor));}
 assert.ok(boxes[0].max.x<boxes[1].min.x);
 assert.ok(boxes.every(box=>box.min.x>-2.5&&box.max.x<2.5));
});
test('every model mode has all four usable fallback views',async()=>{
 for(const mode of ['liangzai','nailong','duo'])for(const view of ['front','side','back','reset']){
  const file=await readFile(new URL(`../public/assets/models/observatory/${mode}-${view}.webp`,import.meta.url));
  assert.equal(file.subarray(0,4).toString(),'RIFF');assert.equal(file.subarray(8,12).toString(),'WEBP');assert.ok(file.length>10000);
 }
});
