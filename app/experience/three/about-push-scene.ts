import * as THREE from "three";
import { loadCharacter, disposeObject } from "./character-assets";
import { createLiangzaiRig } from "./liangzai-rig";

/** A short-lived, transparent studio. No bloom, shadows, or permanent frame loop. */
export async function createAboutPushScene(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const actor = await loadCharacter("liangzai", signal);
  let renderer: THREE.WebGLRenderer | undefined;
  try {
    signal.throwIfAborted();
    const rig = createLiangzaiRig(actor);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(340, 400, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2.8, 2.8, 3.3, -3.3, .1, 30);
    camera.position.set(0, 2.7, 12);
    camera.lookAt(0, 2.7, 0);
    scene.add(new THREE.HemisphereLight(0xe9f3ff, 0x59677b, 2.4));
    const key = new THREE.DirectionalLight(0xfff6eb, 3.8);
    key.position.set(-3, 6, 7);
    const rim = new THREE.DirectionalLight(0x9ecfff, 2.5);
    rim.position.set(4, 5, -3);
    scene.add(key, rim, actor);
    // Face the page's left edge: forward in model space becomes screen-right.
    actor.rotation.y = Math.PI * .37;
    const pose = { effort: 0, stride: 0, lean: 0 };
    function render(time: number) {
      const gait = Math.sin(pose.stride);
      rig.pose.leftArmX = -1.35 * pose.effort;
      rig.pose.rightArmX = -1.48 * pose.effort;
      rig.pose.leftArm = -.10 * pose.effort;
      rig.pose.rightArm = .14 * pose.effort;
      rig.pose.leftWrist = rig.pose.rightWrist = -.25 * pose.effort;
      rig.pose.leftLeg = gait * .27;
      rig.pose.rightLeg = -gait * .27;
      rig.pose.leftFoot = -gait * .12;
      rig.pose.rightFoot = gait * .12;
      rig.pose.headPitch = .12 * pose.effort;
      rig.pose.antenna = -.12 * pose.effort;
      rig.apply(time, true);
      actor.rotation.z = -pose.lean;
      actor.position.y = -.12 * pose.effort + Math.abs(gait) * .035;
      renderer!.render(scene, camera);
    }
    render(0);
    let disposed = false;
    return { pose, render, dispose() {
      if (disposed) return;
      disposed = true;
      disposeObject(actor);
      renderer!.dispose();
      renderer!.forceContextLoss();
    } };
  } catch (error) {
    disposeObject(actor);
    renderer?.dispose();
    renderer?.forceContextLoss();
    throw error;
  }
}
