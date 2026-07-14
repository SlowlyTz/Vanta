import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('WatchPartySocketHub · Playback Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  it('broadcastet CONTROL, wenn der Owner OWNER_PLAY sendet', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_PLAY', positionMs: 4200 }, ws: ownerWs });

    expect(party.status).toBe('playing');
    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'CONTROL', action: 'play', positionMs: 4200 }),
      expect.objectContaining({ type: 'NOTIFICATION', notification: expect.objectContaining({ type: 'owner_play' }) })
    ]);
  });

  it('lehnt OWNER_PLAY/OWNER_PAUSE/OWNER_SEEK des Owners ab, solange die Party noch nicht gestartet ist', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'lobby', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_PLAY', positionMs: 100 }, ws: ownerWs });

    expect(party.status).toBe('lobby');
    expect(ownerWs.sent).toEqual([expect.objectContaining({ type: 'ERROR' })]);
  });

  it('ignoriert OWNER_SYNC des Owners in lobby und countdown ohne den Status zu ändern', () => {
    const hub = new WatchPartySocketHub();
    const lobbyParty = { id: 'party-1', ownerUserId: 'owner-1', status: 'lobby', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(lobbyParty);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SYNC', positionMs: 500, playing: true }, ws: ownerWs });

    expect(lobbyParty.status).toBe('lobby');
    expect(ownerWs.sent).toEqual([]);

    const countdownParty = { id: 'party-1', ownerUserId: 'owner-1', status: 'countdown', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(countdownParty);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SYNC', positionMs: 500, playing: true }, ws: ownerWs });

    expect(countdownParty.status).toBe('countdown');
    expect(ownerWs.sent).toEqual([]);
  });

  it('OWNER_SYNC in playing aktualisiert die Position und broadcastet SYNC', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SYNC', positionMs: 7000, playing: true }, ws: ownerWs });

    expect(party.status).toBe('playing');
    expect(party.positionMs).toBe(7000);
    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'SYNC', positionMs: 7000, playing: true })
    ]);
  });

  it('liefert ERROR, wenn ein Nicht-Owner OWNER_PLAY sendet', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('viewer-1'), message: { type: 'OWNER_PLAY', positionMs: 100 }, ws: viewerWs });

    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'ERROR' })
    ]);
    expect(party.status).toBe('paused');
  });
});
