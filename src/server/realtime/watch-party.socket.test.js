import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

let sessionOverride = null;

vi.mock('../config/session.js', () => ({
  sessionMiddleware: (req, res, next) => {
    req.session = sessionOverride;
    next();
  }
}));

vi.mock('../services/watch-party.service.js', () => ({
  WatchPartyService: {
    parties: new Map(),
    getPartyOrThrow: vi.fn(),
    setReady: vi.fn(),
    setConnected: vi.fn(),
    startParty: vi.fn(),
    serializeParty: vi.fn(party => party)
  },
  startWatchPartyCleanup: vi.fn()
}));

import { WatchPartyService } from '../services/watch-party.service.js';
import { WatchPartySocketHub } from './watch-party.socket.js';

function createFakeWs() {
  return {
    readyState: 1,
    OPEN: 1,
    sent: [],
    send(payload) {
      this.sent.push(JSON.parse(payload));
    },
    close: vi.fn()
  };
}

describe('WatchPartySocketHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  it('lehnt das Upgrade ohne gültige Session ab', () => {
    const hub = new WatchPartySocketHub();
    const fakeServer = new EventEmitter();
    hub.attach(fakeServer);

    const socket = { write: vi.fn(), destroy: vi.fn() };
    const req = { url: '/ws/watch-party/party-1' };
    sessionOverride = null;

    fakeServer.emit('upgrade', req, socket, Buffer.alloc(0));

    expect(socket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('lässt das Upgrade mit gültiger Session passieren', () => {
    const hub = new WatchPartySocketHub();
    const fakeServer = new EventEmitter();
    const handleUpgradeSpy = vi.spyOn(hub.wss, 'handleUpgrade').mockImplementation(() => {});
    hub.attach(fakeServer);

    const socket = { write: vi.fn(), destroy: vi.fn() };
    const req = { url: '/ws/watch-party/party-1' };
    sessionOverride = { userId: 'user-1', username: 'alice' };

    fakeServer.emit('upgrade', req, socket, Buffer.alloc(0));

    expect(socket.write).not.toHaveBeenCalled();
    expect(handleUpgradeSpy).toHaveBeenCalled();
  });

  it('broadcastet CONTROL, wenn der Owner OWNER_PLAY sendet', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', userId: 'owner-1', message: { type: 'OWNER_PLAY', positionMs: 4200 }, ws: ownerWs });

    expect(party.status).toBe('playing');
    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'CONTROL', action: 'play', positionMs: 4200 })
    ]);
  });

  it('liefert ERROR, wenn ein Nicht-Owner OWNER_PLAY sendet', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', userId: 'viewer-1', message: { type: 'OWNER_PLAY', positionMs: 100 }, ws: viewerWs });

    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'ERROR' })
    ]);
    expect(party.status).toBe('paused');
  });

  it('aktualisiert die Party und broadcastet PARTY_UPDATED bei READY', () => {
    const hub = new WatchPartySocketHub();
    const updatedParty = { id: 'party-1', status: 'lobby' };
    WatchPartyService.setReady.mockReturnValue(updatedParty);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleMessage({ partyId: 'party-1', userId: 'viewer-1', message: { type: 'READY', ready: true }, ws: createFakeWs() });

    expect(WatchPartyService.setReady).toHaveBeenCalledWith({ partyId: 'party-1', userId: 'viewer-1', ready: true });
    expect(ownerWs.sent).toEqual([
      expect.objectContaining({ type: 'PARTY_UPDATED', party: updatedParty })
    ]);
  });
});
