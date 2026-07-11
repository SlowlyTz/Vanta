import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    setPreloadState: vi.fn(),
    setPlayerReady: vi.fn(),
    openReadyRoom: vi.fn(),
    beginCountdownIfReady: vi.fn(),
    startParty: vi.fn(),
    beginPlayback: vi.fn(),
    changeEpisode: vi.fn(),
    endParty: vi.fn(),
    serializeParty: vi.fn(party => party)
  },
  startWatchPartyCleanup: vi.fn(),
  getPartyEffectivePosition: vi.fn(party => party.positionMs)
}));

import { WatchPartyService } from '../services/watch-party.service.js';
import { WatchPartySocketHub } from './watch-party.socket.js';

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

function makeUser(userId, overrides = {}) {
  return { userId, username: 'user', accessToken: 'token', ...overrides };
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
      expect.objectContaining({ type: 'CONTROL', action: 'play', positionMs: 4200 })
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

  describe('Owner-Disconnect Grace Period', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('startet einen Grace-Timer und beendet die Party nach Ablauf ohne Reconnect', () => {
      const hub = new WatchPartySocketHub();
      const party = {
        id: 'party-1',
        ownerUserId: 'owner-1',
        status: 'playing',
        members: new Map([['owner-1', { userId: 'owner-1', connected: false }]])
      };
      WatchPartyService.parties.set('party-1', party);
      WatchPartyService.endParty.mockReturnValue({ id: 'party-1', status: 'ended' });

      hub.scheduleOwnerDisconnectEnd('party-1', 'owner-1');
      expect(hub.ownerDisconnectTimers.has('party-1')).toBe(true);

      const ws = createFakeWs();
      hub.registerConnection('party-1', 'viewer-1', ws);

      vi.advanceTimersByTime(30_000);

      expect(WatchPartyService.endParty).toHaveBeenCalledWith({
        partyId: 'party-1', ownerUserId: 'owner-1', reason: 'owner-disconnected'
      });
      expect(ws.sent.some(m => m.type === 'PARTY_ENDED')).toBe(true);

      WatchPartyService.parties.delete('party-1');
    });

    it('bricht den Grace-Timer bei Reconnect des Owners ab', () => {
      const hub = new WatchPartySocketHub();
      const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', members: new Map([['owner-1', { userId: 'owner-1', connected: false }]]) };
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);

      hub.scheduleOwnerDisconnectEnd('party-1', 'owner-1');
      expect(hub.ownerDisconnectTimers.has('party-1')).toBe(true);

      const ws = createFakeWs();
      hub.handleConnection({ ws, partyId: 'party-1', user: makeUser('owner-1') });

      expect(hub.ownerDisconnectTimers.has('party-1')).toBe(false);

      vi.advanceTimersByTime(30_000);
      expect(WatchPartyService.endParty).not.toHaveBeenCalled();
    });
  });
});
