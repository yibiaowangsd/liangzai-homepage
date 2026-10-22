import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({ entryPoints: ['app/about/metal-card-session.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { createMetalSession } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const rendererModule = await build({ entryPoints: ['app/about/metal-card-renderer.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { getDrawingBufferSize } = await import('data:text/javascript;base64,' + Buffer.from(rendererModule.outputFiles[0].text).toString('base64'));

function fixture() {
  const canvas = new EventTarget();
  const backends = [];
  const states = [];
  const create = received => {
    assert.equal(received, canvas, 'recovery must keep the original canvas');
    const backend = { draws: 0, releases: 0, render() { this.draws++; return true; }, dispose() { this.releases++; } };
    backends.push(backend);
    return backend;
  };
  return { canvas, backends, states, create, notify: (state, error) => states.push({ state, error }) };
}

test('context loss stops drawing and restores resources only on the browser restore event', () => {
  const f = fixture();
  const session = createMetalSession(f.canvas, f.notify, f.create);
  assert.equal(session.draw(0, 0, 0, 0), true);
  const loss = new Event('webglcontextlost', { cancelable: true });
  f.canvas.dispatchEvent(loss);
  assert.equal(loss.defaultPrevented, true);
  assert.equal(session.state, 'restoring');
  assert.equal(f.backends[0].releases, 1);
  assert.equal(session.draw(1, 0, 0, 0), false);
  assert.equal(session.retry(), false);
  assert.equal(f.backends.length, 1);
  f.canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(session.state, 'ready');
  assert.equal(f.backends.length, 2);
  assert.equal(session.draw(2, 0, 0, 0), true);
  assert.equal(f.backends[0].draws, 1);
  assert.equal(f.backends[1].draws, 1);
  session.dispose();
  session.dispose();
  assert.deepEqual(f.backends.map(value => value.releases), [1, 1]);
});

test('Chromium domain block suppresses repeated context creation and preserves the original error', () => {
  const canvas = new EventTarget();
  const error = new Error('Web page caused context loss and was blocked');
  let attempts = 0;
  let diagnostic;
  const session = createMetalSession(canvas, (state, reason) => { if (state === 'blocked') diagnostic = reason; }, () => { attempts++; throw error; });
  assert.equal(session.state, 'blocked');
  assert.equal(diagnostic, error);
  for (let i = 0; i < 10; i++) assert.equal(session.retry(), false);
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(attempts, 1);
  assert.equal(session.state, 'blocked');
  session.dispose();
});

test('a lost drawing buffer stops before the queued loss event without duplicating disposal', () => {
  const f = fixture();
  const session = createMetalSession(f.canvas, f.notify, f.create);
  f.backends[0].render = () => false;
  assert.equal(session.draw(0, 0, 0, 0), false);
  assert.equal(session.state, 'restoring');
  const loss = new Event('webglcontextlost', { cancelable: true });
  f.canvas.dispatchEvent(loss);
  assert.equal(loss.defaultPrevented, true);
  assert.equal(f.backends[0].releases, 1);
  assert.equal(f.states.filter(value => value.state === 'restoring').length, 1);
  f.canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(f.backends.length, 2);
  session.dispose();
});

test('a recoverable initialization error retries on the same canvas without replacing a live backend', () => {
  const f = fixture();
  let attempts = 0;
  const session = createMetalSession(f.canvas, f.notify, canvas => {
    if (++attempts === 1) throw new Error('Shader compilation failed');
    return f.create(canvas);
  });
  assert.equal(session.state, 'failed');
  assert.equal(session.retry(), true);
  assert.equal(session.retry(), true);
  assert.equal(attempts, 2);
  assert.equal(f.backends.length, 1);
  session.dispose();
});

test('unmount cancels restoration and removes context event handlers', () => {
  const f = fixture();
  const session = createMetalSession(f.canvas, f.notify, f.create);
  f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  session.dispose();
  const count = f.states.length;
  const loss = new Event('webglcontextlost', { cancelable: true });
  f.canvas.dispatchEvent(loss);
  f.canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(loss.defaultPrevented, false);
  assert.equal(f.states.length, count);
  assert.equal(f.backends.length, 1);
  assert.equal(session.retry(), false);
});

test('a render exception releases resources once and needs an explicit retry', () => {
  const f = fixture();
  const session = createMetalSession(f.canvas, f.notify, f.create);
  f.backends[0].render = () => { throw new Error('Rendering interrupted'); };
  assert.equal(session.draw(0, 0, 0, 0), false);
  assert.equal(session.state, 'failed');
  assert.equal(f.backends[0].releases, 1);
  assert.equal(session.draw(1, 0, 0, 0), false);
  assert.equal(f.backends.length, 1);
  assert.equal(session.retry(), true);
  session.dispose();
  assert.deepEqual(f.backends.map(value => value.releases), [1, 1]);
});

test('drawing buffer preserves ordinary DPR and bounds high-density GPU allocations', () => {
  assert.deepEqual(getDrawingBufferSize(460, 292, 1, 4096), [460, 292]);
  assert.deepEqual(getDrawingBufferSize(460, 292, 2, 4096), [920, 584]);
  for (const width of [1, 292, 460, 1280, 4096]) for (const height of [1, 292, 460, 2160]) {
    for (const dpr of [1, 1.25, 2, 3, 4, 8]) for (const limit of [512, 2048, 4096]) {
      const [w, h] = getDrawingBufferSize(width, height, dpr, limit);
      assert.ok(w >= 1 && h >= 1);
      assert.ok(w <= limit && h <= limit);
      assert.ok(w * h <= 1024 * 1024);
    }
  }
});
