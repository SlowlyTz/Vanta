import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeWs } from './helpers.js';

vi.mock('../../../../src/server/config/session.js', () => ({ sessionMiddleware: (req, res, next) => next() }));

import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';
import { BUFFERING_GRACE_MS, MAX_WAIT_MS, RESUME_LEAD_MS } from '../../../../src/server/realtime/watch-party/waiting.js';

function setup() {
  const now = Date.now();
  const party = {
    id: 'wp', ownerUserId: 'owner', status: 'playing', positionMs: 60_000, lastServerTimeMs: now, seq: 1,
    members: new Map([
      ['owner', { userId: 'owner', username: 'Emilio', role: 'owner', connected: true }],
      ['lena', { userId: 'lena', username: 'Lena', role: 'viewer', connected: true }]
    ])
  };
  WatchPartyService.parties.set('wp', party);
  const hub = new WatchPartySocketHub();
  const ws = createFakeWs();
  hub.registerConnection('wp', 'owner', ws);
  const status = (userId, state, bufferedMs = 0) => hub.handleMessage({
    partyId: 'wp', user: { userId, username: userId }, message: { type: 'PLAYER_STATUS', state, bufferedMs }, ws: createFakeWs()
  });
  return { party, hub, ws, status };
}

describe('Auf Puffernde warten', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    WatchPartyService.parties.delete('wp');
  });

  it('pausiert die Party, wenn jemand länger als 3 s puffert, und nennt die Person', () => {
    const { party, ws, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS - 1);
    expect(party.waiting).toBeFalsy();
    vi.advanceTimersByTime(1);

    expect(party.status).toBe('paused');
    expect(party.waiting.userIds).toEqual(['lena']);
    expect(ws.sent).toContainEqual(expect.objectContaining({ type: 'TIMELINE', reason: 'wait', timeline: expect.objectContaining({ playing: false }) }));
    const update = ws.sent.filter(m => m.type === 'PARTY_UPDATED').at(-1);
    expect(update.party.waiting.members).toEqual([{ userId: 'lena', username: 'Lena' }]);
  });

  it('wartet nicht bei kurzen Hängern', () => {
    const { party, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(1000);
    status('lena', 'sync');
    vi.advanceTimersByTime(5000);
    expect(party.waiting).toBeFalsy();
    expect(party.status).toBe('playing');
  });

  it('läuft erst weiter, wenn genug gepuffert ist, und dann bei allen gleichzeitig', () => {
    const { party, ws, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);
    status('lena', 'paused', 1200);
    expect(party.waiting).toBeTruthy();

    status('lena', 'paused', 3500);
    expect(party.waiting).toBeNull();
    expect(party.status).toBe('playing');
    const resume = ws.sent.filter(m => m.type === 'TIMELINE').at(-1);
    expect(resume.reason).toBe('resume');
    expect(resume.timeline.anchorServerTimeMs - Date.now()).toBeGreaterThanOrEqual(RESUME_LEAD_MS - 5);
  });

  it('gibt nach 30 s auf und spielt ohne die Wartenden weiter', () => {
    const { party, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS + MAX_WAIT_MS);
    expect(party.waiting).toBeNull();
    expect(party.status).toBe('playing');
  });

  it('endet, wenn ein Admin selbst pausiert oder startet', () => {
    const { party, hub, ws, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);
    hub.handleMessage({ partyId: 'wp', user: { userId: 'owner', username: 'Emilio' }, message: { type: 'OWNER_PAUSE', positionMs: 61_000 }, ws });
    expect(party.waiting).toBeNull();
    expect(party.status).toBe('paused');
    expect(party.positionMs).toBe(61_000);
  });

  it('lässt nur den Gastgeber das Warten abschalten; Abschalten während des Wartens setzt fort', () => {
    const { party, hub, status } = setup();
    const toggle = (userId, enabled) => {
      const ws = createFakeWs();
      hub.handleMessage({ partyId: 'wp', user: { userId, username: userId }, message: { type: 'OWNER_SET_WAIT_FOR_BUFFERING', enabled }, ws });
      return ws;
    };
    party.members.get('lena').role = 'admin';
    const denied = toggle('lena', false);
    expect(denied.sent).toEqual([expect.objectContaining({ type: 'ERROR' })]);
    expect(party.waitForBuffering).toBeUndefined();

    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);
    expect(party.waiting).toBeTruthy();
    toggle('owner', false);
    expect(party.waitForBuffering).toBe(false);
    expect(party.waiting).toBeNull();
    expect(party.status).toBe('playing');

    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS * 2);
    expect(party.waiting).toBeFalsy();
  });
});
