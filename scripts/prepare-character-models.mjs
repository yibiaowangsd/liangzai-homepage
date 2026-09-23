import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, basename } from 'node:path';
import { imageBuffers, imageMetadata, resizeWebTextures, sha } from './model-textures.mjs';

const sources = process.argv.slice(2);
const refreshTextures = sources.length === 1 && sources[0] === '--refresh-textures';
if (!refreshTextures && sources.length !== 2) throw new Error('Usage: npm run models:prepare -- liangzai.glb nailong.glb | --refresh-textures');
const ids = ['liangzai', 'nailong'];
const directory = resolve('public/assets/models/observatory');
await mkdir(directory, { recursive: true });
await mkdir('outputs/model-packed', { recursive: true });
const inspect = data => {
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB');
  const json = JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  return { triangles: json.meshes.reduce((sum,m) => sum+m.primitives.reduce((n,p) => n+json.accessors[p.indices].count/3,0),0), materials:json.materials.length, meshes:json.meshes.length, images:(json.images??[]).length };
};
function imageHashes(data) {
  return imageBuffers(data).map(sha);
}
const previous = refreshTextures ? JSON.parse(await readFile('app/experience/three/model-catalog.json', 'utf8')) : null;
const catalog = {};
for (let i=0; i<ids.length; i++) {
  const id=ids[i];
  const packed=resolve(`outputs/model-packed/${id}.glb`);
  let input, provenance;
  if (refreshTextures) {
    const model = previous[id];
    input = Buffer.concat(await Promise.all(model.parts.map(async part => {
      const bytes = await readFile(resolve('public', part.url.slice(1)));
      if (bytes.length !== part.bytes) throw new Error('Incomplete model part');
      return bytes;
    })));
    if (sha(input) !== model.sha256) throw new Error('Model checksum mismatch');
    provenance = { source:model.source, sourceSha256:model.sourceSha256, sourceBytes:model.sourceBytes, sourceGeometry:model.sourceGeometry, sourceImageHashes:model.sourceImageHashes };
  } else {
    const source=resolve(sources[i]);
    execFileSync(process.execPath, ['node_modules/gltfpack/cli.js','-i',source,'-o',packed,'-cc','-kn','-km','-ke','-vp','16','-vn','12','-vt','14'], {timeout:60000,stdio:'inherit'});
    const original=await readFile(source);
    input=await readFile(packed);
    provenance={ source:basename(source),sourceSha256:sha(original),sourceBytes:original.length,sourceGeometry:inspect(original),sourceImageHashes:imageHashes(original) };
  }
  const binary=id==='nailong' ? await resizeWebTextures(input) : input, hash=sha(binary);
  await writeFile(packed,binary);
  const parts=[];
  for(let offset=0;offset<binary.length;offset+=393216) {
    const filename=`${id}-${hash.slice(0,10)}-${String(parts.length+1).padStart(2,'0')}.bin`;
    const part=binary.subarray(offset,offset+393216);
    await writeFile(resolve(directory,filename),part);
    parts.push({url:`/assets/models/observatory/${filename}`,bytes:part.length});
  }
  catalog[id]={ ...provenance,sha256:hash,bytes:binary.length,geometry:inspect(binary),imageHashes:imageHashes(binary),images:await imageMetadata(binary),parts };
  if (id==='nailong') catalog[id].textureOptimization={ method:'resize-only',maxWidth:2048,maxHeight:1024 };
}
await writeFile('app/experience/three/model-catalog.json',JSON.stringify(catalog,null,2)+'\n');
// Full GLBs live in outputs; the site reassembles immutable, bounded-size chunks.
// Keep previous hashed chunks so tabs opened before a release can still load their catalog.
await Promise.all(ids.map(id=>rm(resolve(directory,`${id}.glb`),{force:true})));
console.log(Object.fromEntries(Object.entries(catalog).map(([id,m])=>[id,{bytes:m.bytes,parts:m.parts.length,triangles:m.geometry.triangles}])));
