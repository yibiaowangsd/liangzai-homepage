import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createLiangzai } from '../app/experience/three/liangzai-model.ts';

// The exporter uses the browser FileReader API for its final binary assembly.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
const robot = createLiangzai();
robot.root.traverse(node => { node.geometry?.deleteAttribute('uv'); });
const binary = await new GLTFExporter().parseAsync(robot.root, {
  binary: true, trs: true, animations: robot.animationClips,
});
// Round-trip the delivered file, including the articulated animation tracks.
const imported = await new GLTFLoader().parseAsync(binary, '');
for (const name of ['Head', 'LeftArm', 'RightArm', 'Antenna', 'Eyes']) {
  if (!imported.scene.getObjectByName(name)) throw new Error(`Missing rig part: ${name}`);
}
if (imported.animations.length !== 2) throw new Error('Animation export failed');
const destination = new URL('../public/assets/models/liangzai-v1.glb', import.meta.url);
await mkdir(new URL('.', destination), {recursive: true});
await writeFile(destination, Buffer.from(binary));
robot.dispose();
console.log(`Exported and re-imported Liangzai: ${(binary.byteLength / 1024).toFixed(0)} KiB, Idle + Hello animations.`);
