import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { disposeObject } from '../app/experience/three/character-assets.ts';

test('scene disposal releases instance buffers and closes shared bitmap sources once', () => {
  const counts = { geometry: 0, material: 0, texture: 0, image: 0, instance: 0, shader: 0 };
  const source = { close() { counts.image++; } };
  const texture = new THREE.Texture(source), otherTexture = texture.clone();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const shader = new THREE.ShaderMaterial({ uniforms: { surface: { value: otherTexture } } });
  const instances = new THREE.InstancedMesh(geometry, material, 3);
  geometry.addEventListener('dispose', () => counts.geometry++);
  material.addEventListener('dispose', () => counts.material++);
  shader.addEventListener('dispose', () => counts.shader++);
  for (const item of [texture, otherTexture]) item.addEventListener('dispose', () => counts.texture++);
  instances.addEventListener('dispose', () => counts.instance++);
  const root = new THREE.Group();
  root.add(instances, new THREE.Mesh(geometry, [material, shader]));
  disposeObject(root);
  assert.deepEqual(counts, { geometry: 1, material: 1, texture: 2, image: 1, instance: 1, shader: 1 });
});
