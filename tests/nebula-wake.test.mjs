import test from 'node:test';
import assert from 'node:assert/strict';
import { createNebulaWake, WAKE_LIFETIME, WAKE_SEGMENTS } from '../app/experience/three/nebula-wake.ts';
import { createCelestialSystem } from '../app/experience/three/celestial.ts';
import { disposeObject } from '../app/experience/three/character-assets.ts';

test('fast passes leave fixed real-path segments that expire instead of chasing the cursor', () => {
  const wake = createNebulaWake();
  wake.sample(-4, 2, 1);
  wake.sample(4, 2, 1.016);
  assert.deepEqual(wake.segments[0].toArray(), [-4, 2, 4, 2]);
  assert.deepEqual(wake.pointer.toArray(), [4, 2, 1]);
  const stamp = wake.metadata[0].x;
  const position = wake.segments[0].toArray();
  for (let t = 1.03; t < 1.5; t += .016) wake.update(t);
  assert.deepEqual(wake.segments[0].toArray(), position);
  assert.equal(wake.metadata[0].x, stamp, 'render frames cannot rejuvenate the trail');
  assert.ok(wake.metadata.every(item => item.y === 0));
  assert.equal(wake.pointer.z, 0);
});

test('slow and high-frequency paths stay bounded; leave and resume never create phantom strokes', () => {
  const wake = createNebulaWake();
  for (let i = 0; i < 240; i++) wake.sample(i * .01, 2, i / 240);
  assert.equal(wake.segments.length, WAKE_SEGMENTS);
  assert.ok(wake.metadata.every(item => item.y >= 0 && item.y <= .68));
  wake.leave();
  const segments = wake.segments.map(item => item.toArray());
  wake.sample(-8, -2, 1.01);
  assert.deepEqual(wake.segments.map(item => item.toArray()), segments);
  wake.sample(8, 2, 2);
  assert.deepEqual(wake.segments.map(item => item.toArray()), segments);
  wake.update(2 + WAKE_LIFETIME + .01);
  assert.ok(wake.metadata.every(item => item.y === 0));
  wake.clear();
  assert.deepEqual(wake.pointer.toArray(), [0, 0, 0]);
});

test('long-hold progress moves rigid celestial bodies and early release restores their base poses', () => {
  const c = createCelestialSystem();
  const bodies = ['恒星', '环状行星', '蓝色行星', '量子通信卫星'].map(name => c.group.getObjectByName(name));
  c.update(2, 0);
  const base = bodies.map(body => body.position.clone());
  c.update(2, .3);
  bodies.forEach((body, i) => {
    assert.ok(body.position.distanceTo(base[i]) > .05, body.name);
    assert.ok(body.position.distanceTo(base[i]) < .5, 'small coordinated motion');
    assert.deepEqual(body.scale.toArray(), [1, 1, 1], 'no jelly-like squash');
  });
  c.update(2, 0);
  bodies.forEach((body, i) => assert.ok(body.position.distanceTo(base[i]) < 1e-12));
  c.update(2, .3, false);
  bodies.forEach((body, i) => assert.ok(body.position.distanceTo(base[i]) < 1e-12));
  c.update(2, 1);
  assert.equal(c.group.visible, false);
  disposeObject(c.group);
});
