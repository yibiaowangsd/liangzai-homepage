/** Fixed shape coordinates and mutable projection/physics storage, allocated once. */
export function createSculptureParticles(count = 780) {
  return Array.from({ length: count }, (_, index) => {
    const t = index / count;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    const a = t * Math.PI * 14;
    const b = t * Math.PI * 68;
    return {
      index,
      sphere: [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ],
      ring: [
        (0.74 + 0.25 * Math.cos(b)) * Math.cos(a),
        0.25 * Math.sin(b),
        (0.74 + 0.25 * Math.cos(b)) * Math.sin(a),
      ],
      wave: [
        Math.cos(a) * 0.8,
        Math.sin(a * 1.4) * 0.28,
        (a / (Math.PI * 14) - 0.5) * 2,
      ],
      x: 0,
      y: 0,
      z: 0,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
    };
  });
}

type Particle = ReturnType<typeof createSculptureParticles>[number];
const depthOrder = (a: Particle, b: Particle) => a.z - b.z || a.index - b.index;

/** Reuse the same points and depth-order array; only four trig calls per frame. */
export function projectSculptureParticles(
  points: Particle[],
  mix: number,
  yaw: number,
  pitch: number,
) {
  const blend = mix <= 1 ? mix : mix - 1;
  const cosYaw = Math.cos(yaw),
    sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch),
    sinPitch = Math.sin(pitch);
  for (const point of points) {
    const from = mix <= 1 ? point.sphere : point.ring;
    const to = mix <= 1 ? point.ring : point.wave;
    const x = from[0] * (1 - blend) + to[0] * blend;
    const y = from[1] * (1 - blend) + to[1] * blend;
    const z = from[2] * (1 - blend) + to[2] * blend;
    const depth = x * sinYaw + z * cosYaw;
    point.x = x * cosYaw - z * sinYaw;
    point.y = y * cosPitch - depth * sinPitch;
    point.z = y * sinPitch + depth * cosPitch;
  }
  return points.sort(depthOrder);
}
