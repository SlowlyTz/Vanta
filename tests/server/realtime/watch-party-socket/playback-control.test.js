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

  it('broadcastet TIMELINE, wenn der Owner OWNER_PLAY sendet', () => {
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
      expect.objectContaining({
        type: 'TIMELINE',
        actorUserId: 'owner-1',
        reason: 'play',
        timeline: expect.objectContaining({ positionMs: 4200, playing: true, seq: 1 })
      }),
      expect.objectContaining({ type: 'NOTIFICATION', notification: expect.objectContaining({ type: 'owner_play' }) })
    ]);
    // The actor gets the timeline (to learn the seq) but not its own notification.
    expect(ownerWs.sent).toEqual([expect.objectContaining({ type: 'TIMELINE', actorUserId: 'owner-1' })]);
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

  describe('Heartbeat des Sync-Leaders', () => {
    const makePlayingParty = (overrides = {}) => ({
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'playing',
      positionMs: 10_000,
      lastServerTimeMs: Date.now(),
      seq: 3,
      members: new Map([
        ['owner-1', { userId: 'owner-1', role: 'owner', connected: true, joinedAt: 1 }],
        ['admin-1', { userId: 'admin-1', role: 'admin', connected: true, joinedAt: 2 }],
        ['viewer-1', { userId: 'viewer-1', role: 'viewer', connected: true, joinedAt: 3 }]
      ]),
      ...overrides
    });

    const setup = party => {
      const hub = new WatchPartySocketHub();
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);
      const sockets = { owner: createFakeWs(), admin: createFakeWs(), viewer: createFakeWs() };
      hub.registerConnection('party-1', 'owner-1', sockets.owner);
      hub.registerConnection('party-1', 'admin-1', sockets.admin);
      hub.registerConnection('party-1', 'viewer-1', sockets.viewer);
      const beat = (userId, message) => hub.handleMessage({
        partyId: 'party-1',
        user: makeUser(userId),
        message: { type: 'OWNER_SYNC', playing: true, stableMs: 20_000, atServerTimeMs: party.lastServerTimeMs, ...message },
        ws: sockets.owner
      });
      return { hub, sockets, beat };
    };

    it('korrigiert die Zeitleiste, wenn der stabile Leader mehr als 1 s abweicht', () => {
      const party = makePlayingParty();
      const { sockets, beat } = setup(party);

      beat('owner-1', { positionMs: 12_500 });

      expect(party.positionMs).toBe(12_500);
      expect(party.seq).toBe(4);
      expect(sockets.viewer.sent).toEqual([
        expect.objectContaining({ type: 'TIMELINE', reason: 'sync', actorUserId: 'owner-1', timeline: expect.objectContaining({ positionMs: 12_500, seq: 4 }) })
      ]);
    });

    it('ignoriert kleine Abweichungen, ohne etwas zu senden', () => {
      const party = makePlayingParty();
      const { sockets, beat } = setup(party);

      beat('owner-1', { positionMs: 10_600 });

      expect(party.seq).toBe(3);
      expect(sockets.viewer.sent).toEqual([]);
    });

    it('ignoriert Heartbeats von Admins, die nicht Leader sind', () => {
      const party = makePlayingParty();
      const { sockets, beat } = setup(party);

      beat('admin-1', { positionMs: 50_000 });

      expect(party.positionMs).toBe(10_000);
      expect(sockets.viewer.sent).toEqual([]);
    });

    it('lässt sich nicht von einem puffernden oder frisch gespulten Leader ziehen', () => {
      const party = makePlayingParty();
      const { sockets, beat } = setup(party);

      beat('owner-1', { positionMs: 4_000, buffering: true });
      beat('owner-1', { positionMs: 4_000, stableMs: 2_000 });
      beat('owner-1', { positionMs: 4_000, stableMs: undefined });

      expect(party.positionMs).toBe(10_000);
      expect(sockets.viewer.sent).toEqual([]);
    });

    it('ändert über den Heartbeat nie den Play-/Pause-Zustand', () => {
      const party = makePlayingParty();
      const { beat } = setup(party);

      beat('owner-1', { positionMs: 30_000, playing: false });

      expect(party.status).toBe('playing');
      expect(party.positionMs).toBe(10_000);
    });

    it('übergibt die Leader-Rolle an den ersten verbundenen Admin, wenn der Owner fehlt', () => {
      const party = makePlayingParty();
      party.members.get('owner-1').connected = false;
      const { beat } = setup(party);

      beat('admin-1', { positionMs: 15_000 });

      expect(party.positionMs).toBe(15_000);
    });
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
  it('beantwortet TIME_PING mit der Serverzeit und dem Sendezeitpunkt des Clients', () => {
    const hub = new WatchPartySocketHub();
    const ws = createFakeWs();
    const before = Date.now();

    hub.handleMessage({ partyId: 'party-1', user: makeUser('viewer-1'), message: { type: 'TIME_PING', clientSentAt: 1234.5 }, ws });

    expect(ws.sent).toEqual([expect.objectContaining({ type: 'TIME_PONG', clientSentAt: 1234.5 })]);
    expect(ws.sent[0].serverTimeMs).toBeGreaterThanOrEqual(before);
    expect(WatchPartyService.getPartyOrThrow).not.toHaveBeenCalled();
  });
  it('nutzt den Zeitstempel des Clients als Anker und erhöht seq bei jeder Änderung', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0, seq: 4 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    const stampedAt = Date.now() - 60;
    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_PLAY', positionMs: 1000, atServerTimeMs: stampedAt }, ws: ownerWs });
    expect(party.lastServerTimeMs).toBe(stampedAt);
    expect(party.seq).toBe(5);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 9000, atServerTimeMs: Date.now() + 60_000 }, ws: ownerWs });
    expect(party.lastServerTimeMs).toBeLessThanOrEqual(Date.now());
    expect(party.status).toBe('playing');
    expect(party.seq).toBe(6);
  });
});
