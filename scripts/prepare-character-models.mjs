import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, basename } from 'node:path';

const sources = process.argv.slice(2);
if (sources.length !== 2) throw new Error('Usage: npm run models:prepare -- liangzai.glb nailong.glb');
const ids = ['liangzai', 'nailong'];
const directory = resolve('public/assets/models/observatory');
await mkdir(directory, { recursive: true });
await mkdir('outputs/model-packed', { recursive: true });
const sha = data => createHash('sha256').update(data).digest('hex');
const inspect = data => {
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB');
  const json = JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  return { triangles: json.meshes.reduce((sum,m) => sum+m.primitives.reduce((n,p) => n+json.accessors[p.indices].count/3,0),0), materials:json.materials.length, meshes:json.meshes.length, images:(json.images??[]).length };
};
function imageHashes(data) {
  const n=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+n).toString()),start=28+n;
  return (json.images??[]).map(image=>{const view=json.bufferViews[image.bufferView];return sha(data.subarray(start+(view.byteOffset??0),start+(view.byteOffset??0)+view.byteLength));});
}
const catalog = {};
for (let i=0; i<ids.length; i++) {
  const id=ids[i], source=resolve(sources[i]);
  const packed=resolve(`outputs/model-packed/${id}.glb`);
  execFileSync(process.execPath, ['node_modules/gltfpack/cli.js','-i',source,'-o',packed,'-cc','-kn','-km','-ke','-vp','16','-vn','12','-vt','14'], {timeout:60000,stdio:'inherit'});
  const original=await readFile(source), binary=await readFile(packed), hash=sha(binary);
  const parts=[];
  for(let offset=0;offset<binary.length;offset+=393216) {
    const filename=`${id}-${hash.slice(0,10)}-${String(parts.length+1).padStart(2,'0')}.bin`;
    const part=binary.subarray(offset,offset+393216);
    await writeFile(resolve(directory,filename),part);
    parts.push({url:`/assets/models/observatory/${filename}`,bytes:part.length});
  }
  catalog[id]={ source:basename(source),sourceSha256:sha(original),sha256:hash,sourceBytes:original.length,bytes:binary.length,sourceGeometry:inspect(original),geometry:inspect(binary),sourceImageHashes:imageHashes(original),imageHashes:imageHashes(binary),parts };
}
await writeFile('app/experience/three/model-catalog.json',JSON.stringify(catalog,null,2)+'\n');
// Full GLBs live in outputs; the site reassembles immutable, bounded-size chunks.
await Promise.all(ids.map(id=>rm(resolve(directory,`${id}.glb`),{force:true})));
console.log(Object.fromEntries(Object.entries(catalog).map(([id,m])=>[id,{bytes:m.bytes,parts:m.parts.length,triangles:m.geometry.triangles}])));
