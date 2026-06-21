import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { once } from '../../src/promiseHelpers.js';

class MockEventTarget {
  constructor() {
    this.listeners = {};
  }

  addEventListener(event, handler, options) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push({ handler, options });
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(entry => entry.handler !== handler);
  }

  dispatchEvent(event) {
    const entries = this.listeners[event.type] || [];
    entries.slice().forEach(entry => {
      entry.handler(event);
      if (entry.options?.once) {
        this.removeEventListener(event.type, entry.handler);
      }
    });
  }
}

describe('once', () => {
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

  it('resolves when event fires', async () => {
    const target = new MockEventTarget();
    const promise = once(target, 'seeked', 1000);
    target.dispatchEvent({ type: 'seeked' });
    await expect(promise).resolves.toEqual({ type: 'seeked' });
  });

  it('resolves when event fires synchronously right after registration', async () => {
    const target = new MockEventTarget();
    let resolved = false;

    const promise = once(target, 'seeked', 1000).then(event => {
      resolved = true;
      return event;
    });

    target.dispatchEvent({ type: 'seeked' });

    await expect(promise).resolves.toEqual({ type: 'seeked' });
    expect(resolved).toBe(true);
  });

  it('rejects on timeout', async () => {
    const target = new MockEventTarget();
    const promise = once(target, 'seeked', 10);
    await expect(promise).rejects.toThrow('Playback timed out while waiting for seeked');
  });

  it('rejects on reject event', async () => {
    const target = new MockEventTarget();
    const promise = once(target, 'can-play', 1000, ['error']);
    target.dispatchEvent({ type: 'error', detail: { message: 'decode failed' } });
    await expect(promise).rejects.toThrow('decode failed');
  });
});
