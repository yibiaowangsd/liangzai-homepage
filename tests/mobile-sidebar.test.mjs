import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('initial mobile accordion and later toggles keep accessible state without changing algorithms', async () => {
  const source = await readFile(new URL('../public/pqc-practice/app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function setSidebarCollapsed(');
  const end = source.indexOf("$('#sidebar-search').addEventListener", start);
  assert.ok(start >= 0 && end > start);
  const setup = source.slice(start, end);
  for (const mobile of [false, true]) {
    let collapsed = false;
    let focusCalls = 0;
    const attributes = { 'aria-expanded': 'true', 'aria-label': '收起算法栏' };
    const toggle = { setAttribute: (name, value) => { attributes[name] = value; }, firstElementChild: { textContent: '‹' } };
    const elements = {
      '#practice-layout': { classList: { toggle: (name, value) => { assert.equal(name, 'is-collapsed'); collapsed = value; } } },
      '#sidebar-toggle': toggle,
      '#sidebar-search': { focus: () => { focusCalls += 1; } },
    };
    const context = vm.createContext({
      $: selector => { assert.ok(elements[selector], 'No algorithm or parameter field is accessed'); return elements[selector]; },
      window: { matchMedia: query => { assert.equal(query, '(max-width: 900px)'); return { matches: mobile }; } },
    });
    vm.runInContext(setup, context);
    assert.equal(collapsed, mobile);
    assert.equal(attributes['aria-expanded'], String(!mobile));
    assert.equal(focusCalls, 0, 'Initial layout never steals focus');
    vm.runInContext('setSidebarCollapsed(false, true)', context);
    assert.equal(collapsed, false);
    assert.equal(attributes['aria-expanded'], 'true');
    assert.equal(attributes['aria-label'], '收起算法栏');
    assert.equal(toggle.firstElementChild.textContent, '‹');
    assert.equal(focusCalls, 1);
    vm.runInContext('setSidebarCollapsed(true)', context);
    assert.equal(attributes['aria-expanded'], 'false');
    assert.equal(attributes['aria-label'], '展开算法栏');
  }
});
