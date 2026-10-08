import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { shouldSkipCinema } from '../app/studio/cinema-shortcut.ts';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const key = { key: ' ', code: 'Space', defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, target: null };

test('Space skips the intro without hijacking editing or modified shortcuts', () => {
  assert.equal(shouldSkipCinema(key), true);
  assert.equal(shouldSkipCinema({...key, key: 'Enter', code: 'Enter'}), false);
  for (const property of ['defaultPrevented', 'altKey', 'ctrlKey', 'metaKey']) {
    assert.equal(shouldSkipCinema({...key, [property]: true}), false);
  }
  const editable = { closest: selector => selector.includes('textarea') ? {} : null };
  assert.equal(shouldSkipCinema({...key, target: editable}), false);
  assert.equal(shouldSkipCinema({...key, target: {closest: () => null}}), true);
});

test('intro keeps click/touch, Escape, focus restoration, replay and dialog-scoped Space', async () => {
  const source = await read('app/studio/CinemaEntrance.tsx');
  assert.match(source, /e\.currentTarget\.open && shouldSkipCinema\(e\)/);
  assert.match(source, /onCancel=.*?skip\(\)/);
  assert.match(source, /className="cinema-skip" onClick=\{skip\} type="button"/);
  assert.match(source, /aria-keyshortcuts="Space Escape"/);
  assert.match(source, /<kbd>Space<\/kbd><span>跳过<\/span>/);
  assert.match(source, /previous\.current\?\.focus/);
  assert.doesNotMatch(source, /window\.addEventListener\("keydown"/);
  const css = await read('app/studio/cinema.css');
  const skip = css.match(/\.cinema-skip \{([^}]+)\}/)[1];
  assert.match(skip, /min-height: 44px/);
  assert.match(skip, /background: transparent/);
  assert.match(skip, /font-size: 11px/);
  assert.match(css, /\.cinema-skip:focus-visible/);
});

test('literal page headings omit sentence-ending full stops but preserve body prose', async () => {
  for (const item of await readdir(new URL('../app/', import.meta.url), {recursive:true})) {
    if (!item.endsWith('.tsx')) continue;
    const source = await read('app/' + item);
    for (const heading of source.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
      assert.doesNotMatch(heading[1], /。/, item);
    }
  }
  const home = await read('app/QuantumHome.tsx');
  assert.match(home, /让算法走向可用的连接。/);
  assert.match(await read("app/studio/HandshakeDemo.tsx"), /验证一次密钥封装/);
});

test('all laboratory transports have contained opaque surfaces and no escaping wires', async () => {
  const css = await read('public/pqc-practice/studio.css');
  assert.match(css, /\.channel, \.kex-channel \{[^}]*background: var\(--theme-soft\)/s);
  assert.match(css, /\.channel \.route, \.channel \.route \+ \.route, \.kex-channel \.route \{[^}]*background: var\(--lab-surface\)/s);
  assert.match(css, /\.channel \.wire, \.kex-channel \.wire \{[^}]*margin: 0 4px 14px/s);
  assert.doesNotMatch(css, /margin-inline: -/);
  assert.match(css, /\.channel \.packet-data, \.kex-channel pre \{ max-width: 100%; overflow-wrap: anywhere;/);
  assert.match(await read('public/pqc-practice/styles.css'), /\.packet-data\{[^}]*max-height:155px;overflow:auto/);
});
