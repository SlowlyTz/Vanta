import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('WatchPartySocketHub · Ready State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  it('aktualisiert die Party und broadcastet PARTY_UPDATED bei READY', () => {
    const hub = new WatchPartySocketHub();
    const updatedParty = { id: 'party-1', status: 'lobby' };
    WatchPartyService.setReady.mockReturnValue(updatedParty);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('viewer-1'), message: { type: 'READY', ready: true }, ws: createFakeWs() });

    expect(WatchPartyService.setReady).toHaveBeenCalledWith({ partyId: 'party-1', userId: 'viewer-1', ready: true });
    expect(ownerWs.sent).toEqual([
      expect.objectContaining({ type: 'PARTY_UPDATED', party: updatedParty })
    ]);
  });

  it('PRELOAD_STATE ready aktualisiert die Party und broadcastet PARTY_UPDATED', () => {
    const hub = new WatchPartySocketHub();
    const updatedParty = { id: 'party-1', status: 'lobby' };
    WatchPartyService.setPreloadState.mockReturnValue(updatedParty);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleMessage({
      partyId: 'party-1',
      user: makeUser('viewer-1'),
      message: { type: 'PRELOAD_STATE', state: 'ready', message: 'Bereit' },
      ws: createFakeWs()
    });

    expect(WatchPartyService.setPreloadState).toHaveBeenCalledWith({
      partyId: 'party-1', userId: 'viewer-1', state: 'ready', message: 'Bereit'
    });
    expect(ownerWs.sent).toEqual([
      expect.objectContaining({ type: 'PARTY_UPDATED', party: updatedParty })
    ]);
  });

  describe('Ready-Room Countdown', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('OWNER_OPEN_READY_ROOM broadcastet nur PARTY_UPDATED', () => {
      const hub = new WatchPartySocketHub();
      const readyRoomParty = { id: 'party-1', status: 'ready-room' };
      WatchPartyService.openReadyRoom.mockReturnValue(readyRoomParty);

      const ws = createFakeWs();
      hub.registerConnection('party-1', 'owner-1', ws);

      hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_OPEN_READY_ROOM' }, ws });

      expect(WatchPartyService.openReadyRoom).toHaveBeenCalledWith({ partyId: 'party-1', ownerUserId: 'owner-1' });
      expect(ws.sent).toEqual([
        expect.objectContaining({ type: 'PARTY_UPDATED', party: readyRoomParty })
      ]);
      expect(ws.sent.some(message => message.type === 'COUNTDOWN')).toBe(false);
    });

    it('PLAYER_READY startet COUNTDOWN und danach CONTROL play, wenn alle ready sind', () => {
      const hub = new WatchPartySocketHub();
      const readyRoomParty = { id: 'party-1', status: 'ready-room' };
      WatchPartyService.setPlayerReady.mockReturnValue(readyRoomParty);
      const countdownParty = { id: 'party-1', status: 'countdown' };
      WatchPartyService.beginCountdownIfReady.mockReturnValue({
        party: countdownParty,
        startsAtServerTimeMs: Date.now() + 5000,
        positionMs: 0
      });

      const playingParty = { id: 'party-1', status: 'playing', positionMs: 0, lastServerTimeMs: Date.now() };
      WatchPartyService.beginPlayback.mockReturnValue(playingParty);

      const ws = createFakeWs();
      hub.registerConnection('party-1', 'owner-1', ws);

      hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'PLAYER_READY' }, ws });

      expect(WatchPartyService.setPlayerReady).toHaveBeenCalledWith({
        partyId: 'party-1',
        userId: 'owner-1',
        ready: true,
        state: 'ready',
        message: 'Bereit'
      });
      expect(ws.sent.some(message => message.type === 'COUNTDOWN')).toBe(true);

      vi.advanceTimersByTime(5000);

      expect(WatchPartyService.beginPlayback).toHaveBeenCalledWith({ partyId: 'party-1', positionMs: 0 });
      const controlMessage = ws.sent.find(m => m.type === 'CONTROL');
      expect(controlMessage).toMatchObject({ action: 'play' });
      expect(ws.sent.some(m => m.type === 'NOTIFICATION')).toBe(false);
    });

    it('scheduleCountdownCompletion sendet CONTROL play, aber keine owner_play- oder owner_seek-Notification bei positionMs 0', () => {
      const hub = new WatchPartySocketHub();
      const playingParty = { id: 'party-1', status: 'playing', positionMs: 0, lastServerTimeMs: Date.now() };
      WatchPartyService.beginPlayback.mockReturnValue(playingParty);

      const ws = createFakeWs();
      hub.registerConnection('party-1', 'owner-1', ws);

      hub.scheduleCountdownCompletion('party-1', Date.now(), 0);
      vi.advanceTimersByTime(0);

      expect(ws.sent).toContainEqual(expect.objectContaining({ type: 'CONTROL', action: 'play', positionMs: 0 }));
      expect(ws.sent).not.toContainEqual(expect.objectContaining({
        type: 'NOTIFICATION',
        notification: expect.objectContaining({ type: 'owner_play' })
      }));
      expect(ws.sent).not.toContainEqual(expect.objectContaining({
        type: 'NOTIFICATION',
        notification: expect.objectContaining({ type: 'owner_seek' })
      }));
    });
  });

  it('OWNER_CHANGE_EPISODE broadcastet LOAD_MEDIA mit reason episode-change', async () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', playableItemId: 'episode-2', itemSnapshot: { name: 'Episode 2' } };
    WatchPartyService.changeEpisode.mockResolvedValue(party);

    const ws = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ws);

    hub.handleMessage({
      partyId: 'party-1',
      user: makeUser('owner-1'),
      message: { type: 'OWNER_CHANGE_EPISODE', itemId: 'episode-2' },
      ws
    });

    await vi.waitFor(() => {
      expect(ws.sent.some(m => m.type === 'LOAD_MEDIA' && m.reason === 'episode-change')).toBe(true);
    });
  });
});
