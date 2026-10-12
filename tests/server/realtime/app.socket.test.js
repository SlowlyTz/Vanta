import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { APP_VERSION } from '../../../src/public/js/shared/version.js';

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
      expect.objectContaining({ type: 'APP_SOCKET_READY', version: APP_VERSION })
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

  it('tells every app of a user that the session ended and hangs up', () => {
    const hub = new AppSocketHub();
    const make = () => ({ readyState: 1, OPEN: 1, send: vi.fn(), close: vi.fn() });
    const a = make();
    const b = make();
    const other = make();
    hub.register('u1', a);
    hub.register('u1', b);
    hub.register('u2', other);

    hub.endUserSessions('u1', { code: 'BANNED', reason: 'x' });

    for (const ws of [a, b]) {
      expect(JSON.parse(ws.send.mock.calls[0][0])).toEqual({ type: 'SESSION_ENDED', code: 'BANNED', reason: 'x' });
      expect(ws.close).toHaveBeenCalledWith(4001, 'Session ended');
    }
    expect(other.send).not.toHaveBeenCalled();
  });

  it('ends only the apps of one signed-out session', () => {
    const hub = new AppSocketHub();
    const make = (sessionId) => ({ readyState: 1, OPEN: 1, send: vi.fn(), close: vi.fn(), sessionId });
    const phone = make('s-phone');
    const tv = make('s-tv');
    hub.register('u1', phone);
    hub.register('u1', tv);

    hub.endSession('u1', 's-tv', { error: 'Abgemeldet' });
    hub.endSession('u2', 's-phone', { error: 'Abgemeldet' });

    expect(JSON.parse(tv.send.mock.calls[0][0])).toEqual({ type: 'SESSION_ENDED', error: 'Abgemeldet' });
    expect(tv.close).toHaveBeenCalledWith(4001, 'Session ended');
    expect(phone.send).not.toHaveBeenCalled();
    expect(phone.close).not.toHaveBeenCalled();
  });
});
