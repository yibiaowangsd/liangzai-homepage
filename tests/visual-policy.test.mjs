import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDevice, detectVisualProfile, effectEnabled } from '../app/experience/visual-policy.ts';

const capable = { cores: 12, memory: 8, webgl: true, renderer: 'NVIDIA GeForce RTX 3060' };

test('low CPU, low memory, legacy iGPU and software rendering start light', () => {
  for (const hints of [
    { cores: 4 }, { memory: 4 }, { webgl: false }, { saveData: true },
    { reducedMotion: true }, { paused: true },
    { renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 610 Direct3D11)' },
    { renderer: 'Intel(R) HD Graphics 4000' },
    { renderer: 'Google SwiftShader' }, { renderer: 'llvmpipe (LLVM 15)' },
  ]) assert.equal(classifyDevice({ ...capable, ...hints }), 'lite', JSON.stringify(hints));
});

test('capable devices retain full visuals; absent/private hints have safe defaults', () => {
  assert.equal(classifyDevice(capable), 'full');
  assert.equal(classifyDevice({ ...capable, renderer: 'Intel(R) Iris(R) Xe Graphics' }), 'full');
  assert.equal(classifyDevice({ ...capable, renderer: 'Intel(R) Arc(TM) A770' }), 'full');
  assert.equal(classifyDevice({ ...capable, memory: undefined }), 'full');
  assert.equal(classifyDevice({ webgl: true }), 'lite');
  assert.equal(classifyDevice({ ...capable, cores: NaN }), 'lite');
});

test('SSR never mounts effects; explicit choices override either device default', () => {
  assert.equal(effectEnabled('checking', null), false);
  assert.equal(effectEnabled('lite', null), false);
  assert.equal(effectEnabled('full', null), true);
  for (const profile of ['checking', 'lite', 'full']) {
    assert.equal(effectEnabled(profile, true), true);
    assert.equal(effectEnabled(profile, false), false);
  }
});

test('probe skips low-capacity devices and always releases its temporary context', () => {
  const previous = new Map();
  let contexts = 0, releases = 0;
  const nav = { hardwareConcurrency: 4, deviceMemory: 8 };
  const globals = {
    navigator: nav, localStorage: { getItem() { throw new Error('blocked'); } },
    matchMedia: () => ({ matches: false }),
    document: { createElement() { contexts++; return { getContext: () => ({
      RENDERER: 7937, getParameter: () => 'Intel(R) UHD Graphics 610',
      getExtension: name => name === 'WEBGL_lose_context' ? { loseContext() { releases++; } } : null,
    }) }; } },
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  try {
    assert.equal(detectVisualProfile(), 'lite');
    assert.equal(contexts, 0);
    nav.hardwareConcurrency = 8;
    assert.equal(detectVisualProfile(), 'lite');
    assert.equal(contexts, 1);
    assert.equal(releases, 1);
    document.createElement = () => ({ getContext() { throw new Error('WebGL blocked'); } });
    assert.equal(detectVisualProfile(), 'lite');
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
