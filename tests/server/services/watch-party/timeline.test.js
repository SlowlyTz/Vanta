import { describe, it, expect } from 'vitest';
import {
  createItemSnapshot,
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

describe('createItemSnapshot', () => {
  it('nimmt für eine Folge Backdrop und Logo der Serie und merkt sich Staffel und Folge', () => {
    const episode = {
      Id: 'ep-3', Type: 'Episode', Name: 'Pilot', SeriesName: 'Dark', ParentIndexNumber: 1, IndexNumber: 3,
      ParentBackdropItemId: 'series-1', ParentBackdropImageTags: ['bd'], ParentLogoItemId: 'series-1', ParentLogoImageTag: 'lg'
    };
    const snapshot = createItemSnapshot(episode, { Id: 'series-1', Name: 'Dark' });
    expect(snapshot).toMatchObject({
      name: 'Pilot',
      seriesName: 'Dark',
      seasonNumber: 1,
      episodeNumber: 3,
      backdrop: { id: 'series-1', tag: 'bd' },
      logo: { id: 'series-1', tag: 'lg' }
    });
  });

  it('nutzt die eigenen Bilder eines Films und kommt ohne Bilder aus', () => {
    const movie = { Id: 'm-1', Type: 'Movie', Name: 'Heat', BackdropImageTags: ['b1'], ImageTags: { Logo: 'l1' } };
    expect(createItemSnapshot(movie, movie)).toMatchObject({ backdrop: { id: 'm-1', tag: 'b1' }, logo: { id: 'm-1', tag: 'l1' }, seasonNumber: null });
    expect(createItemSnapshot({ Id: 'x', Type: 'Movie', Name: 'X' }, { Id: 'x' })).toMatchObject({ backdrop: null, logo: null });
  });
});

describe('Player-Zustand der Mitglieder', () => {
  it('speichert nur bekannte Zustände und begrenzt die Abweichung', async () => {
    const { WatchPartyService } = await import('../../../../src/server/services/watch-party.service.js');
    const party = {
      id: 'p-status',
      members: new Map([['u1', { userId: 'u1', username: 'Lena', connected: true }], ['u2', { userId: 'u2', username: 'Jo', connected: false, playbackState: 'sync', driftMs: 5 }]])
    };
    WatchPartyService.parties.set('p-status', party);
    WatchPartyService.setPlaybackStatus({ partyId: 'p-status', userId: 'u1', state: 'buffering', driftMs: 99_999_999 });
    expect(party.members.get('u1')).toMatchObject({ playbackState: 'buffering', driftMs: 600_000 });
    WatchPartyService.setPlaybackStatus({ partyId: 'p-status', userId: 'u1', state: 'hacked', driftMs: 'x' });
    expect(party.members.get('u1')).toMatchObject({ playbackState: null, driftMs: null });

    expect(WatchPartyService.serializePresence(party)).toEqual([
      { userId: 'u1', connected: true, playbackState: null, driftMs: null },
      { userId: 'u2', connected: false, playbackState: null, driftMs: null }
    ]);
    WatchPartyService.parties.delete('p-status');
  });
});
