import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { gsap } from "gsap";
import { createLiangzai } from "./liangzai-model";

export type HeroScene = {
  setMotion(enabled: boolean): void;
  setView(view: "front" | "side" | "back" | "reset"): void;
  greet(): void;
  dispose(): void;
};

/** Browser-only runtime; imported from a React effect, never by Cloudflare SSR. */
export async function createHeroScene(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  onFallback: () => void,
): Promise<HeroScene> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x060a10, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070c14, 0.048);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 70);
  camera.position.set(0, 2.9, 10.9);
  camera.lookAt(0, 2.75, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.045);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  room.dispose();
  pmrem.dispose();
  const robot = createLiangzai();
  const turntable = new THREE.Group();
  turntable.name = "Character_turntable";
  scene.add(turntable);
  turntable.add(robot.root);
  turntable.rotation.y = -0.24;
  robot.root.position.y = 0.16;
  const key = new THREE.DirectionalLight(0xf1f6ff, 4);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 3;
  key.target.position.set(0, 2, 0);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x4f89ff, 1.35);
  fill.position.set(5, 3, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x5edcff, 3.2);
  rim.position.set(-1, 4, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xb4d7ff, 0x102034, 0.8));
  const heartLight = new THREE.PointLight(0x33bfff, 0.8, 4);
  heartLight.position.set(0, 2.9, 1.5);
  scene.add(heartLight);

  const objects: THREE.Object3D[] = [];
  const metal = new THREE.MeshStandardMaterial({
    color: 0x45576b,
    metalness: 0.92,
    roughness: 0.29,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x172535,
    metalness: 0.85,
    roughness: 0.43,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: 0xa7b8c8,
    metalness: 0.96,
    roughness: 0.2,
  });
  const light = new THREE.MeshStandardMaterial({
    color: 0x6ee3ff,
    emissive: 0x48beff,
    emissiveIntensity: 2.7,
    roughness: 0.3,
  });
  const portal = new THREE.Group();
  portal.position.set(0.1, 2.8, -1.16);
  portal.rotation.set(0.04, -0.2, -0.09);
  scene.add(portal);
  objects.push(portal);
  const addRing = (
    radius: number,
    tube: number,
    z: number,
    material: THREE.Material,
  ) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 112),
      material,
    );
    m.position.z = z;
    m.castShadow = true;
    m.receiveShadow = true;
    portal.add(m);
    return m;
  };
  addRing(2.7, 0.23, 0, metal);
  addRing(2.7, 0.045, 0.235, edge);
  addRing(2.94, 0.025, 0, edge);
  addRing(2.46, 0.075, 0.02, darkMetal);
  addRing(2.455, 0.018, 0.095, light);
  addRing(2.49, 0.008, 0.18, light);
  addRing(2.67, 0.08, -0.26, darkMetal);
  const panelGeo = new THREE.BoxGeometry(0.014, 0.41, 0.35);
  const panels = new THREE.InstancedMesh(panelGeo, darkMetal, 40);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.025);
    dummy.rotation.z = a - Math.PI / 2;
    dummy.updateMatrix();
    panels.setMatrixAt(i, dummy.matrix);
  }
  portal.add(panels);
  const signalGeo = new THREE.BoxGeometry(0.08, 0.045, 0.023);
  const signals = new THREE.InstancedMesh(signalGeo, light, 16);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.248);
    dummy.rotation.z = a;
    dummy.updateMatrix();
    signals.setMatrixAt(i, dummy.matrix);
  }
  portal.add(signals);
  const outerOrbit = addRing(3.12, 0.008, 0.05, edge);
  outerOrbit.rotation.x = 0.32;
  outerOrbit.rotation.y = -0.2;
  const orbitLight = new THREE.PointLight(0x59ceff, 6, 8, 2);
  orbitLight.position.set(0, 2.8, -0.55);
  scene.add(orbitLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x080e17,
      metalness: 0.68,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const fadeCanvas = document.createElement("canvas");
  fadeCanvas.width = fadeCanvas.height = 128;
  const fadeContext = fadeCanvas.getContext("2d")!;
  const groundFade = fadeContext.createRadialGradient(64, 64, 21, 64, 64, 54);
  groundFade.addColorStop(0, "white");
  groundFade.addColorStop(1, "black");
  fadeContext.fillStyle = groundFade;
  fadeContext.fillRect(0, 0, 128, 128);
  const floorFadeTexture = new THREE.CanvasTexture(fadeCanvas);
  floor.material.alphaMap = floorFadeTexture;
  floor.material.depthWrite = false;
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.018;
  floor.receiveShadow = true;
  scene.add(floor);
  objects.push(floor);
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.04, 1.09, 0.12, 80),
    darkMetal,
  );
  platform.position.y = -0.065;
  platform.receiveShadow = true;
  scene.add(platform);
  objects.push(platform);
  const platformEdge = new THREE.Mesh(
    new THREE.TorusGeometry(1.065, 0.009, 8, 80),
    light,
  );
  platformEdge.rotation.x = Math.PI / 2;
  platformEdge.position.y = -0.011;
  scene.add(platformEdge);
  objects.push(platformEdge);
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(16,134,216,.26)");
  gradient.addColorStop(0.35, "rgba(16,94,160,.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const floorGlowTexture = new THREE.CanvasTexture(glowCanvas);
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({
      map: floorGlowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.001;
  scene.add(floorGlow);
  objects.push(floorGlow);
  const stars = new Float32Array(110 * 3);
  for (let i = 0; i < 110; i++) {
    const r = ((i * 16807) % 127) / 127;
    stars[i * 3] = Math.sin(i * 12.9898) * 7;
    stars[i * 3 + 1] = r * 8 - 0.5;
    stars[i * 3 + 2] = -3 - ((i * 13) % 17) * 0.35;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  const dust = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xa8d4ff,
      size: 0.015,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  scene.add(dust);
  objects.push(dust);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(512, 512),
    0.22,
    0.35,
    1.55,
  );
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(outputPass);
  let enabled = false,
    visible = true,
    disposed = false,
    attached = false,
    lastFrame = 0,
    time = 0,
    isDragging = false,
    dragDistance = 0,
    lastX = 0,
    lastY = 0,
    width = 1,
    height = 1;
  let resizeFrame = 0;
  let greeting = false;
  let contextLost = false;
  let targetYaw = -0.24, targetPitch = 0;
  const pose = { yaw: -0.24, pitch: 0, gazeX: 0, gazeY: 0, energy: 1 };
  const ctx = gsap.context(() => {});
  const render = () => {
    if (!disposed && !contextLost) composer.render();
  };
  const yawTo = gsap.quickTo(pose, "yaw", {
    duration: 0.65,
    ease: "power3.out",
    onUpdate: applyPose,
  });
  const pitchTo = gsap.quickTo(pose, "pitch", {
    duration: 0.65,
    ease: "power3.out",
    onUpdate: applyPose,
  });
  const gazeX = gsap.quickTo(pose, "gazeX", {
    duration: 0.7,
    ease: "power3.out",
  });
  const gazeY = gsap.quickTo(pose, "gazeY", {
    duration: 0.7,
    ease: "power3.out",
  });
  function applyPose() {
    turntable.rotation.y = pose.yaw;
    turntable.rotation.x = pose.pitch;
    if (!attached) render();
  }
  function tick(now: number, delta: number) {
    if (now - lastFrame < 1 / (width < 600 ? 30 : 45)) return;
    lastFrame = now;
    time += Math.min(delta, 48) / 1000;
    robot.root.position.y = 0.16 + Math.sin(time * 1.2) * 0.027;
    robot.head.rotation.y = pose.gazeX;
    robot.head.rotation.x = pose.gazeY;
    robot.antenna.rotation.z = Math.sin(time * 1.9) * 0.035;
    const blink = Math.sin(time * 0.67);
    robot.eyes.scale.y = blink > 0.997 ? 0.13 : 1;
    portal.rotation.z = -0.09 + Math.sin(time * 0.18) * 0.018;
    light.emissiveIntensity =
      2.1 + Math.sin(time * 0.8) * 0.25 + pose.energy * 0.3;
    robot.materials.cyan.emissiveIntensity = 1.3 + pose.energy * 0.15;
    render();
  }
  const sync = () => {
    const active = enabled && visible && !document.hidden && !disposed && !contextLost;
    if (active && !attached) {
      gsap.ticker.add(tick);
      attached = true;
    } else if (!active && attached) {
      gsap.ticker.remove(tick);
      attached = false;
    }
    if (!active) render();
  };
  const resize = () => {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    if (
      Math.abs(rect.width - width) < 0.5 &&
      Math.abs(rect.height - height) < 0.5
    )
      return;
    width = rect.width;
    height = rect.height;
    if (width < 1 || height < 1) return;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, width < 600 ? 1.25 : 1.6),
    );
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 500 ? 40 : 36;
    camera.updateProjectionMatrix();
    bloom.enabled = width >= 550;
    render();
  };
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(canvas);
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.03 },
  );
  visibility.observe(canvas);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function greet() {
    if (greeting) return;
    greeting = true;
    ctx.add(() => {
      const timeline = gsap.timeline({
        onComplete: () => {
          greeting = false;
          render();
        },
        onUpdate: () => {
          if (!attached) render();
        },
      });
      timeline
        .to(
          robot.arms[0].rotation,
          {
            z: -2.3,
            x: -0.1,
            duration: enabled ? 0.55 : 0,
            ease: "power3.inOut",
          },
          0,
        )
        .to(robot.arms[0].rotation, {
          z: -1.92,
          duration: enabled ? 0.21 : 0,
          repeat: 3,
          yoyo: true,
          ease: "sine.inOut",
        })
        .to(robot.arms[0].rotation, {
          z: -0.13,
          x: 0,
          duration: enabled ? 0.6 : 0,
          ease: "power2.inOut",
        })
        .to(pose, { energy: 3, duration: enabled ? 0.25 : 0 }, 0)
        .to(pose, { energy: 1, duration: enabled ? 1.5 : 0 }, 0.6);
    });
  }
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragDistance = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    targetYaw = pose.yaw;
    targetPitch = pose.pitch;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-dragging");
  };
  const move = (e: PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      if (enabled) {
        targetYaw += dx * 0.008;
        targetPitch = THREE.MathUtils.clamp(targetPitch + dy * 0.003, -0.2, 0.22);
        yawTo(targetYaw);
        pitchTo(targetPitch);
      } else {
        pose.yaw += dx * 0.008;
        pose.pitch = THREE.MathUtils.clamp(pose.pitch + dy * 0.003, -0.2, 0.22);
        applyPose();
      }
    } else if (enabled && e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      gazeX(((e.clientX - r.left) / r.width - 0.5) * 0.34);
      gazeY(((e.clientY - r.top) / r.height - 0.5) * 0.18);
    }
  };
  const up = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (dragDistance < 8) {
      const r = canvas.getBoundingClientRect();
      mouse.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.intersectObject(robot.root, true).length) greet();
    }
  };
  const cancel = () => {
    isDragging = false;
    canvas.classList.remove("is-dragging");
  };
  const leave = () => {
    if (enabled) { gazeX(0); gazeY(0); }
  };
  const keyboard = (e: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "Home", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (e.key === "Enter" || e.key === " ") greet();
      else {
        const yaw =
          e.key === "Home"
            ? -0.24
            : pose.yaw + (e.key === "ArrowLeft" ? -0.3 : 0.3);
        if (enabled) yawTo(yaw);
        else {
          pose.yaw = yaw;
          applyPose();
        }
      }
    }
  };
  const lost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    sync();
    onFallback();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", keyboard);
  canvas.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", sync);
  const api: HeroScene = {
    setMotion(value) {
      enabled = value;
      if (!value) {
        [yawTo, pitchTo, gazeX, gazeY].forEach(t => t.tween.pause());
        pose.gazeX = pose.gazeY = 0;
        robot.head.rotation.set(0, 0, 0);
        robot.eyes.scale.y = 1;
      }
      sync();
    },
    setView(view) {
      const target =
        view === "front"
          ? 0
          : view === "side"
            ? Math.PI / 2
            : view === "back"
              ? Math.PI
              : -0.24;
      if (enabled) {
        yawTo(target);
        pitchTo(0);
      } else {
        pose.yaw = target;
        pose.pitch = 0;
        applyPose();
      }
    },
    greet,
    dispose() {
      disposed = true;
      ctx.revert();
      [yawTo, pitchTo, gazeX, gazeY].forEach((t) => t.tween.kill());
      gsap.ticker.remove(tick);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("keydown", keyboard);
      canvas.removeEventListener("webglcontextlost", lost);
      const geos = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      objects.forEach((o) =>
        o.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
            geos.add(child.geometry);
            (Array.isArray(child.material)
              ? child.material
              : [child.material]
            ).forEach((m) => mats.add(m));
          }
        }),
      );
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      robot.dispose();
      floorGlowTexture.dispose();
      floorFadeTexture.dispose();
      environment.dispose();
      bloom.dispose();
      outputPass.dispose();
      renderPass.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  let compileTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    resize();
    await Promise.race([
      renderer.compileAsync(scene, camera),
      new Promise<never>((_, reject) => {
        compileTimeout = setTimeout(() => reject(new Error("3D initialization timed out")), 12000);
      }),
    ]);
    render();
    if (!contextLost) onReady();
    return api;
  } catch (error) {
    api.dispose();
    onFallback();
    throw error;
  } finally {
    clearTimeout(compileTimeout);
  }
}
