import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { CharacterId } from "./character-assets";

/** Sample actual triangle surfaces, area weighted in actor space, including every rigid part. */
export function sampleCharacterSurface(actor: THREE.Group, count: number) {
  actor.updateMatrixWorld(true);
  const inverse = actor.matrixWorld.clone().invert();
  const surfaces: { geometry: THREE.BufferGeometry; sampler: MeshSurfaceSampler; area: number; color: THREE.Color }[] = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  actor.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.geometry.getAttribute("position");
    if (!source) return;
    // Meshopt assets use normalized integer positions. Expand before transforming:
    // applying a world matrix to the packed attribute would round/clamp the silhouette.
    const floats = new Float32Array(source.count * 3);
    for (let i = 0; i < source.count; i++) { floats[i * 3] = source.getX(i); floats[i * 3 + 1] = source.getY(i); floats[i * 3 + 2] = source.getZ(i); }
    const geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(floats, 3));
    if (object.geometry.index) geometry.setIndex(object.geometry.index.clone());
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    const positions = geometry.getAttribute("position"), indices = geometry.index;
    let area = 0;
    for (let i = 0, n = indices?.count ?? positions.count; i + 2 < n; i += 3) {
      a.fromBufferAttribute(positions, indices ? indices.getX(i) : i);
      b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1);
      c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2);
      area += b.sub(a).cross(c.sub(a)).length() * .5;
    }
    if (area <= 0) { geometry.dispose(); return; }
    total += area;
    const mat = (Array.isArray(object.material) ? object.material[0] : object.material) as THREE.MeshStandardMaterial;
    surfaces.push({ geometry, sampler: new MeshSurfaceSampler(new THREE.Mesh(geometry, mat)).build(), area: total, color: mat.color?.clone() ?? new THREE.Color("white") });
  });
  if (!total) throw new Error("Character surface is empty");
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), point = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const pick = Math.random() * total;
    let low = 0, high = surfaces.length - 1;
    while (low < high) { const mid = (low + high) >>> 1; if (surfaces[mid].area < pick) low = mid + 1; else high = mid; }
    const surface = surfaces[low];
    surface.sampler.sample(point); point.toArray(positions, i * 3);
    surface.color.toArray(colors, i * 3);
  }
  surfaces.forEach(surface => surface.geometry.dispose());
  return { positions, colors };
}

export function createNebula(actor: THREE.Group | null, id: CharacterId = "liangzai", count = 18000) {
  const sampled = actor ? sampleCharacterSurface(actor, count) : { positions: new Float32Array(count * 3), colors: new Float32Array(count * 3).fill(1) };
  const scatter = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), .65) * 3.7, arm = i % 3 * Math.PI * 2 / 3;
    const angle = arm + r * 1.45 + (Math.random() - .5) * .85;
    scatter[i * 3] = Math.cos(angle) * r;
    scatter[i * 3 + 1] = 2.6 + Math.sin(angle) * r * .65 + (Math.random() - .5) * .6;
    scatter[i * 3 + 2] = Math.sin(angle) * r * .38 + (Math.random() - .5) * .8;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(sampled.positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(sampled.colors, 3));
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    uMotion: { value: 1 }, uTime: { value: 0 }, uProgress: { value: 0 }, uResolution: { value: 700 },
    uColor: { value: new THREE.Color(id === "nailong" ? "#ffca67" : "#65cfff") },
    uAccent: { value: new THREE.Color(id === "nailong" ? "#ff9954" : "#9678ef") },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aScatter; attribute vec3 aColor; attribute float aSeed;
      uniform float uTime, uProgress, uResolution, uMotion; uniform vec3 uColor, uAccent;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float gather = smoothstep(0.05, 0.72, uProgress);
        float spin = (uTime * .07 + uProgress * 5.0) * uMotion;
        vec3 cloud = aScatter - vec3(0., 2.6, 0.);
        float angle = spin * (1.0 - gather);
        cloud.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * cloud.xy;
        cloud.z += sin(uTime * .35 + aSeed * 40.) * .15 * uMotion;
        cloud += vec3(0., 2.6, 0.);
        vec3 p = mix(cloud, position, gather);
        p += vec3(sin(aSeed*100.+uTime), cos(aSeed*70.+uTime*.7), sin(aSeed*40.)) * sin(gather*3.14159) * .22 * uMotion;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.2 + aSeed * 1.7, 1.25, gather);
        gl_PointSize = clamp(size * uResolution / 700. * 11. / max(1., -mv.z), 1., 5.);
        vColor = mix(uColor, uAccent, aSeed * (1. - gather)) * (1.2 + gather * .9);
        vColor = mix(vColor, aColor * 1.5 + uColor * .3, smoothstep(.65, .83, uProgress)*.5);
        vAlpha = (.3 + aSeed * .6) * (1. - smoothstep(.81, 1., uProgress));
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - .5) * 2.;
        if (r > 1.) discard;
        gl_FragColor = vec4(vColor, (exp(-r*r*4.) + .18*(1.-r)) * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = `${id}_nebula`;
  if (actor) { points.position.copy(actor.position); points.quaternion.copy(actor.quaternion); points.scale.copy(actor.scale); }
  return { points, update(time: number, progress: number, height: number, motion = true) { uniforms.uMotion.value = motion ? 1 : 0; uniforms.uTime.value = time; uniforms.uProgress.value = progress; uniforms.uResolution.value = height; points.visible = progress < 1; }, dispose() { geometry.dispose(); material.dispose(); points.removeFromParent(); } };
}
export type Nebula = ReturnType<typeof createNebula>;

/** Dither the original materials into view from feet to crown, retaining their PBR shading. */
export function prepareMaterialization(actor: THREE.Group) {
  const reveal = { value: 0 };
  const materials = new Set<THREE.Material>();
  actor.traverse(object => { if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
  for (const material of materials) {
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.uArrival = reveal;
      shader.vertexShader = "varying float vArrivalHeight;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvArrivalHeight = (modelMatrix * vec4(transformed, 1.0)).y;");
      shader.fragmentShader = "uniform float uArrival; varying float vArrivalHeight;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        if (uArrival < .999) {
          float coverage = clamp(uArrival * 7.0 - vArrivalHeight, 0.0, 1.0);
          float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (grain > coverage) discard;
        }`);
    };
    material.customProgramCacheKey = () => "nebula-materialization-v1";
    material.needsUpdate = true;
  }
  return reveal;
}
