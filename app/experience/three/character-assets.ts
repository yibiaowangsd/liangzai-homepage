import * as THREE from "three";
import catalog from "./model-catalog.json" with { type: "json" };
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export type CharacterId = "liangzai" | "nailong";
export type ModelMode = CharacterId | "duo";
export type ModelView = "front" | "side" | "back" | "reset";
export const CHARACTERS = {
  liangzai: { label: "量仔", height: 4.85 },
  nailong: { label: "奶龙", height: 4.12 },
} as const;
export const VIEW_ANGLES = { front: 0, side: Math.PI / 2, back: Math.PI, reset: -0.18 };

/** A wrapper scales/centres the imported asset; its geometry and materials stay intact. */
export function prepareCharacter(source: THREE.Group, id: CharacterId) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("Invalid character dimensions");
  const content = new THREE.Group();
  content.name = `${id}_content`;
  content.add(source);
  source.position.sub(new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y, (bounds.min.z + bounds.max.z) / 2));
  const scale = CHARACTERS[id].height / size.y;
  content.scale.setScalar(scale);
  source.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const pivot = new THREE.Group();
  pivot.name = `${id}_turntable`;
  // The outer actor stays on the pedestal; inspection rotates around its centre.
  const inspection = new THREE.Group();
  inspection.name = `${id}_inspection`;
  inspection.position.y = CHARACTERS[id].height / 2;
  content.position.y = -CHARACTERS[id].height / 2;
  inspection.add(content);
  pivot.add(inspection);
  return pivot;
}

export async function loadCharacter(id: CharacterId, signal: AbortSignal) {
  const model = catalog[id];
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(18000)]);
  const parts = await Promise.all(model.parts.map(async part => {
    const response = await fetch(part.url, { signal: requestSignal });
    if (!response.ok) throw new Error(`Model unavailable (${response.status})`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== part.bytes) throw new Error("Incomplete model part");
    return bytes;
  }));
  const bytes = new Uint8Array(model.bytes);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  signal.throwIfAborted();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(bytes.buffer, "");
  if (signal.aborted) { disposeObject(gltf.scene); signal.throwIfAborted(); }
  return prepareCharacter(gltf.scene, id);
}

/** Includes GLTF ImageBitmaps and shared resources, released exactly once. */
export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) { const image = texture.source?.data as { close?: () => void } | undefined; image?.close?.(); texture.dispose(); }
  for (const material of materials) material.dispose();
}
