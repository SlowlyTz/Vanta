import { vi } from 'vitest';

export function createFakeWs() {
  return {
    readyState: 1,
    OPEN: 1,
    sent: [],
    listeners: {},
    send(payload) {
      this.sent.push(JSON.parse(payload));
    },
    on(event, handler) {
      this.listeners[event] = handler;
    },
    close: vi.fn()
  };
}

export function makeUser(userId, overrides = {}) {
  return { userId, username: 'user', accessToken: 'token', ...overrides };
}
