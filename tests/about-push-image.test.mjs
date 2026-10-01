import test from 'node:test';
import assert from 'node:assert/strict';
import { createAboutPushImage } from '../app/experience/about-push-image.ts';

function environment(decode = async () => {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const images = [];
  const host = { append(image) { images.push(image); } };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement(tag) {
      assert.equal(tag, 'img', 'Fallback creates no GPU context or canvas');
      return { style: {}, decode, remove() { images.splice(images.indexOf(this), 1); } };
    },
  } });
  return { host, images, restore() {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  } };
}

test('image actor stays planted at rest, moves under the push and releases its image', async () => {
  const env = environment();
  try {
    const actor = await createAboutPushImage(env.host, new AbortController().signal);
    assert.equal(env.images.length, 1);
    actor.render(0);
    assert.match(env.images[0].style.transform, /^translateY\(0px\)/);
    actor.pose.walking = 1;
    actor.pose.stride = Math.PI / 2;
    actor.pose.lean = .2;
    actor.render(1);
    assert.match(env.images[0].style.transform, /^translateY\(-3px\)/);
    assert.match(env.images[0].style.transform, /rotate\(-5\.2deg\)/);
    actor.dispose();
    assert.equal(env.images.length, 0);
  } finally { env.restore(); }
});

test('failed or cancelled image loading removes the temporary actor', async () => {
  for (const reason of ['failed', 'cancelled']) {
    const controller = new AbortController();
    const env = environment(async () => {
      if (reason === 'failed') throw new Error('Image unavailable');
      controller.abort();
    });
    try {
      await assert.rejects(createAboutPushImage(env.host, controller.signal));
      assert.equal(env.images.length, 0, reason);
    } finally { env.restore(); }
  }
});
