import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeWs, makeUser } from './helpers.js';
import { createNotification } from '../../../../src/server/realtime/watch-party/notifications.js';

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
  isPartyAdmin: vi.fn((party, userId) => party.ownerUserId === userId || party.members?.get?.(userId)?.role === 'admin')
}));

import { WatchPartyService, isPartyAdmin } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';

describe('WatchPartySocketHub · Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOverride = null;
  });

  it('erster Connect erzeugt member_joined für andere Teilnehmer', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'lobby',
      members: new Map([
        ['owner-1', { userId: 'owner-1', username: 'Alice', connected: false, hasConnectedOnce: false }],
        ['viewer-1', { userId: 'viewer-1', username: 'Bob', connected: false, hasConnectedOnce: false }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    const viewerWs = createFakeWs();
    hub.handleConnection({ ws: viewerWs, partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });

    expect(ownerWs.sent.some(m =>
      m.type === 'NOTIFICATION' && m.notification.type === 'member_joined' && m.notification.message.includes('Bob')
    )).toBe(true);
    expect(viewerWs.sent.some(m => m.type === 'NOTIFICATION')).toBe(false);
  });

  it('erneuter Connect nach Trennung erzeugt member_rejoined statt member_joined', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'playing',
      members: new Map([
        ['owner-1', { userId: 'owner-1', username: 'Alice', connected: true, hasConnectedOnce: true }],
        ['viewer-1', { userId: 'viewer-1', username: 'Bob', connected: false, hasConnectedOnce: true }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    const viewerWs = createFakeWs();
    hub.handleConnection({ ws: viewerWs, partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });

    const notification = ownerWs.sent.find(m => m.type === 'NOTIFICATION');
    expect(notification.notification.type).toBe('member_rejoined');
    expect(notification.notification.message).toBe('Bob ist beigetreten.');
    expect(notification.notification.message).not.toContain('wieder');
    expect(notification.notification.icon).toBe('member_joined');
  });

  it('zweiter Socket desselben Users erzeugt keine weitere Join-Notification', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'lobby',
      members: new Map([
        ['owner-1', { userId: 'owner-1', username: 'Alice', connected: false, hasConnectedOnce: false }],
        ['viewer-1', { userId: 'viewer-1', username: 'Bob', connected: false, hasConnectedOnce: false }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    WatchPartyService.setConnected.mockImplementation(({ userId, connected }) => {
      const member = party.members.get(userId);
      if (member) member.connected = connected;
    });

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    hub.handleConnection({ ws: createFakeWs(), partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });
    expect(ownerWs.sent.filter(m => m.type === 'NOTIFICATION').length).toBe(1);

    hub.handleConnection({ ws: createFakeWs(), partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });
    expect(ownerWs.sent.filter(m => m.type === 'NOTIFICATION').length).toBe(1);
  });

  it('letzter Socket-Close erzeugt member_left, ein weiterer offener Tab unterdrückt es', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1',
      ownerUserId: 'owner-1',
      status: 'playing',
      members: new Map([
        ['owner-1', { userId: 'owner-1', username: 'Alice', connected: true, hasConnectedOnce: true }],
        ['viewer-1', { userId: 'viewer-1', username: 'Bob', connected: true, hasConnectedOnce: true }]
      ])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    WatchPartyService.parties.set('party-1', party);
    WatchPartyService.setConnected.mockImplementation(({ userId, connected }) => {
      const member = party.members.get(userId);
      if (member) member.connected = connected;
    });

    const ownerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);

    const viewerWs1 = createFakeWs();
    hub.handleConnection({ ws: viewerWs1, partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });
    const viewerWs2 = createFakeWs();
    hub.handleConnection({ ws: viewerWs2, partyId: 'party-1', user: makeUser('viewer-1', { username: 'Bob' }) });

    ownerWs.sent = [];

    viewerWs1.listeners.close();
    expect(ownerWs.sent.some(m => m.type === 'NOTIFICATION' && m.notification.type === 'member_left')).toBe(false);

    viewerWs2.listeners.close();
    expect(ownerWs.sent.some(m => m.type === 'NOTIFICATION' && m.notification.type === 'member_left')).toBe(true);

    WatchPartyService.parties.delete('party-1');
  });

  it('OWNER_PAUSE erzeugt owner_pause Notification', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 1000, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ws = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ws);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_PAUSE', positionMs: 2000 }, ws });

    expect(viewerWs.sent.some(m => m.type === 'NOTIFICATION' && m.notification.type === 'owner_pause')).toBe(true);
    // The admin who paused does not get told that the admin paused.
    expect(ws.sent.some(m => m.type === 'NOTIFICATION')).toBe(false);
  });

  it('OWNER_SEEK erzeugt owner_seek Notification mit lesbarer Position', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ws = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ws);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 65_000 }, ws });

    const notification = viewerWs.sent.find(m => m.type === 'NOTIFICATION');
    expect(notification.notification.type).toBe('owner_seek');
    expect(notification.notification.message).toContain('1:05');
  });

  it('OWNER_SYNC erzeugt niemals eine Notification', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: 0 };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);

    const ws = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ws);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SYNC', positionMs: 500, playing: true }, ws });

    expect(ws.sent.some(m => m.type === 'NOTIFICATION')).toBe(false);
  });

  describe('Seek-Notification Throttle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('drosselt mehrere OWNER_SEEK Notifications innerhalb von 800ms, TIMELINE bleibt ungedrosselt', () => {
      const hub = new WatchPartySocketHub();
      const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: 0 };
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);

      const ownerWs = createFakeWs();
      const ws = createFakeWs();
      hub.registerConnection('party-1', 'owner-1', ownerWs);
      hub.registerConnection('party-1', 'viewer-1', ws);

      hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 1000 }, ws: ownerWs });
      vi.advanceTimersByTime(200);
      hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 2000 }, ws: ownerWs });

      expect(ws.sent.filter(m => m.type === 'TIMELINE').length).toBe(2);
      expect(ws.sent.filter(m => m.type === 'NOTIFICATION').length).toBe(1);
      expect(party.positionMs).toBe(2000);

      vi.advanceTimersByTime(800);
      hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 3000 }, ws: ownerWs });
      expect(ws.sent.filter(m => m.type === 'NOTIFICATION').length).toBe(2);
    });
  });

  it('nennt bei Play, Pause und Sprung den Namen und liefert den Auslöser mit', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1', ownerUserId: 'owner-1', status: 'paused', positionMs: 0, lastServerTimeMs: 0,
      members: new Map([['admin-1', { userId: 'admin-1', username: 'Lena', role: 'admin' }]])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    const adminWs = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'admin-1', adminWs);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('admin-1'), message: { type: 'OWNER_PLAY', positionMs: 0 }, ws: adminWs });
    hub.handleMessage({ partyId: 'party-1', user: makeUser('admin-1'), message: { type: 'OWNER_PAUSE', positionMs: 1000 }, ws: adminWs });
    hub.handleMessage({ partyId: 'party-1', user: makeUser('admin-1'), message: { type: 'OWNER_SEEK', positionMs: 754_000 }, ws: adminWs });

    const notifications = viewerWs.sent.filter(m => m.type === 'NOTIFICATION').map(m => m.notification);
    expect(notifications.map(n => n.message)).toEqual([
      'Lena hat die Wiedergabe gestartet.',
      'Lena hat pausiert.',
      'Lena ist zu 12:34 gesprungen.'
    ]);
    expect(notifications.every(n => n.actor?.userId === 'admin-1' && n.actor.username === 'Lena')).toBe(true);
  });

  it('schreibt „Jemand“, wenn kein Name bekannt ist, und hat dann keinen Auslöser', () => {
    const { notification } = createNotification('owner_pause');
    expect(notification.message).toBe('Jemand hat pausiert.');
    expect(notification.actor).toBeNull();
  });

  it('schickt die Sprungweite eines ±10-s-Sprungs mit Namen im TIMELINE und lässt die Benachrichtigung weg', () => {
    const hub = new WatchPartySocketHub();
    const party = {
      id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: Date.now(),
      members: new Map([['owner-1', { userId: 'owner-1', username: 'Lena', role: 'owner' }]])
    };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    const ownerWs = createFakeWs();
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'owner-1', ownerWs);
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 20_000, step: -20 }, ws: ownerWs });

    expect(viewerWs.sent).toEqual([
      expect.objectContaining({ type: 'TIMELINE', reason: 'seek', step: -20, actorName: 'Lena', actorUserId: 'owner-1' })
    ]);
  });

  it('verwirft unsinnige Sprungweiten', () => {
    const hub = new WatchPartySocketHub();
    const party = { id: 'party-1', ownerUserId: 'owner-1', status: 'playing', positionMs: 0, lastServerTimeMs: Date.now(), members: new Map() };
    WatchPartyService.getPartyOrThrow.mockReturnValue(party);
    const viewerWs = createFakeWs();
    hub.registerConnection('party-1', 'viewer-1', viewerWs);

    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 5_000, step: 'x' }, ws: createFakeWs() });
    hub.handleMessage({ partyId: 'party-1', user: makeUser('owner-1'), message: { type: 'OWNER_SEEK', positionMs: 5_000, step: 99_999 }, ws: createFakeWs() });

    viewerWs.sent.filter(m => m.type === 'TIMELINE').forEach(m => expect(m.step).toBeUndefined());
  });
});
