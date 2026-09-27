import test from 'node:test';
import assert from 'node:assert/strict';
import { createSculptureParticles, projectSculptureParticles } from '../app/experience/sculpture-particles.ts';

// Original renderer equations: protect shape, interpolation and depth order during optimization.
function original(index, mix, yaw, pitch) {
  const t = index / 780, phi = Math.acos(1 - 2 * t), theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const a = t * Math.PI * 14, b = t * Math.PI * 68;
  const sphere = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
  const ring = [(0.74 + 0.25 * Math.cos(b)) * Math.cos(a), 0.25 * Math.sin(b), (0.74 + 0.25 * Math.cos(b)) * Math.sin(a)];
  const wave = [Math.cos(a) * 0.8, Math.sin(a * 1.4) * 0.28, (a / (Math.PI * 14) - 0.5) * 2];
  const blend = mix <= 1 ? mix : mix - 1, from = mix <= 1 ? sphere : ring, to = mix <= 1 ? ring : wave;
  const [x, y, z] = from.map((value, axis) => value * (1 - blend) + to[axis] * blend);
  const depth = x * Math.sin(yaw) + z * Math.cos(yaw);
  return [x * Math.cos(yaw) - z * Math.sin(yaw), y * Math.cos(pitch) - depth * Math.sin(pitch), y * Math.sin(pitch) + depth * Math.cos(pitch)];
}

test('cached particle projection preserves every original shape and intermediate morph', () => {
  const points = createSculptureParticles();
  const identities = new Map(points.map(point => [point.index, point]));
  points[123].ox = 17;
  points[123].vy = -2;
  for (const mix of [0, 0.25, 0.9, 1, 1.4, 1.95, 2, 0]) {
    for (const [yaw, pitch] of [[0, 0.25], [1.3, -0.4], [-2.2, 0.7]]) {
      assert.equal(projectSculptureParticles(points, mix, yaw, pitch), points);
      for (const [position, point] of points.entries()) {
        assert.equal(point, identities.get(point.index));
        const expected = original(point.index, mix, yaw, pitch);
        for (const [axis, value] of [point.x, point.y, point.z].entries()) {
          assert.ok(Math.abs(value - expected[axis]) < 1e-12);
        }
        if (position > 0) assert.ok(points[position - 1].z <= point.z);
      }
    }
  }
  assert.equal(identities.get(123).ox, 17);
  assert.equal(identities.get(123).vy, -2);
});
