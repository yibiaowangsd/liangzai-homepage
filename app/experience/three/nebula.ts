import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { CharacterId } from "./character-assets";

/** Uneven spiral filaments embedded in a broad, inclined star field. */
export function createNebulaField(count: number, random = Math.random) {
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const layer = random(), radius = Math.sqrt(random()) * (layer < .2 ? 7.2 : 6.2);
    const filament = layer > .38;
    const angle = filament
      ? (i % 4) * Math.PI / 2 + radius * .88 + (random() - .5) * (.25 + radius * .07)
      : random() * Math.PI * 2;
    const spread = filament ? .25 : 1.2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * .48;
    positions[i * 3] = x + (random() - .5) * spread;
    positions[i * 3 + 1] = 2.6 + y + x * .17 + (random() - .5) * spread;
    positions[i * 3 + 2] = Math.sin(angle) * radius * .27 + (random() - .5) * (filament ? .9 : 3.6);
    seeds[i] = random();
  }
  return { positions, seeds };
}

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
  const { positions: scatter, seeds } = createNebulaField(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(sampled.positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(sampled.colors, 3));
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    uTrail: { value: Array.from({length:6},()=>new THREE.Vector4(0,0,-100,0)) },
    uPointer: { value: new THREE.Vector3() }, uRipple: { value: new THREE.Vector3(0,0,-100) },
    uMotion: { value: 1 }, uTime: { value: 0 }, uProgress: { value: 0 }, uResolution: { value: 700 },
    uColor: { value: new THREE.Color(id === "nailong" ? "#ffca67" : "#65cfff") },
    uAccent: { value: new THREE.Color(id === "nailong" ? "#ff9954" : "#9678ef") },
  };
  // Shared by stars and cloud wisps. All displacement stays on the GPU.
  const fieldShader = `
    uniform float uTime, uProgress, uResolution, uMotion;
    uniform vec4 uTrail[6]; uniform vec3 uPointer, uRipple;
    uniform vec3 uColor, uAccent;
    vec3 nebulaPosition(vec3 start, vec3 target, float seed) {
      float gather = smoothstep(.05,.72,uProgress);
      vec3 cloud = start - vec3(0.,2.6,0.);
      float radius = length(cloud.xy);
      float angle = (uTime * (.025 + .045 / (1. + radius)) + uProgress * 3.5) * uMotion * (1.-gather);
      cloud.xy = mat2(cos(angle),-sin(angle),sin(angle),cos(angle)) * cloud.xy;
      // Slow coherent bends create stream-like filaments instead of a rigid pinwheel.
      cloud.xy += vec2(sin(cloud.y*.85+uTime*.16),cos(cloud.x*.6-uTime*.12)) * .18 * uMotion;
      cloud.z += sin(radius*.9-uTime*.22+seed*6.28) * .26 * uMotion;
      cloud += vec3(0.,2.6,0.);
      vec3 p = mix(cloud,target,gather);
      vec3 world = (modelMatrix*vec4(p,1.)).xyz;
      float free = (1.-gather)*(1.-gather)*uMotion;
      world.xy += uPointer.xy * (.025 + clamp(start.z+3.,0.,6.)*.01) * free;
      float rippleAge = max(0.,uTime-uRipple.z);
      vec2 waveDelta = world.xy-uRipple.xy;
      float waveDistance = length(waveDelta);
      float wave = exp(-pow((waveDistance-rippleAge*4.)*2.3,2.)) * exp(-rippleAge*2.);
      world.xy += waveDelta / max(.2,waveDistance) * wave * .48 * free;
      for(int i=0;i<6;i++) {
        vec2 delta = world.xy-uTrail[i].xy;
        float d = length(delta), age = max(0.,uTime-uTrail[i].z);
        float force = exp(-d*d*.7) * exp(-age*2.8) * uTrail[i].w * free;
        vec2 tangent = vec2(-delta.y,delta.x)/max(.3,d);
        world.xy += (delta/max(.3,d)*.3 + tangent*.45) * force;
        world.z += force*.24;
      }
      return world;
    }
  `;
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: fieldShader + `
      attribute vec3 aScatter; attribute vec3 aColor; attribute float aSeed;
      varying vec3 vColor; varying float vAlpha, vSpark;
      void main() {
        float gather = smoothstep(.05,.72,uProgress);
        vec3 world = nebulaPosition(aScatter,position,aSeed);
        vec4 mv = viewMatrix*vec4(world,1.);
        gl_Position = projectionMatrix*mv;
        vSpark = step(.986,aSeed)*(1.-gather);
        float size = mix(.7 + pow(aSeed,3.)*2.6 + vSpark*3.5,1.35,gather);
        gl_PointSize = clamp(size*uResolution/700.*11./max(1.,-mv.z),.8,8.);
        float depth = smoothstep(-4.,3.,aScatter.z);
        float tint = clamp(.35 + sin(aScatter.x*.6+aScatter.y*.9)*.3,0.,1.);
        vColor = mix(uColor,uAccent,tint*(1.-gather));
        vColor = mix(vColor,vec3(.85,.94,1.),vSpark*.7) * (1.1+gather*.8);
        float nearPointer=exp(-length(world.xy-uPointer.xy)*1.4)*uPointer.z*(1.-gather)*uMotion;
        vColor *= 1.+nearPointer*.5;
        vColor = mix(vColor,aColor*1.5+uColor*.3,smoothstep(.65,.83,uProgress)*.5);
        float shimmer = 1. + sin(uTime*(.6+aSeed)+aSeed*90.)*.18*uMotion;
        vAlpha = mix(.13+depth*.45+pow(aSeed,5.)*.3,.8,gather)*shimmer*(1.-smoothstep(.81,1.,uProgress));
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha, vSpark;
      void main() {
        vec2 uv = gl_PointCoord-.5; float r = length(uv)*2.;
        if(r>1.)discard;
        float core = exp(-r*r*9.);
        float rays = (exp(-abs(uv.x)*65.)+exp(-abs(uv.y)*65.))*pow(1.-r,2.)*vSpark*.35;
        gl_FragColor = vec4(vColor,(core+exp(-r*r*3.)*.16+rays)*vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mistCount = 64, mistPositions = new Float32Array(mistCount*3), mistSeeds = new Float32Array(mistCount);
  for(let i=0;i<mistCount;i++) {
    const source = Math.floor(i*count/mistCount)*3;
    mistPositions.set(scatter.subarray(source,source+3),i*3); mistSeeds[i]=seeds[source/3];
  }
  const mistGeometry = new THREE.BufferGeometry();
  mistGeometry.setAttribute("position",new THREE.BufferAttribute(mistPositions,3));
  mistGeometry.setAttribute("aSeed",new THREE.BufferAttribute(mistSeeds,1));
  const mistMaterial = new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader: fieldShader + `
      attribute float aSeed; varying float vSeed, vOpacity; varying vec3 vColor;
      void main(){
        vSeed=aSeed;
        vec3 world=nebulaPosition(position,vec3(0.,2.6,0.),aSeed);
        vec4 mv=viewMatrix*vec4(world,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((75.+aSeed*100.)*uResolution/700.*10./max(1.,-mv.z),20.,180.);
        vOpacity=(1.-smoothstep(.12,.65,uProgress))*.11;
        vColor=mix(uColor,uAccent,.25+aSeed*.65);
      }`,
    fragmentShader: `
      uniform float uTime,uMotion; varying float vSeed,vOpacity; varying vec3 vColor;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec2 uv=gl_PointCoord-.5;float r=length(uv)*2.;if(r>1.)discard;
        vec2 p=uv*4.+vSeed*30.+vec2(uTime*.035,-uTime*.02)*uMotion;
        float grain=noise(p)*.65+noise(p*2.3)*.35;
        float density=smoothstep(.2,.78,grain)*pow(1.-r*r,2.);
        gl_FragColor=vec4(vColor,density*vOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mist=new THREE.Points(mistGeometry,mistMaterial);mist.frustumCulled=false;mist.renderOrder=-1;
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = `${id}_nebula`;
  // As a child, mist shares the exact actor placement without a second scene owner.
  points.add(mist);
  if (actor) { points.position.copy(actor.position); points.quaternion.copy(actor.quaternion); points.scale.copy(actor.scale); }
  return {
    points,
    interact(trail: readonly THREE.Vector4[], pointer: THREE.Vector3, ripple: THREE.Vector3) {
      trail.forEach((value,i)=>uniforms.uTrail.value[i].copy(value));
      uniforms.uPointer.value.copy(pointer);uniforms.uRipple.value.copy(ripple);
    },
    update(time: number, progress: number, height: number, motion = true) {
      uniforms.uMotion.value=motion?1:0;uniforms.uTime.value=time;uniforms.uProgress.value=progress;uniforms.uResolution.value=height;
      points.visible=progress<1;mist.visible=progress<.65;
    },
    dispose() { geometry.dispose();material.dispose();mistGeometry.dispose();mistMaterial.dispose();points.removeFromParent(); },
  };
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
