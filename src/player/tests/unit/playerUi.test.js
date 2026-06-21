import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPlayerUi } from '../../src/ui/playerUi.js';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createMockRoot() {
  const attributes = new Map();
  const listeners = new Map();

  const root = {
    className: 'vanta-player-root',
    classList: { add: vi.fn(), remove: vi.fn() },
    setAttribute: vi.fn((name, value) => attributes.set(name, value)),
    getAttribute: vi.fn(name => attributes.get(name) ?? null),
    removeAttribute: vi.fn(name => attributes.delete(name)),
    addEventListener: vi.fn((event, handler, options) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push({ handler, options });
    }),
    removeEventListener: vi.fn((event, handler) => {
      if (!listeners.has(event)) return;
      const entries = listeners.get(event).filter(entry => entry.handler !== handler);
      listeners.set(event, entries);
    }),
    dispatchEvent: vi.fn(event => {
      const entries = listeners.get(event.type) || [];
      entries.forEach(entry => entry.handler(event));
      return true;
    }),
    _listeners: listeners
  };

  return root;
}

describe('createPlayerUi', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = globalThis.window;
    globalThis.window = {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id)
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('sets initial booting state on root', () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root);

    expect(ui.getState()).toBe('booting');
    expect(root.setAttribute).toHaveBeenCalledWith('data-ui-state', 'booting');

    ui.destroy();
  });

  it('transitions between valid states', () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root);

    ui.setState('ready-paused');
    expect(ui.getState()).toBe('ready-paused');
    expect(root.setAttribute).toHaveBeenLastCalledWith('data-ui-state', 'ready-paused');

    ui.setState('error');
    expect(ui.getState()).toBe('error');

    ui.destroy();
  });

  it('ignores invalid states', () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root);

    ui.setState('ready-playing-active');
    ui.setState('invalid-state');

    expect(ui.getState()).toBe('ready-playing-active');

    ui.destroy();
  });

  it('transitions from active to idle after timeout', async () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root, { idleTimeoutMs: 50 });

    ui.setState('ready-playing-active');
    expect(ui.getState()).toBe('ready-playing-active');

    await sleep(80);

    expect(ui.getState()).toBe('ready-playing-idle');

    ui.destroy();
  });

  it('resets idle timer on pointer interaction', async () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root, { idleTimeoutMs: 80 });

    ui.setState('ready-playing-active');
    await sleep(40);

    root.dispatchEvent({ type: 'pointermove' });
    await sleep(40);

    expect(ui.getState()).toBe('ready-playing-active');

    await sleep(80);
    expect(ui.getState()).toBe('ready-playing-idle');

    ui.destroy();
  });

  it('wakes idle state back to active on interaction', async () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root, { idleTimeoutMs: 30 });

    ui.setState('ready-playing-active');
    await sleep(60);
    expect(ui.getState()).toBe('ready-playing-idle');

    root.dispatchEvent({ type: 'pointerdown' });
    expect(ui.getState()).toBe('ready-playing-active');

    ui.destroy();
  });

  it('clears timers and removes listeners on destroy', async () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root, { idleTimeoutMs: 30 });

    ui.setState('ready-playing-active');
    ui.destroy();

    await sleep(60);
    expect(ui.getState()).toBe('ready-playing-active');
    expect(root.removeEventListener).toHaveBeenCalled();
  });

  it('does not transition to idle when paused', async () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root, { idleTimeoutMs: 30 });

    ui.setState('ready-paused');
    await sleep(60);

    expect(ui.getState()).toBe('ready-paused');

    ui.destroy();
  });

  it('stops responding after destroy', () => {
    const root = createMockRoot();
    const ui = createPlayerUi(root);

    ui.destroy();
    ui.setState('ready-playing-active');

    expect(ui.getState()).toBe('booting');
  });
});
