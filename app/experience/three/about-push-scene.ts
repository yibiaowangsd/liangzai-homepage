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
    // World y=0 is the bottom of the viewport, not a floating pedestal.
    camera.position.set(0, 3.3, 12);
    camera.lookAt(0, 3.3, 0);
    scene.add(new THREE.HemisphereLight(0xe9f3ff, 0x59677b, 2.4));
    const key = new THREE.DirectionalLight(0xfff6eb, 3.8);
    key.position.set(-3, 6, 7);
    const rim = new THREE.DirectionalLight(0x9ecfff, 2.5);
    rim.position.set(4, 5, -3);
    scene.add(key, rim, actor);
    // Face the page's left edge: forward in model space becomes screen-right.
    actor.rotation.y = Math.PI * .37;
    const pose = { effort: 0, stride: 0, lean: 0, compression: 0, leftReach: 0, rightReach: 0, walking: 0 };
    const leftHip = rig.joints.leftLeg.position.clone();
    const rightHip = rig.joints.rightLeg.position.clone();
    // Cache tiny bounding-box corner sets, not a full geometry traversal per frame.
    function surface(pattern: RegExp) {
      const samples: { mesh: THREE.Mesh; corners: THREE.Vector3[] }[] = [];
      actor.traverse(object => {
        if (!(object instanceof THREE.Mesh) || !pattern.test(object.name)) return;
        object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox!;
        const corners: THREE.Vector3[] = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
        samples.push({ mesh: object, corners });
      });
      return samples;
    }
    const soles = surface(/^[LR]_shoe_/);
    const palms = surface(/^[LR]_glove_/);
    const point = new THREE.Vector3();
    let contactX = .76;
    function render(time: number) {
      const gait = Math.sin(pose.stride);
      const liftLeft = Math.pow(Math.max(0, Math.cos(pose.stride)), 2) * pose.walking;
      const liftRight = Math.pow(Math.max(0, -Math.cos(pose.stride)), 2) * pose.walking;
      // The planted foot carries the load while the other recovers. Stops do not march.
      rig.pose.leftLeg = gait * .34 * pose.walking - .06 * pose.effort;
      rig.pose.rightLeg = -gait * .34 * pose.walking + .09 * pose.effort;
      rig.pose.leftFoot = -rig.pose.leftLeg * .7 - liftLeft * .12;
      rig.pose.rightFoot = -rig.pose.rightLeg * .7 - liftRight * .12;
      const shoulder = Math.sin(pose.stride - .45) * .045 * pose.walking;
      rig.pose.leftArmX = (-1.36 + shoulder + pose.compression * .1) * pose.leftReach;
      rig.pose.rightArmX = (-1.46 - shoulder + pose.compression * .09) * pose.rightReach;
      rig.pose.leftArm = -.10 * pose.leftReach;
      rig.pose.rightArm = .14 * pose.rightReach;
      rig.pose.leftWrist = (-.24 - shoulder) * pose.leftReach;
      rig.pose.rightWrist = (-.24 + shoulder) * pose.rightReach;
      // Small follow-throughs keep the head and antenna from being welded to the torso.
      rig.pose.headPitch = .08 * pose.effort + Math.sin(pose.stride - .7) * .035 * pose.walking;
      rig.pose.headRoll = pose.lean * .18;
      rig.pose.antenna = -.13 * pose.effort + Math.sin(pose.stride - 1) * .09 * pose.walking;
      rig.apply(time, true);
      rig.joints.leftLeg.position.copy(leftHip).y += liftLeft * .16;
      rig.joints.rightLeg.position.copy(rightHip).y += liftRight * .16;
      actor.rotation.z = -pose.lean - Math.sin(pose.stride * 2) * .012 * pose.walking;
      actor.scale.set(1 + pose.compression * .012, 1 - pose.compression * .025, 1);
      actor.position.y = 0;
      actor.updateMatrixWorld(true);
      let floor = Infinity;
      for (const { mesh, corners } of soles) for (const corner of corners) {
        floor = Math.min(floor, point.copy(corner).applyMatrix4(mesh.matrixWorld).y);
      }
      // At least one sole touches the same floor through lean, recoil and every stride.
      if (Number.isFinite(floor)) actor.position.y = .016 - floor;
      actor.updateMatrixWorld(true);
      let palmX = -Infinity;
      for (const { mesh, corners } of palms) for (const corner of corners) {
        palmX = Math.max(palmX, point.copy(corner).applyMatrix4(mesh.matrixWorld).x);
      }
      if (Number.isFinite(palmX)) contactX = (palmX + 2.8) / 5.6;
      renderer!.render(scene, camera);
    }
    render(0);
    let disposed = false;
    return { pose, render, get contactX() { return contactX; }, dispose() {
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
