import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNewsEditionDismissed,
  openNewsGateModal,
  rememberNewsEditionDismissed,
} from '../app/experience/news-gate-modal.ts';

function modalEnvironment() {
  const document = { body: { style: { overflow: 'auto' } }, activeElement: null };
  const focusable = () => ({
    isConnected: true,
    focusCalls: [],
    focus(options) { this.focusCalls.push(options); document.activeElement = this; },
  });
  const previous = focusable();
  const closeButton = focusable();
  document.activeElement = previous;
  const dialog = Object.assign(new EventTarget(), {
    ownerDocument: document,
    open: false,
    openCount: 0,
    closeCount: 0,
    showModal() { this.open = true; this.openCount++; },
    close() { this.open = false; this.closeCount++; },
  });
  return { document, previous, closeButton, dialog };
}

test('native modality opens with close-button focus and restores scroll/focus exactly once', () => {
  const { document, previous, closeButton, dialog } = modalEnvironment();
  const dispose = openNewsGateModal(dialog, closeButton, () => {});
  assert.equal(dialog.openCount, 1, 'showModal supplies the browser focus trap and inert background');
  assert.equal(dialog.open, true);
  assert.equal(document.activeElement, closeButton);
  assert.deepEqual(closeButton.focusCalls, [{ preventScroll: true }]);
  assert.equal(document.body.style.overflow, 'hidden');

  dispose();
  dispose();
  assert.equal(dialog.open, false);
  assert.equal(dialog.closeCount, 1);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.activeElement, previous);
  assert.deepEqual(previous.focusCalls, [{ preventScroll: true }]);
});

test('Escape cancellation goes through dismissal; cleanup removes its listener', () => {
  const { dialog, closeButton } = modalEnvironment();
  let dismissals = 0;
  const dispose = openNewsGateModal(dialog, closeButton, () => { dismissals++; });
  const escape = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(dismissals, 1);
  dispose();
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  assert.equal(dismissals, 1);
});

test('StrictMode setup/cleanup/setup can reopen without leaking listeners or scroll lock', () => {
  const { document, dialog, previous, closeButton } = modalEnvironment();
  let dismissals = 0;
  const dismiss = () => { dismissals++; };
  openNewsGateModal(dialog, closeButton, dismiss)();
  const dispose = openNewsGateModal(dialog, closeButton, dismiss);
  assert.equal(dialog.openCount, 2);
  assert.equal(document.activeElement, closeButton);
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  assert.equal(dismissals, 1);
  dispose();
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.activeElement, previous);
});

test('navigation cleanup skips a removed focus target and tolerates an already closed dialog', () => {
  const { document, dialog, previous, closeButton } = modalEnvironment();
  const dispose = openNewsGateModal(dialog, closeButton, () => {});
  previous.isConnected = false;
  dialog.close();
  dispose();
  assert.equal(dialog.closeCount, 1);
  assert.equal(previous.focusCalls.length, 0);
  assert.equal(document.body.style.overflow, 'auto');
});

test('browsers without native dialog support keep the optional gate nonblocking', () => {
  const { document, dialog, closeButton } = modalEnvironment();
  dialog.showModal = undefined;
  openNewsGateModal(dialog, closeButton, () => {})();
  assert.equal(dialog.open, false);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(closeButton.focusCalls.length, 0);
});

function withStorage(storage, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: storage, configurable: true });
  try { run(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
}

test('dismissal respects the existing edition key and does not dismiss a newer edition', () => {
  const values = new Map([['liangzai-news-gate:existing', 'dismissed']]);
  withStorage({ localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } }, () => {
    assert.equal(isNewsEditionDismissed('existing'), true);
    assert.equal(isNewsEditionDismissed('next-edition'), false);
    rememberNewsEditionDismissed('next-edition');
    assert.equal(values.get('liangzai-news-gate:next-edition'), 'dismissed');
    assert.equal(isNewsEditionDismissed('next-edition'), true);
    assert.equal(isNewsEditionDismissed('newer-edition'), false);
  });
});

test('blocked storage reads/writes still allow showing and dismissing the edition for this visit', () => {
  const error = () => { throw new Error('storage blocked'); };
  withStorage({ localStorage: { getItem: error, setItem: error } }, () => {
    assert.equal(isNewsEditionDismissed('blocked-methods'), false);
    assert.doesNotThrow(() => rememberNewsEditionDismissed('blocked-methods'));
    assert.equal(isNewsEditionDismissed('blocked-methods'), true);
  });
  withStorage({ get localStorage() { return error(); } }, () => {
    assert.equal(isNewsEditionDismissed('blocked-getter'), false);
    assert.doesNotThrow(() => rememberNewsEditionDismissed('blocked-getter'));
    assert.equal(isNewsEditionDismissed('blocked-getter'), true);
  });
});
