import { vi } from 'vitest';

export class MockEventTarget {
  constructor() {
    this.listeners = {};
    this.currentTime = 0;
    this.paused = true;
    this.muted = false;
    this.volume = 0.8;
    this.playbackRate = 1;
    this.duration = 0;
    this.seekable = { length: 0 };
    this.src = null;
  }

  addEventListener(event, handler) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler(event));
  }

  querySelector() {
    return {
      requestVideoFrameCallback(callback) {
        setTimeout(() => callback(), 5);
        return 1;
      },
      cancelVideoFrameCallback() {}
    };
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }
}

export function setupGlobals() {
  global.window = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    clearInterval: (id) => clearInterval(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    requestAnimationFrame: (fn) => setTimeout(fn, 0)
  };
}

export function restoreGlobals() {
  delete global.window;
}

export function createMockReporter() {
  return {
    getPosition: vi.fn(() => 0),
    setPlayback: vi.fn(),
    beforeSourceSwitch: vi.fn(() => Promise.resolve()),
    afterSourceSwitch: vi.fn(),
    stop: vi.fn(() => Promise.resolve())
  };
}

export function createMockUi() {
  return {
    setState: vi.fn()
  };
}

export function createMockCallbacks() {
  return {
    setLoading: vi.fn(),
    setLoadingStatus: vi.fn(),
    setInlineLoading: vi.fn(),
    showError: vi.fn(),
    hideError: vi.fn()
  };
}
