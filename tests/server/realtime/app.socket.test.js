import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

let sessionOverride = null;

vi.mock('../../../src/server/config/session.js', () => ({
  sessionMiddleware: (req, res, next) => {
    req.session = sessionOverride;
    next();
  }
}));

import { AppSocketHub } from '../../../src/server/realtime/app.socket.js';

function createFakeWs() {
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

describe('AppSocketHub', () => {
  beforeEach(() => {
    sessionOverride = null;
  });

  it('lehnt das Upgrade ohne gültige Session ab', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    hub.attach(fakeServer);

    const socket = { write: vi.fn(), destroy: vi.fn() };
    const req = { url: '/ws/app' };
    sessionOverride = null;

    fakeServer.emit('upgrade', req, socket, Buffer.alloc(0));

    expect(socket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('ignoriert Upgrade-Requests für fremde Pfade', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    const handleUpgradeSpy = vi.spyOn(hub.wss, 'handleUpgrade').mockImplementation(() => {});
    hub.attach(fakeServer);

    const socket = { write: vi.fn(), destroy: vi.fn() };
    const req = { url: '/ws/watch-party/party-1' };
    sessionOverride = { userId: 'user-1', username: 'alice' };

    fakeServer.emit('upgrade', req, socket, Buffer.alloc(0));

    expect(socket.write).not.toHaveBeenCalled();
    expect(handleUpgradeSpy).not.toHaveBeenCalled();
  });

  it('lässt das Upgrade mit gültiger Session passieren', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    const handleUpgradeSpy = vi.spyOn(hub.wss, 'handleUpgrade').mockImplementation(() => {});
    hub.attach(fakeServer);

    const socket = { write: vi.fn(), destroy: vi.fn() };
    const req = { url: '/ws/app' };
    sessionOverride = { userId: 'user-1', username: 'alice' };

    fakeServer.emit('upgrade', req, socket, Buffer.alloc(0));

    expect(socket.write).not.toHaveBeenCalled();
    expect(handleUpgradeSpy).toHaveBeenCalled();
  });

  it('registriert eine Verbindung und sendet APP_SOCKET_READY beim connection-Event', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    hub.attach(fakeServer);

    const ws = createFakeWs();
    const req = { session: { userId: 'user-1', username: 'alice' } };
    hub.wss.emit('connection', ws, req);

    expect(ws.sent).toEqual([
      expect.objectContaining({ type: 'APP_SOCKET_READY' })
    ]);
    expect(hub.connectionsByUser.get('user-1').has(ws)).toBe(true);
  });

  it('erlaubt mehrere Tabs desselben Users', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    hub.attach(fakeServer);

    const wsA = createFakeWs();
    const wsB = createFakeWs();
    const req = { session: { userId: 'user-1', username: 'alice' } };
    hub.wss.emit('connection', wsA, req);
    hub.wss.emit('connection', wsB, req);

    expect(hub.connectionsByUser.get('user-1').size).toBe(2);
  });

  it('entfernt die Verbindung sauber beim Close', () => {
    const hub = new AppSocketHub();
    const fakeServer = new EventEmitter();
    hub.attach(fakeServer);

    const ws = createFakeWs();
    const req = { session: { userId: 'user-1', username: 'alice' } };
    hub.wss.emit('connection', ws, req);

    ws.listeners.close();

    expect(hub.connectionsByUser.has('user-1')).toBe(false);
  });

  it('sendToUser sendet an alle offenen Tabs dieses Users', () => {
    const hub = new AppSocketHub();
    const wsA = createFakeWs();
    const wsB = createFakeWs();
    hub.register('user-1', wsA);
    hub.register('user-1', wsB);

    hub.sendToUser('user-1', { type: 'TEST' });

    expect(wsA.sent).toEqual([{ type: 'TEST' }]);
    expect(wsB.sent).toEqual([{ type: 'TEST' }]);
  });

  it('sendToUser sendet nichts an andere User', () => {
    const hub = new AppSocketHub();
    const ws = createFakeWs();
    hub.register('user-1', ws);

    hub.sendToUser('user-2', { type: 'TEST' });

    expect(ws.sent).toEqual([]);
  });

  it('broadcast sendet an alle verbundenen User', () => {
    const hub = new AppSocketHub();
    const wsA = createFakeWs();
    const wsB = createFakeWs();
    hub.register('user-1', wsA);
    hub.register('user-2', wsB);

    hub.broadcast({ type: 'GLOBAL' });

    expect(wsA.sent).toEqual([{ type: 'GLOBAL' }]);
    expect(wsB.sent).toEqual([{ type: 'GLOBAL' }]);
  });

  it('beantwortet PING mit PONG', () => {
    const hub = new AppSocketHub();
    const ws = createFakeWs();
    hub.handleMessage(ws, JSON.stringify({ type: 'PING' }));

    expect(ws.sent).toEqual([
      expect.objectContaining({ type: 'PONG' })
    ]);
  });

  it('ignoriert kaputtes JSON in handleMessage', () => {
    const hub = new AppSocketHub();
    const ws = createFakeWs();
    expect(() => hub.handleMessage(ws, 'not-json')).not.toThrow();
    expect(ws.sent).toEqual([]);
  });
});
