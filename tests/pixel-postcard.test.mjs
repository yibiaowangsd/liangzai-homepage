import test from 'node:test';
import assert from 'node:assert/strict';
import { area, blank, decodePicture, encodePicture, palettes, side, stroke, templates } from '../app/pixel-postcard/pixels.ts';

test('original postcards have a bounded canonical share fragment with no markup or personal data', () => {
  assert.equal(templates.length, 4);
  for (const { picture } of templates) {
    const fragment = encodePicture(picture);
    assert.equal(fragment.length, 137);
    assert.match(fragment, /^#stamp1=[012][\w-]{128}$/);
    assert.deepEqual(decodePicture(fragment), picture);
    assert.equal(new URL('https://example.test/x' + fragment).pathname, '/x');
  }
  for (const palette of palettes) {
    const cells = Array.from({ length: area }, (_, i) => i % 8);
    assert.deepEqual(decodePicture(encodePicture({ palette: palette.id, cells })), { palette: palette.id, cells });
  }
});

test('invalid fragments and out-of-range data are rejected', () => {
  const valid = encodePicture(templates[0].picture);
  for (const invalid of ['', valid + 'A', valid.slice(1), valid.replace('=0', '=9'), valid.slice(0, -1) + '<', valid.slice(0, -1) + '%2D', valid.slice(0, -1)]) {
    assert.equal(decodePicture(invalid), null);
  }
  assert.throws(() => encodePicture({ palette: 'dusk', cells: blank().slice(1) }));
  const invalid = blank();
  invalid[0] = -1;
  assert.throws(() => encodePicture({ palette: 'dusk', cells: invalid }));
});

test('brush connects fast diagonal and reverse strokes; eraser and no-op preserve the original snapshot', () => {
  const original = blank();
  const diagonal = stroke(original, { x: 0, y: 0 }, { x: 15, y: 15 }, 3);
  assert.equal(original.filter(Boolean).length, 0);
  assert.equal(diagonal.filter(Boolean).length, side);
  for (let i = 0; i < side; i++) assert.equal(diagonal[i * (side + 1)], 3);
  assert.equal(stroke(diagonal, { x: 15, y: 15 }, { x: 0, y: 0 }, 3), diagonal);
  const erased = stroke(diagonal, { x: 15, y: 15 }, { x: 0, y: 0 }, 0);
  assert.deepEqual(erased, original);
  const steep = stroke(original, { x: 2, y: 14 }, { x: 5, y: 5 }, 7);
  assert.equal(steep.filter(Boolean).length, 10);
  assert.equal(steep[14 * side + 2], 7);
  assert.equal(steep[5 * side + 5], 7);
});
