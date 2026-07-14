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

describe('WatchPartySocketHub · Owner-Disconnect Grace Period', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

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
