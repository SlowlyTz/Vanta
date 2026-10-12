import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));
const { createUserDataService, summarizeUserData } = await import('../../../src/server/services/user-data.service.js');

describe('summarizeUserData', () => {
  it('reports a film\'s progress and the watched state', () => {
    expect(summarizeUserData({ Type: 'Movie', RunTimeTicks: 100, UserData: { PlaybackPositionTicks: 25 } }))
      .toEqual({ played: false, progress: 0.25, next: null, seriesProgress: null });
    expect(summarizeUserData({ Type: 'Movie', RunTimeTicks: 100, UserData: { Played: true, PlaybackPositionTicks: 0 } }).played).toBe(true);
  });

  it('gives a started series its next episode and share watched', () => {
    const next = new Map([['s1', { ParentIndexNumber: 2, IndexNumber: 4, UserData: {} }]]);
    expect(summarizeUserData({ Id: 's1', Type: 'Series', RecursiveItemCount: 10, UserData: { UnplayedItemCount: 6 } }, next))
      .toEqual({ played: false, progress: null, next: 'S2 E4', seriesProgress: 0.4 });
  });

  it('leaves an unstarted series without "next" even if Jellyfin names one', () => {
    const next = new Map([['s1', { ParentIndexNumber: 1, IndexNumber: 1, UserData: {} }]]);
    expect(summarizeUserData({ Id: 's1', Type: 'Series', RecursiveItemCount: 8, UserData: { UnplayedItemCount: 8 } }, next).next).toBeNull();
  });
});

describe('UserDataService', () => {
  it('asks Jellyfin once per minute and only for what is not cached', async () => {
    let time = 0;
    const fetchJson = vi.fn(async (path, { query }) => {
      if (path === '/Shows/NextUp') return { Items: [{ SeriesId: 's1', ParentIndexNumber: 1, IndexNumber: 2, UserData: { LastPlayedDate: 'x' } }] };
      return { Items: query.Ids.split(',').map(Id => (Id.startsWith('s') ? { Id, Type: 'Series', RecursiveItemCount: 4, UserData: { UnplayedItemCount: 4 } } : { Id, Type: 'Movie', RunTimeTicks: 10, UserData: { PlaybackPositionTicks: 5 } })) };
    });
    const service = createUserDataService({ fetchJson, now: () => time });

    const first = await service.forItems('u1', 't', ['m1', 's1', 'm1']);
    expect(first).toEqual({
      m1: { played: false, progress: 0.5, next: null, seriesProgress: null },
      s1: { played: false, progress: null, next: 'S1 E2', seriesProgress: null }
    });
    expect(fetchJson).toHaveBeenCalledTimes(2);

    await service.forItems('u1', 't', ['m1', 'm2']);
    expect(fetchJson).toHaveBeenLastCalledWith('/Users/u1/Items', expect.objectContaining({ query: expect.objectContaining({ Ids: 'm2' }) }));

    time += 61_000;
    service.forget('u1');
    await service.forItems('u1', 't', ['m1']);
    expect(fetchJson).toHaveBeenCalledTimes(4);
  });
});
