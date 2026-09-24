import { describe, it, expect } from 'vitest';
import {
  getEffectivePosition,
  getSyncLeaderUserId,
  resolveAnchorTime,
  serializeTimeline,
  setTimeline
} from '../../../../src/server/services/watch-party/helpers.js';

describe('Watch-Party-Zeitleiste', () => {
  it('erhöht seq bei jeder Änderung und setzt Status und Anker', () => {
    const party = { status: 'paused', positionMs: 0, lastServerTimeMs: 0 };

    setTimeline(party, { positionMs: 1500, playing: true, anchorServerTimeMs: 1000 });
    expect(party).toMatchObject({ status: 'playing', positionMs: 1500, lastServerTimeMs: 1000, seq: 1 });

    setTimeline(party, { positionMs: -20, anchorServerTimeMs: 2000 });
    expect(party).toMatchObject({ status: 'playing', positionMs: 0, lastServerTimeMs: 2000, seq: 2 });
  });

  it('serialisiert die Zeitleiste für die Clients', () => {
    const party = { status: 'playing', positionMs: 4000, lastServerTimeMs: 99, seq: 7 };
    expect(serializeTimeline(party)).toEqual({ positionMs: 4000, playing: true, anchorServerTimeMs: 99, seq: 7 });
    expect(serializeTimeline({ status: 'paused', positionMs: 0, lastServerTimeMs: 1 })).toMatchObject({ playing: false, seq: 0 });
    // The countdown's timeline already runs, from its anchor at the start.
    expect(serializeTimeline({ status: 'countdown', positionMs: 0, lastServerTimeMs: 1 })).toMatchObject({ playing: true });
  });

  it('übernimmt plausible Zeitstempel der Clients und verwirft kaputte', () => {
    const now = 100_000;
    expect(resolveAnchorTime(now - 80, now)).toBe(now - 80);
    expect(resolveAnchorTime(now + 100, now)).toBe(now);
    expect(resolveAnchorTime(now + 10_000, now)).toBe(now);
    expect(resolveAnchorTime(now - 60_000, now)).toBe(now);
    expect(resolveAnchorTime(undefined, now)).toBe(now);
  });

  it('läuft vor dem Anker nicht rückwärts', () => {
    const party = { status: 'playing', positionMs: 5000, lastServerTimeMs: 20_000 };
    expect(getEffectivePosition(party, 18_000)).toBe(5000);
    expect(getEffectivePosition(party, 21_000)).toBe(6000);
  });
});

describe('getSyncLeaderUserId', () => {
  const party = members => ({ ownerUserId: 'owner', members: new Map(members.map(member => [member.userId, member])) });

  it('wählt den Owner, solange er verbunden ist', () => {
    expect(getSyncLeaderUserId(party([
      { userId: 'owner', role: 'owner', connected: true },
      { userId: 'a', role: 'admin', connected: true, joinedAt: 1 }
    ]))).toBe('owner');
  });

  it('fällt auf den am längsten dabei gewesenen verbundenen Admin zurück', () => {
    expect(getSyncLeaderUserId(party([
      { userId: 'owner', role: 'owner', connected: false },
      { userId: 'late', role: 'admin', connected: true, joinedAt: 9 },
      { userId: 'early', role: 'admin', connected: true, joinedAt: 2 },
      { userId: 'gone', role: 'admin', connected: false, joinedAt: 1 },
      { userId: 'v', role: 'viewer', connected: true, joinedAt: 0 }
    ]))).toBe('early');
  });

  it('liefert null ohne verbundene Admins', () => {
    expect(getSyncLeaderUserId(party([{ userId: 'owner', role: 'owner', connected: false }]))).toBeNull();
    expect(getSyncLeaderUserId({ ownerUserId: 'x' })).toBeNull();
  });
});
