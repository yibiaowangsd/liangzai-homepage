import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameScheduler, createShadowBudget } from '../app/experience/three/render-scheduler.ts';

function harness() {
  const queued = new Map(), draws = [];
  let next = 1;
  const state = { visible: true, prepared: false, motion: false };
  const scheduler = createFrameScheduler({
    requestFrame: callback => { const id = next++; queued.set(id, callback); return id; },
    cancelFrame: id => queued.delete(id),
    canRender: () => state.visible && state.prepared,
    continuous: () => state.motion,
    fps: () => 30,
    render: (now, delta) => draws.push({ now, delta }),
  });
  const frame = now => {
    const callbacks = [...queued.values()]; queued.clear();
    callbacks.forEach(callback => callback(now));
  };
  return { state, scheduler, queued, draws, frame };
}

test('no model frame before compilation; loading/view/resize updates coalesce', () => {
  const h = harness();
  for (let i = 0; i < 8; i++) h.scheduler.invalidate();
  assert.equal(h.queued.size, 0);
  h.frame(0); assert.equal(h.draws.length, 0);
  h.state.prepared = true; h.scheduler.sync();
  for (let i = 0; i < 8; i++) h.scheduler.invalidate();
  assert.equal(h.queued.size, 1);
  h.frame(16); assert.equal(h.draws.length, 1); assert.equal(h.queued.size, 0);
});

test('an in-flight model switch cancels drawing until the new selection is prepared', () => {
  const h = harness(); h.state.prepared = true; h.state.motion = true;
  h.scheduler.sync(); h.frame(0);
  h.state.prepared = false; h.scheduler.sync();
  h.scheduler.invalidate(); h.frame(100); h.frame(200);
  assert.equal(h.draws.length, 1); assert.equal(h.queued.size, 0);
  h.state.prepared = true; h.scheduler.sync(); h.frame(300);
  assert.equal(h.draws.length, 2); assert.equal(h.draws[1].delta, 0);
  h.scheduler.dispose();
});

test('offscreen/background changes wait for visibility; paused motion redraws once', () => {
  const h = harness(); h.state.prepared = true; h.state.motion = true;
  h.scheduler.sync(); h.frame(0); h.frame(17); h.frame(34);
  assert.equal(h.draws.length, 2);
  h.state.visible = false; h.scheduler.sync(); h.scheduler.invalidate();
  h.frame(10000); assert.equal(h.draws.length, 2); assert.equal(h.queued.size, 0);
  h.state.visible = true; h.scheduler.sync(); h.frame(20000);
  assert.equal(h.draws.at(-1).delta, 0, 'Resume must not jump the idle animation');
  h.state.motion = false; h.scheduler.invalidate(); h.scheduler.sync(); h.frame(20017);
  assert.equal(h.queued.size, 0);
  h.scheduler.invalidate(); h.scheduler.invalidate(); h.frame(20034);
  assert.equal(h.draws.length, 5); assert.equal(h.queued.size, 0);
});

test('disposed scenes never schedule or submit another frame', () => {
  const h = harness(); h.state.prepared = true; h.state.motion = true;
  h.scheduler.sync(); h.scheduler.dispose(); h.scheduler.invalidate(); h.scheduler.sync(); h.frame(16);
  assert.equal(h.queued.size, 0); assert.equal(h.draws.length, 0);
});

test('idle shadows obey 10 Hz budget while interaction and static changes refresh immediately', () => {
  const shadows = createShadowBudget();
  assert.equal(shadows.shouldUpdate(0, false), true);
  assert.equal(shadows.shouldUpdate(1000, false), false);
  assert.equal(shadows.shouldUpdate(1000, true), true);
  assert.equal(shadows.shouldUpdate(1034, true), false);
  assert.equal(shadows.shouldUpdate(1068, true), false);
  assert.equal(shadows.shouldUpdate(1100, true), true);
  shadows.invalidate(); assert.equal(shadows.shouldUpdate(1116, true), true);
  shadows.invalidate(); assert.equal(shadows.shouldUpdate(1132, false), true);
  assert.equal(shadows.shouldUpdate(2000, false), false);
});
