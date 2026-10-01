import test from 'node:test';
import assert from 'node:assert/strict';
import { runPageArrival } from '../app/experience/page-arrival.ts';

function environment(pathname = '/archive') {
  const previous = new Map();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  const reduced = Object.assign(new EventTarget(), { matches: false });
  let paused = false;
  const calls = [];
  document.querySelector = () => ({ animate(frames, options) {
    let resolve;
    const finished = new Promise(r => { resolve = r; });
    const animation = { finished, cancelCount: 0, cancel() { this.cancelCount++; }, resolve };
    calls.push({ frames, options, animation });
    return animation;
  } });
  const globals = { document, window, location: { pathname }, matchMedia: () => reduced,
    localStorage: { getItem: () => paused ? 'paused' : 'active' } };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  return { calls, document, window, reduced, pause() { paused = true; }, restore() {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  } };
}

test('entry keeps painted content visible and completion removes animation state', async () => {
  const env = environment();
  const dispose = runPageArrival();
  try {
    assert.equal(env.calls.length, 1);
    const { frames, animation } = env.calls[0];
    assert.ok(frames.every(frame => frame.opacity >= .8));
    assert.equal(animation.id, 'page-arrival');
    animation.resolve();
    await animation.finished;
    assert.equal(animation.cancelCount, 1);
    dispose();
    assert.equal(animation.cancelCount, 1);
  } finally { dispose(); env.restore(); }
});

test('about, hidden pages and disabled motion never start another entry', () => {
  for (const setting of ['about', 'hidden', 'reduced', 'paused']) {
    const env = environment(setting === 'about' ? '/about' : '/archive');
    try {
      if (setting === 'hidden') env.document.hidden = true;
      if (setting === 'reduced') env.reduced.matches = true;
      if (setting === 'paused') env.pause();
      runPageArrival()();
      assert.equal(env.calls.length, 0, setting);
    } finally { env.restore(); }
  }
});

test('navigation, backgrounding and disabling motion cancel the active entry once', () => {
  for (const setting of ['navigation', 'hidden', 'reduced', 'paused', 'storage']) {
    const env = environment();
    const dispose = runPageArrival();
    try {
      if (setting === 'navigation') env.window.dispatchEvent(new Event('pagehide'));
      if (setting === 'hidden') { env.document.hidden = true; env.document.dispatchEvent(new Event('visibilitychange')); }
      if (setting === 'reduced') { env.reduced.matches = true; env.reduced.dispatchEvent(new Event('change')); }
      if (setting === 'paused' || setting === 'storage') {
        env.pause(); env.window.dispatchEvent(new Event(setting === 'storage' ? 'storage' : 'liangzai-motion-change'));
      }
      assert.equal(env.calls[0].animation.cancelCount, 1, setting);
      dispose();
      assert.equal(env.calls[0].animation.cancelCount, 1, setting);
    } finally { dispose(); env.restore(); }
  }
});

test('committed React route takes precedence over a not-yet-updated address bar', () => {
  const env = environment('/archive');
  try {
    runPageArrival('/about')();
    assert.equal(env.calls.length, 0, 'About never inherits the previous page entry');
  } finally { env.restore(); }
  const back = environment('/about');
  const dispose = runPageArrival('/archive');
  try { assert.equal(back.calls.length, 1, 'leaving About receives the destination entry'); }
  finally { dispose(); back.restore(); }
});

test('news listings, details and the laboratory receive their destination entry', () => {
  for (const pathname of ['/news', '/news/', '/news/20261001-story', '/pqc-practice']) {
    const env = environment(pathname);
    const dispose = runPageArrival(pathname);
    try {
      assert.equal(env.calls.length, 1, pathname);
      assert.equal(env.calls[0].animation.id, 'page-arrival');
    } finally { dispose(); env.restore(); }
  }
});
