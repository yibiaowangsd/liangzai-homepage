import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { AnimationMixer, Raycaster, Vector3, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function loadModel() {
  const file = await readFile(new URL('../public/assets/models/liangzai-v1.glb', import.meta.url));
  return new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
}

test('delivered GLB imports with finite geometry, reference details and playable articulation', async () => {
  const { scene, animations } = await loadModel();
  for (const name of ['Head', 'LeftArm', 'RightArm', 'Antenna', 'Eyes', 'Antenna_satellite_orb', 'Rear_head_service_panel', 'Chest_Q_white'])
    assert.ok(scene.getObjectByName(name), name);
  scene.traverse(node => {
    for (const [name, attribute] of Object.entries(node.geometry?.attributes ?? {}))
      assert.ok(attribute.array.every(Number.isFinite), `${node.name}.${name} contains invalid geometry`);
  });
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  assert.ok(size.y > 5 && size.y < 6 && size.x > 2.8 && size.x < 3.2);
  assert.deepEqual(animations.map(clip => clip.name), ['Idle', 'Hello']);
  const arm = scene.getObjectByName('LeftArm');
  const rest = arm.quaternion.clone();
  const mixer = new AnimationMixer(scene);
  mixer.clipAction(animations[1]).play();
  mixer.update(.6);
  assert.ok(rest.angleTo(arm.quaternion) > 1, 'Hello must actually move the articulated arm');
  mixer.stopAllAction();
  mixer.uncacheRoot(scene);
});

test('curved visor covers the head shell across its face instead of cutting through it', async () => {
  const { scene } = await loadModel();
  scene.updateMatrixWorld(true);
  const head = scene.getObjectByName('Head');
  const ray = new Raycaster();
  for (const x of [-.75, -.4, 0, .4, .75]) {
    for (const y of [-.45, -.15, .15]) {
      ray.set(new Vector3(x, 3.57 + y, 5), new Vector3(0, 0, -1));
      const hit = ray.intersectObject(head, true)[0];
      assert.ok(hit && hit.object.name !== 'Head_main_shell', `Shell protrudes through visor at ${x}, ${y}`);
    }
  }
});
