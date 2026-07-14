import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { createFakeWs, makeUser } from './helpers.js';

let sessionOverride = null;

vi.mock('../../../../src/server/config/session.js', () => ({
  sessionMiddleware: (req, res, next) => {
    req.session = sessionOverride;
    next();
  }
}));

vi.mock('../../../../src/server/services/watch-party.service.js', () => ({
  WatchPartyService: {
    parties: new Map(),
    getPartyOrThrow: vi.fn(),
    setReady: vi.fn(),
    setConnected: vi.fn(),
    setPreloadState: vi.fn(),
    setPlayerReady: vi.fn(),
    openReadyRoom: vi.fn(),
    beginCountdownIfReady: vi.fn(),
    startParty: vi.fn(),
    beginPlayback: vi.fn(),
    changeEpisode: vi.fn(),
    endParty: vi.fn(),
    promoteMember: vi.fn(),
    banMember: vi.fn(),
    serializeParty: vi.fn(party => party)
  },
  startWatchPartyCleanup: vi.fn(),
  getPartyEffectivePosition: vi.fn(party => party.positionMs),
  isPartyAdmin: vi.fn((party, userId) => party.ownerUserId === userId || party.members?.get?.(userId)?.role === 'admin')
}));

import { WatchPartyService, isPartyAdmin } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';

describe('WatchPartySocketHub · Connection', () => {
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

  it('sendet PARTY_STATE direkt nach dem Connect', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'lobby',
      positionMs: 0,
      members: new Map([['owner-1', { userId: 'owner-1', connected: false }]])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ws = createFakeWs();
    hub.handleConnection({ ws, partyId: 'party-1', user: makeUser('owner-1') });

    expect(ws.sent[0]).toMatchObject({
      type: 'PARTY_STATE',
      party: { id: 'party-1', ownerUserId: 'owner-1', status: 'lobby', positionMs: 0 }
    });
  });
});
