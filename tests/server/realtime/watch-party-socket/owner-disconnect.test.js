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
    setConnected: vi.fn(),
    setPlayerReady: vi.fn(),
    openReadyRoom: vi.fn(),
    beginCountdownIfReady: vi.fn(),
    beginPlayback: vi.fn(),
    changeEpisode: vi.fn(),
    endParty: vi.fn(),
    promoteMember: vi.fn(),
    banMember: vi.fn(),
    serializeParty: vi.fn(party => party)
  },
  startWatchPartyCleanup: vi.fn(),
  isPartyAdmin: vi.fn((party, userId) => party.ownerUserId === userId || party.members?.get?.(userId)?.role === 'admin')
}));

import { WatchPartyService, isPartyAdmin } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';

describe('WatchPartySocketHub · Owner geht', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('beendet die Party nicht, wenn der Owner die Verbindung verliert: sie läuft für die anderen weiter', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'playing',
      members: new Map([
        ['owner-1', { userId: 'owner-1', username: 'Alice', connected: false }],
        ['viewer-1', { userId: 'viewer-1', username: 'Bob', connected: true }]
      ])
    };
    WatchPartyService.parties.set('party-1', party);
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ws = createFakeWs();
    hub.handleConnection({ ws, partyId: 'party-1', user: makeUser('owner-1', { username: 'Alice' }) });
    ws.listeners.close();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(WatchPartyService.endParty).not.toHaveBeenCalled();
    expect(WatchPartyService.setConnected).toHaveBeenLastCalledWith({ partyId: 'party-1', userId: 'owner-1', connected: false });
    WatchPartyService.parties.clear();
  });
});
