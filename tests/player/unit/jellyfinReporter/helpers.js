export class MockEventTarget {
  constructor() {
    this.listeners = {};
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
}

export function createMockPlayer(state = {}) {
  const player = new MockEventTarget();
  player.currentTime = state.currentTime ?? 0;
  player.paused = state.paused ?? true;
  player.muted = state.muted ?? false;
  player.volume = state.volume ?? 1;
  player.playbackRate = state.playbackRate ?? 1;
  return player;
}

export function createMockGlobals() {
  const timers = [];
  const windows = [];

  return {
    setTimeout: (fn, ms) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    },
    clearInterval: (id) => clearInterval(id),
    setInterval: (fn, ms) => {
      const id = setInterval(fn, ms);
      timers.push(id);
      return id;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    _timers: timers,
    _windows: windows
  };
}

export function setupGlobals() {
  const mockWindow = createMockGlobals();
  const mockDocument = new MockEventTarget();
  mockDocument.hidden = false;
  global.window = mockWindow;
  global.document = mockDocument;
  return { mockWindow, mockDocument };
}

export function restoreGlobals() {
  delete global.window;
  delete global.document;
}
