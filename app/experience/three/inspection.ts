import { Euler, Quaternion, Vector3, type Group } from "three";

/** Screen-space trackball: both axes are unbounded, with no polar singularity. */
export function rotateInspection(orientation: Quaternion, dx: number, dy: number, width: number, height: number, camera: Quaternion) {
  const x = dy / Math.max(320, height), y = dx / Math.max(320, width);
  const distance = Math.hypot(x, y);
  if (!distance) return;
  const axis = new Vector3(x, y, 0).normalize().applyQuaternion(camera);
  orientation.premultiply(new Quaternion().setFromAxisAngle(axis, distance * Math.PI * 2)).normalize();
}

const localRotation = new Quaternion();
const localEuler = new Euler();
export function applyInspection(actor: Group, orientation: Quaternion, pitch = 0, yaw = 0, roll = 0) {
  const pivot = actor.children[0];
  localRotation.setFromEuler(localEuler.set(pitch, yaw, roll, "XYZ"));
  pivot.quaternion.copy(orientation).multiply(localRotation);
}
