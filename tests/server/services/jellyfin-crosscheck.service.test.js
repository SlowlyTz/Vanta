import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    search: vi.fn()
  }
}));

vi.mock('../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: {
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

import { LibraryService } from '../../../src/server/services/jellyfin/library.service.js';
import { ItemsService } from '../../../src/server/services/jellyfin/items.service.js';
import { JellyfinCrossCheck } from '../../../src/server/services/jellyfin-crosscheck.service.js';

const movieItem = (overrides = {}) => ({
  Id: 'jf-movie',
  Name: 'Dune',
  Type: 'Movie',
  ProductionYear: 2021,
  ProviderIds: {},
  ...overrides
});

const seriesItem = (overrides = {}) => ({
  Id: 'jf-series',
  Name: 'Dune',
  Type: 'Series',
  ProductionYear: 2000,
  ProviderIds: {},
  ...overrides
});

describe('JellyfinCrossCheck.checkMediaExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not report the series as the movie: only items of the requested type count', async () => {
    LibraryService.search.mockResolvedValue([seriesItem({ ProductionYear: 2021 })]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      release_date: '2021-09-15'
    });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
  });

  // Both fixtures share a year so nothing but Type can pick the winner.
  it('picks the Movie when the library holds a movie and a series of the same name and year', async () => {
    LibraryService.search.mockResolvedValue([seriesItem({ ProductionYear: 2021 }), movieItem()]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      release_date: '2021-09-15'
    });

    expect(result.exists).toBe(true);
    expect(result.jellyfinItemId).toBe('jf-movie');
  });

  it('picks the Series for a tv request, taking the type from the caller argument', async () => {
    LibraryService.search.mockResolvedValue([movieItem(), seriesItem({ ProductionYear: 2021 })]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune'
    }, 'tv');

    expect(result.exists).toBe(true);
    expect(result.jellyfinItemId).toBe('jf-series');
  });

  it('reads the type from tmdb_type when neither the argument nor media_type carries it', async () => {
    LibraryService.search.mockResolvedValue([movieItem(), seriesItem({ ProductionYear: 2021 })]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune',
      tmdb_type: 'tv'
    });

    expect(result.jellyfinItemId).toBe('jf-series');
  });

  it('ignores an unmapped type argument and falls through to the payload', async () => {
    LibraryService.search.mockResolvedValue([movieItem(), seriesItem({ ProductionYear: 2021 })]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune',
      media_type: 'tv'
    }, 'series');

    expect(result.jellyfinItemId).toBe('jf-series');
  });

  // Without a type a movie and a series of the same name are indistinguishable,
  // which is exactly the confusion the filter exists to prevent.
  it('fails closed and never searches when no type can be resolved', async () => {
    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', { id: 1, title: 'Dune' });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
    expect(LibraryService.search).not.toHaveBeenCalled();
  });

  it('matches by TMDB id before falling back to the title', async () => {
    LibraryService.search.mockResolvedValue([
      movieItem({ Id: 'jf-wrong', ProviderIds: { Tmdb: '999' } }),
      movieItem({ Id: 'jf-right', Name: 'Dune - Der Wüstenplanet', ProviderIds: { Tmdb: '438631' } })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie'
    });

    expect(result.jellyfinItemId).toBe('jf-right');
  });

  it('ignores an empty TMDB id instead of matching items that carry none', async () => {
    LibraryService.search.mockResolvedValue([movieItem({ Id: 'jf-other', Name: 'Ganz anderer Film' })]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: '',
      title: 'Dune',
      media_type: 'movie'
    });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
  });

  it('matches by IMDb id when no item carries the TMDB id, regardless of case', async () => {
    LibraryService.search.mockResolvedValue([
      movieItem({ Id: 'jf-wrong', ProviderIds: { Tmdb: '999' } }),
      movieItem({ Id: 'jf-imdb', Name: 'Anderer Titel', ProviderIds: { Imdb: 'TT1160419' } })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      imdb_id: 'tt1160419'
    });

    expect(result.jellyfinItemId).toBe('jf-imdb');
  });

  it('reads the IMDb id from external_ids as well', async () => {
    LibraryService.search.mockResolvedValue([
      movieItem({ Id: 'jf-imdb', Name: 'Anderer Titel', ProviderIds: { Imdb: 'tt1160419' } })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      external_ids: { imdb_id: 'tt1160419' }
    });

    expect(result.jellyfinItemId).toBe('jf-imdb');
  });

  it('falls back to normalized title plus release year when no provider ids match', async () => {
    LibraryService.search.mockResolvedValue([
      seriesItem({ Id: 'jf-2000', PremiereDate: '2000-12-03T00:00:00.0000000Z' }),
      seriesItem({ Id: 'jf-2021', Name: '  DUNE   ', PremiereDate: '2021-10-03T00:00:00.0000000Z' })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune',
      media_type: 'tv',
      first_air_date: '2021-10-03'
    });

    expect(result.jellyfinItemId).toBe('jf-2021');
  });

  // Regional premiere dates and UTC storage routinely shift the year by one.
  it('accepts a premiere date that is one year off', async () => {
    LibraryService.search.mockResolvedValue([
      seriesItem({ Id: 'jf-2020', PremiereDate: '2020-12-31T23:00:00.0000000Z' })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune',
      media_type: 'tv',
      first_air_date: '2021-01-01'
    });

    expect(result.jellyfinItemId).toBe('jf-2020');
  });

  // A same-title item with a known, conflicting year is a remake or a namesake,
  // not the requested work — reporting it available would hide it from requests.
  it('rejects a same-title item whose year clearly conflicts', async () => {
    LibraryService.search.mockResolvedValue([
      movieItem({ Id: 'jf-1984', ProductionYear: 1984, ProviderIds: { Tmdb: '841' } })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      release_date: '2021-09-15'
    });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
  });

  it('still accepts a same-title item whose year is unknown', async () => {
    LibraryService.search.mockResolvedValue([
      movieItem({ Id: 'jf-1984', ProductionYear: 1984 }),
      movieItem({ Id: 'jf-unknown', ProductionYear: null })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie',
      release_date: '2021-09-15'
    });

    expect(result.jellyfinItemId).toBe('jf-unknown');
  });

  it('takes the first title match when the TMDB release year is unknown', async () => {
    LibraryService.search.mockResolvedValue([
      seriesItem({ Id: 'jf-first', ProductionYear: 1984 }),
      seriesItem({ Id: 'jf-second', ProductionYear: 2021 })
    ]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 12345,
      name: 'Dune',
      media_type: 'tv'
    });

    expect(result.jellyfinItemId).toBe('jf-first');
  });

  it('returns the matched item as jellyfinItems together with its jellyfinItemId', async () => {
    const item = movieItem({ Id: 'jf-1', ProviderIds: { Tmdb: '438631' } });
    LibraryService.search.mockResolvedValue([item]);

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie'
    });

    expect(result).toEqual({ exists: true, jellyfinItems: [item], jellyfinItemId: 'jf-1' });
  });

  it('skips the search entirely for media without a title', async () => {
    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', { id: 1, media_type: 'movie' });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
    expect(LibraryService.search).not.toHaveBeenCalled();
  });

  it('logs and reports no match when the Jellyfin search fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    LibraryService.search.mockRejectedValue(new Error('jellyfin down'));

    const result = await JellyfinCrossCheck.checkMediaExists('u1', 't1', {
      id: 438631,
      title: 'Dune',
      media_type: 'movie'
    });

    expect(result).toEqual({ exists: false, jellyfinItems: [], jellyfinItemId: null });
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check "Dune"'),
      'jellyfin down'
    );
  });
});

describe('JellyfinCrossCheck.checkSeriesSeasons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No episode list: a present season counts as complete, as before.
    ItemsService.getEpisodes.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns one entry per TMDB season instead of an empty list', async () => {
    ItemsService.getSeasons.mockResolvedValue([
      { Id: 'jf-s1', IndexNumber: 1 },
      { Id: 'jf-s2', IndexNumber: 2 }
    ]);

    const result = await JellyfinCrossCheck.checkSeriesSeasons('u1', 't1', 'series-1', [
      { season_number: 1, name: 'Staffel 1', episode_count: 10 },
      { season_number: 2, name: 'Staffel 2', episode_count: 8 },
      { season_number: 3, name: 'Staffel 3', episode_count: 6 }
    ]);

    expect(ItemsService.getSeasons).toHaveBeenCalledWith('u1', 't1', 'series-1');
    expect(result).toEqual([
      { season_number: 1, name: 'Staffel 1', exists: true, complete: true, available_episodes: [], jellyfin_season_id: 'jf-s1', episode_count: 10, requestable: false },
      { season_number: 2, name: 'Staffel 2', exists: true, complete: true, available_episodes: [], jellyfin_season_id: 'jf-s2', episode_count: 8, requestable: false },
      { season_number: 3, name: 'Staffel 3', exists: false, complete: false, available_episodes: [], jellyfin_season_id: null, episode_count: 6, requestable: true }
    ]);
  });

  it('keeps a season Jellyfin has only in part requestable and names its episodes', async () => {
    ItemsService.getSeasons.mockResolvedValue([{ Id: 'jf-s1', IndexNumber: 1 }, { Id: 'jf-s2', IndexNumber: 2 }]);
    ItemsService.getEpisodes.mockResolvedValue([
      { ParentIndexNumber: 1, IndexNumber: 1 },
      { ParentIndexNumber: 1, IndexNumber: 2, IndexNumberEnd: 3 },
      { ParentIndexNumber: 2, IndexNumber: 1 },
      { ParentIndexNumber: 2, IndexNumber: 4 }
    ]);

    const [first, second] = await JellyfinCrossCheck.checkSeriesSeasons('u1', 't1', 'series-1', [
      { season_number: 1, name: 'Staffel 1', episode_count: 3 },
      { season_number: 2, name: 'Staffel 2', episode_count: 8 }
    ]);

    expect(first).toMatchObject({ exists: true, complete: true, available_episodes: [1, 2, 3], requestable: false });
    expect(second).toMatchObject({ exists: true, complete: false, available_episodes: [1, 4], requestable: true });
  });

  it('reports the real presence of season 0 but never marks it requestable', async () => {
    ItemsService.getSeasons.mockResolvedValue([{ Id: 'jf-s0', IndexNumber: 0 }]);

    const result = await JellyfinCrossCheck.checkSeriesSeasons('u1', 't1', 'series-1', [
      { season_number: 0, name: 'Specials', episode_count: 4 }
    ]);

    expect(result).toEqual([
      {
        season_number: 0,
        name: 'Specials',
        exists: true,
        complete: true,
        available_episodes: [],
        jellyfin_season_id: 'jf-s0',
        episode_count: 4,
        requestable: false,
        reason: 'special'
      }
    ]);
  });

  it('keeps specials unrequestable even when they are missing from the library', async () => {
    ItemsService.getSeasons.mockResolvedValue([]);

    const [special] = await JellyfinCrossCheck.checkSeriesSeasons('u1', 't1', 'series-1', [
      { season_number: 0, name: 'Specials', episode_count: 4 }
    ]);

    expect(special.exists).toBe(false);
    expect(special.requestable).toBe(false);
    expect(special.jellyfin_season_id).toBeNull();
  });

  it('logs and returns an empty list when the season lookup fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    ItemsService.getSeasons.mockRejectedValue(new Error('jellyfin down'));

    const result = await JellyfinCrossCheck.checkSeriesSeasons('u1', 't1', 'series-1', [
      { season_number: 1, name: 'Staffel 1', episode_count: 10 }
    ]);

    expect(result).toEqual([]);
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check seasons of series-1'),
      'jellyfin down'
    );
  });
});
