import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadCharacter, disposeObject, type ModelMode, type ModelView } from "../experience/three/character-assets";
import { createStudioEnvironment } from "../experience/three/observatory";
export type GalleryScene = ReturnType<typeof createGalleryScene>;
export function createGalleryScene(canvas: HTMLCanvasElement, onFailure: () => void) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xe6e7e1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 2.3, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * .85;
    controls.autoRotateSpeed = .8;
    const pmrem = new THREE.PMREMGenerator(renderer), studio = createStudioEnvironment(), environment = pmrem.fromScene(studio, .06);
    scene.environment = environment.texture;
    scene.environmentIntensity = 1;
    disposeObject(studio);
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7e8492, 2.2));
    const key = new THREE.DirectionalLight(0xfff7eb, 4);
    key.position.set(5, 8, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9eb7ff, 2);
    rim.position.set(-5, 5, -3);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, .16, 96), new THREE.MeshStandardMaterial({ color: 0xd4d7ce, roughness: .8 }));
    floor.position.y = -.1;
    scene.add(floor);
    const actors = new THREE.Group();
    scene.add(actors);
    let disposed = false, frame = 0, distance = 14;
    function setView(view: ModelView) {
        const angle = view === "side" ? Math.PI / 2 : view === "back" ? Math.PI : 0;
        controls.target.set(0, 2.3, 0);
        camera.position.set(Math.sin(angle) * distance, 4.7, Math.cos(angle) * distance);
        controls.update();
    }
    function resize() { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height)
        return; renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    setView("front");
    resize();
    function render() { if (disposed)
        return; controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); }
    render();
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return {
        async load(mode: ModelMode, signal: AbortSignal) {
            const ids = mode === "duo" ? ["liangzai", "nailong"] as const : [mode] as const;
            const settled = await Promise.allSettled(ids.map(id => loadCharacter(id, signal)));
            const models = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
            if (signal.aborted || disposed || models.length !== ids.length) {
                models.forEach(disposeObject);
                if (!signal.aborted)
                    throw new Error("Model load incomplete");
                return;
            }
            models.forEach((model, index) => { model.position.x = mode === "duo" ? (index === 0 ? -1.7 : 1.7) : 0; actors.add(model); });
            distance = mode === "duo" ? 16 : 12;
            setView("front");
        },
        setView,
        zoom(factor: number) {
            const offset = camera.position.clone().sub(controls.target);
            const nextDistance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
            camera.position.copy(controls.target).add(offset.setLength(nextDistance));
            controls.update();
        },
        setRotate(value: boolean) { controls.autoRotate = value; },
        dispose() { if (disposed)
            return; disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener("webglcontextlost", lost); controls.dispose(); disposeObject(scene); environment.dispose(); renderer.dispose(); },
    };
}
