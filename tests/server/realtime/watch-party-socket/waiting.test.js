import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeWs } from './helpers.js';

vi.mock('../../../../src/server/config/session.js', () => ({ sessionMiddleware: (req, res, next) => next() }));

import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';
import { BUFFERING_GRACE_MS, DISCONNECT_GRACE_MS, RESUME_LEAD_MS, WAIT_PAUSE_LEAD_MS } from '../../../../src/server/realtime/watch-party/waiting.js';

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

  it('wartet ohne Zeitlimit, bis die Person bereit ist', () => {
    const { party, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS + 10 * 60_000);
    expect(party.waiting.userIds).toEqual(['lena']);
    expect(party.status).toBe('paused');
  });

  it('hält ein Stück vor der Serverposition an, damit niemand zurückspringt', () => {
    const { party, status } = setup();
    party.lastServerTimeMs = Date.now();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);
    expect(party.positionMs).toBe(60_000 + BUFFERING_GRACE_MS + WAIT_PAUSE_LEAD_MS);
  });

  it('wartet danach auch auf alle, die die Pausenstelle noch laden', () => {
    const { party, status } = setup();
    party.members.set('max', { userId: 'max', username: 'Max', role: 'viewer', connected: true });
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);
    status('max', 'buffering', 500);

    status('lena', 'paused', 3500);
    expect(party.waiting.userIds).toEqual(['max']);
    expect(party.status).toBe('paused');

    status('max', 'paused', 4000);
    expect(party.waiting).toBeNull();
    expect(party.status).toBe('playing');
  });

  it('gibt Wartenden, die rausfliegen, 20 s für die Rückkehr', () => {
    const { party, hub, status } = setup();
    status('lena', 'buffering');
    vi.advanceTimersByTime(BUFFERING_GRACE_MS);

    const lenaWs = createFakeWs();
    hub.handleConnection({ ws: lenaWs, partyId: 'wp', user: { userId: 'lena', username: 'Lena' } });
    lenaWs.listeners.close();
    vi.advanceTimersByTime(DISCONNECT_GRACE_MS - 1);
    expect(party.waiting.userIds).toEqual(['lena']);

    // Back in time: still waited for until the video has loaded.
    const again = createFakeWs();
    hub.handleConnection({ ws: again, partyId: 'wp', user: { userId: 'lena', username: 'Lena' } });
    vi.advanceTimersByTime(DISCONNECT_GRACE_MS);
    expect(party.waiting.userIds).toEqual(['lena']);

    again.listeners.close();
    vi.advanceTimersByTime(DISCONNECT_GRACE_MS);
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
