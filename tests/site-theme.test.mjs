import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const bootstrap = await read('public/theme/site-theme.js');

function browser({ saved = null, dark = false, storageBlocked = false, legacyMedia = false } = {}) {
  const events = new EventTarget();
  const documentEvents = new EventTarget();
  const systemEvents = new EventTarget();
  const values = new Map(saved === null ? [] : [['liangzai-theme', saved]]);
  const root = { dataset: {}, style: {} };
  const meta = { content: null, setAttribute(name, value) { this[name] = value; } };
  const select = { value: 'system', matches: selector => selector === '[data-theme-select="static"]' };
  const media = { matches: dark };
  if (legacyMedia) media.addListener = callback => systemEvents.addEventListener('change', callback);
  else media.addEventListener = (...args) => systemEvents.addEventListener(...args);
  const writes = [];
  const localStorage = {
    getItem(key) { if (storageBlocked) throw new Error('storage blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw new Error('storage blocked'); values.set(key, value); writes.push([key, value]); },
    removeItem(key) { if (storageBlocked) throw new Error('storage blocked'); values.delete(key); writes.push([key, null]); },
  };
  const document = {
    documentElement: root,
    querySelector: selector => selector === 'meta[name="theme-color"]' ? meta : null,
    querySelectorAll: selector => selector === '[data-theme-select="static"]' ? [select] : [],
    addEventListener: (...args) => documentEvents.addEventListener(...args),
  };
  const window = {
    localStorage,
    matchMedia: () => media,
    addEventListener: (...args) => events.addEventListener(...args),
    dispatchEvent: event => events.dispatchEvent(event),
  };
  const state = { generatedKey: 'test-key', currentStep: 3, inFlight: { operation: 'encapsulation' } };
  // A trap rejects whole-document replacement or application-state writes.
  Object.defineProperty(document, 'body', { get() { throw new Error('theme must not touch the application body'); } });
  vm.runInNewContext(bootstrap, { window, document, CustomEvent });
  return {
    root, meta, select, values, writes, state,
    choose: value => window.LiangzaiTheme.setPreference(value),
    system: matches => { media.matches = matches; systemEvents.dispatchEvent(new Event('change')); },
    request: detail => events.dispatchEvent(new CustomEvent('liangzai:theme-request', { detail })),
    storage: (key, newValue) => {
      const event = new Event('storage');
      Object.assign(event, { key, newValue });
      events.dispatchEvent(event);
    },
    restore: () => events.dispatchEvent(new Event('pageshow')),
    ready: () => documentEvents.dispatchEvent(new Event('DOMContentLoaded')),
    changeSelect: value => {
      select.value = value;
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: select });
      documentEvents.dispatchEvent(event);
    },
  };
}

test('paper is the default and legacy themes safely migrate without touching application data', () => {
  for (const saved of [null, 'system', 'mist', 'sand', 'unknown']) {
    const page = browser({ saved, dark: true });
    assert.equal(page.root.dataset.theme, 'paper');
    assert.equal(page.root.dataset.themePreference, 'paper');
    page.system(false);
    assert.equal(page.root.dataset.theme, 'paper');
    assert.equal(page.state.generatedKey, 'test-key');
  }
});

test('both explicit palettes persist, ignore OS changes, and restore across documents', () => {
  for (const theme of ['paper', 'midnight']) {
    const page = browser();
    const state = page.state;
    page.choose(theme);
    page.system(true);
    assert.equal(page.root.dataset.theme, theme);
    assert.equal(page.values.get('liangzai-theme'), theme);
    assert.equal(page.select.value, theme);
    assert.equal(page.state, state);
    assert.equal(page.state.generatedKey, 'test-key');
    assert.equal(page.state.currentStep, 3);
    assert.equal(browser({ saved: page.values.get('liangzai-theme'), dark: true }).root.dataset.theme, theme);
  }
});

test('React, native controls, blocked storage, BFCache and cross-tab changes synchronize', () => {
  const page = browser();
  page.request('midnight');
  assert.equal(page.root.dataset.theme, 'midnight');
  page.changeSelect('paper');
  assert.equal(page.root.dataset.theme, 'paper');
  page.storage('liangzai-theme', 'midnight');
  assert.equal(page.root.dataset.theme, 'midnight');
  page.values.set('liangzai-theme', 'paper');
  page.restore();
  assert.equal(page.root.dataset.theme, 'paper');
  page.choose('__proto__');
  page.choose({ paper: true });
  assert.equal(page.root.dataset.theme, 'paper');
  const blocked = browser({ storageBlocked: true });
  blocked.choose('midnight');
  blocked.restore();
  assert.equal(blocked.root.dataset.theme, 'midnight');
});

test('both rendering paths load the same synchronous bootstrap and accessible native controls', async () => {
  const layout = await read('app/layout.tsx');
  assert.match(layout, /<html[^>]+suppressHydrationWarning/);
  assert.match(layout, /<head>[\s\S]*<script src="\/theme\/site-theme\.js\?v=20261004-editorial"\s*\/>[\s\S]*<\/head>/);
  assert.match(layout, /public\/theme\/site-theme\.css/);
  const picker = await read('app/theme/ThemePicker.tsx');
  assert.match(picker, /useSyncExternalStore/);
  assert.match(picker, /aria-label="页面主题"/);
  for (const theme of ['paper', 'midnight']) assert.match(picker, new RegExp(`value="${theme}"`));
  for (const path of ['index.html', 'audit.html']) {
    const html = await read('public/pqc-practice/' + path);
    const script = html.match(/<script[^>]+src="\/theme\/site-theme\.js\?v=20261004-editorial"[^>]*>/)?.[0];
    assert.ok(script);
    assert.doesNotMatch(script, /async|defer|type="module"/);
    assert.ok(html.indexOf(script) < html.indexOf('<body'));
    assert.match(html, /href="\/theme\/site-theme\.css\?v=20261004-editorial"/);
    assert.match(html, /<select aria-label="页面主题" data-theme-select="static">/);
    assert.match(html, /\/pqc-practice\/about-push\/static\.js/);
    assert.doesNotMatch(html, /\/assets\/about-push\//);
    for (const theme of ['paper', 'midnight']) assert.match(html, new RegExp(`value="${theme}"`));
  }
});

function luminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('vetted semantic palette text, accent labels and field boundaries meet contrast targets', async () => {
  const css = await read('public/theme/site-theme.css');
  for (const theme of ['paper', 'midnight']) {
    const block = css.match(new RegExp(`:root\\[data-theme="${theme}"\\] \\{([^}]+)`))[1];
    const token = name => block.match(new RegExp(`--theme-${name}: (#[0-9a-f]+)`, 'i'))[1];
    for (const surface of ['bg', 'surface']) {
      for (const text of ['ink', 'muted', 'accent', 'success', 'danger']) {
        assert.ok(contrast(token(text), token(surface)) >= 4.5, `${theme}: ${text}/${surface}`);
      }
    }
    assert.ok(contrast(token('on-accent'), token('accent')) >= 4.5, `${theme}: button label`);
  }
  assert.match(css, /--theme-control-border: var\(--theme-muted\)/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /filter:\s*(?:invert|hue-rotate)/);
});
