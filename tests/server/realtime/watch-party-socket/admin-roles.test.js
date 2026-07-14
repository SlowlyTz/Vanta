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

describe('WatchPartySocketHub · Admin-Rollen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  it('ein beförderter Admin darf OWNER_PLAY senden', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'paused',
      positionMs: 0,
      lastServerTimeMs: 0,
      members: new Map([
        ['owner-1', { userId: 'owner-1', role: 'owner' }],
        ['admin-1', { userId: 'admin-1', role: 'admin' }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const adminWs = createFakeWs();
    hub.registerConnection('party-1', 'admin-1', adminWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('admin-1'), message: { type: 'OWNER_PLAY', positionMs: 4200 }, ws: adminWs });

    expect(party.status).toBe('playing');
  });

  it('ein Viewer darf weiterhin keine Playback-Control senden', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'paused',
      positionMs: 0,
      lastServerTimeMs: 0,
      members: new Map([
        ['owner-1', { userId: 'owner-1', role: 'owner' }],
        ['viewer-1', { userId: 'viewer-1', role: 'viewer' }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('viewer-1'), message: { type: 'OWNER_PLAY', positionMs: 100 }, ws: viewerWs });

    expect(viewerWs.sent).toEqual([expect.objectContaining({ type: 'ERROR' })]);
    expect(party.status).toBe('paused');
  });

  it('ADMIN_PROMOTE_MEMBER broadcastet PARTY_UPDATED und eine member_promoted Notification', () => {
    const hub = new WatchPartySocketHub();
    const updatedParty = { id: 'party-1', members: [{ userId: 'viewer-1', username: 'Bob', role: 'admin' }] };
    WatchPartyService.promoteMember.mockReturnValue(updatedParty);

    const ws = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ws);

    hub.handleMessage({
      partyId: 'party-1',
      user: makeUser('owner-1'),
      message: { type: 'ADMIN_PROMOTE_MEMBER', targetUserId: 'viewer-1' },
      ws
    });

    expect(WatchPartyService.promoteMember).toHaveBeenCalledWith({
      partyId: 'party-1', actorUserId: 'owner-1', targetUserId: 'viewer-1'
    });
    expect(ws.sent).toEqual([
      expect.objectContaining({ type: 'PARTY_UPDATED', party: updatedParty }),
      expect.objectContaining({
        type: 'NOTIFICATION',
        notification: expect.objectContaining({ type: 'member_promoted', message: 'Bob ist jetzt Admin.' })
      })
    ]);
  });

  it('ADMIN_BAN_MEMBER sendet BANNED_FROM_PARTY an das Ziel, schließt dessen Verbindungen und broadcastet PARTY_UPDATED + Notification', () => {
    const hub = new WatchPartySocketHub();
    const updatedParty = { id: 'party-1', members: [] };
    WatchPartyService.banMember.mockReturnValue({
      party: updatedParty,
      bannedUser: { userId: 'viewer-1', username: 'Bob' }
    });

    const ownerWs = createFakeWs();
    const targetWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);
    hub.registerConnection('party-1', 'viewer-1', targetWs);

    hub.handleMessage({
      partyId: 'party-1',
      user: makeUser('owner-1'),
      message: { type: 'ADMIN_BAN_MEMBER', targetUserId: 'viewer-1' },
      ws: ownerWs
    });

    expect(WatchPartyService.banMember).toHaveBeenCalledWith({
      partyId: 'party-1', actorUserId: 'owner-1', targetUserId: 'viewer-1'
    });
    expect(targetWs.sent).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'BANNED_FROM_PARTY' })])
    );
    expect(targetWs.close).toHaveBeenCalled();
    expect(ownerWs.sent).toEqual([
      expect.objectContaining({ type: 'PARTY_UPDATED', party: updatedParty }),
      expect.objectContaining({
        type: 'NOTIFICATION',
        notification: expect.objectContaining({ type: 'member_banned', message: 'Bob wurde aus der Watch Party gebannt.' })
      })
    ]);
  });

  it('gibt einen Fehler zurück, wenn ein Viewer versucht zu bannen', () => {
    const hub = new WatchPartySocketHub();
    const error = new Error('Nur Admins können diese Aktion ausführen');
    error.status = 403;
    WatchPartyService.banMember.mockImplementation(() => { throw error; });

    const ws = createFakeWs();
    hub.registerConnection('party-1', 'viewer-1', ws);

    hub.handleMessage({
      partyId: 'party-1',
      user: makeUser('viewer-1'),
      message: { type: 'ADMIN_BAN_MEMBER', targetUserId: 'viewer-2' },
      ws
    });

    expect(ws.sent).toEqual([expect.objectContaining({ type: 'ERROR' })]);
  });
});
