import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppSocket } from '../../../src/public/js/realtime/app.socket.js';

class FakeWebSocket {
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    this.listeners = {};
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(event, handler) {
    (this.listeners[event] ||= []).push(handler);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.emit('close');
  }

  emit(event, detail) {
    (this.listeners[event] || []).forEach(handler => handler(detail));
  }
}

describe('createAppSocket', () => {
  let originalWebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    originalWebSocket = window.WebSocket;
    window.WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    window.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('verbindet zu /ws/app', () => {
    createAppSocket({});
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/ws/app');
  });

  it('ruft onOpen beim open-Event auf', () => {
    const onOpen = vi.fn();
    createAppSocket({ onOpen });
    FakeWebSocket.instances[0].emit('open');
    expect(onOpen).toHaveBeenCalled();
  });

  it('parst eingehende Nachrichten und ruft onMessage auf', () => {
    const onMessage = vi.fn();
    createAppSocket({ onMessage });
    FakeWebSocket.instances[0].emit('message', { data: JSON.stringify({ type: 'WATCH_PARTY_INVITATION' }) });
    expect(onMessage).toHaveBeenCalledWith({ type: 'WATCH_PARTY_INVITATION' });
  });

  it('ignoriert kaputtes JSON in eingehenden Nachrichten', () => {
    const onMessage = vi.fn();
    createAppSocket({ onMessage });
    expect(() => FakeWebSocket.instances[0].emit('message', { data: 'not-json' })).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('sendJson sendet nur, wenn der Socket offen ist', () => {
    const socket = createAppSocket({});
    socket.sendJson({ type: 'PING' });
    expect(FakeWebSocket.instances[0].sent).toEqual([JSON.stringify({ type: 'PING' })]);

    FakeWebSocket.instances[0].readyState = 3;
    socket.sendJson({ type: 'PING' });
    expect(FakeWebSocket.instances[0].sent).toHaveLength(1);
  });

  it('reconnected mit Backoff, wenn die Verbindung ungewollt schließt', () => {
    vi.useFakeTimers();
    const onReconnecting = vi.fn();
    createAppSocket({ onReconnecting });

    FakeWebSocket.instances[0].emit('close');
    expect(onReconnecting).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1500);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('close() verhindert Reconnect und schließt bewusst', () => {
    vi.useFakeTimers();
    const onReconnecting = vi.fn();
    const socket = createAppSocket({ onReconnecting });

    socket.close();

    expect(onReconnecting).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
