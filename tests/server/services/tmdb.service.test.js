import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const dbState = { cachedRows: new Map(), runs: [] };

vi.mock('../../../src/server/config/env.js', () => ({
  default: {
    TMDB_API_KEY: 'test-key',
    JELLYFIN_BASE_URL: 'http://jellyfin.test'
  }
}));

vi.mock('../../../src/server/db/database.js', () => ({
  default: {
    prepare: (sql) => {
      if (sql.trim().startsWith('SELECT')) {
        // The real statement filters on tmdb_type, so honour it here too.
        return {
          get: (id, type) => {
            const row = dbState.cachedRows.get(id);
            if (!row) return undefined;
            return !type || (row.tmdb_type ?? row.media_type) === type ? row : undefined;
          }
        };
      }
      return { run: (...params) => dbState.runs.push({ sql, params }) };
    }
  }
}));

import { TmdbService, findTmdbYouTubeTrailer } from '../../../src/server/services/tmdb.service.js';

function jsonResponse(body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

function mockFetchByPath(map) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const parsed = url instanceof URL ? url : new URL(url);
    const key = `${parsed.pathname}?${parsed.searchParams.get('language') || ''}`;
    const body = map[key];
    if (body === undefined) {
      throw new Error(`Unhandled mocked fetch: ${key}`);
    }
    return jsonResponse(body);
  }));
}

describe('findTmdbYouTubeTrailer', () => {
  it('prefers a Trailer over a Teaser', () => {
    const videos = [
      { site: 'YouTube', key: 'teaser1', type: 'Teaser', name: 'Teaser' },
      { site: 'YouTube', key: 'trailer1', type: 'Trailer', name: 'Official Trailer' }
    ];

    expect(findTmdbYouTubeTrailer(videos)).toEqual({
      site: 'YouTube', key: 'trailer1', name: 'Official Trailer', type: 'Trailer'
    });
  });

  it('ignores non-YouTube videos and videos without a key', () => {
    const videos = [
      { site: 'Vimeo', key: 'v1', type: 'Trailer', name: 'Vimeo Trailer' },
      { site: 'YouTube', key: '', type: 'Trailer', name: 'No key' }
    ];

    expect(findTmdbYouTubeTrailer(videos)).toBeNull();
  });

  it('returns null for an empty or missing list', () => {
    expect(findTmdbYouTubeTrailer([])).toBeNull();
    expect(findTmdbYouTubeTrailer(undefined)).toBeNull();
  });
});

describe('TmdbService trailer integration', () => {
  beforeEach(() => {
    dbState.cachedRows.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches a de-DE YouTube trailer to freshly fetched movie details', async () => {
    mockFetchByPath({
      '/3/movie/501?de-DE': {
        id: 501, title: 'Movie 501', overview: '', poster_path: null, backdrop_path: null,
        release_date: '2024-01-01', vote_average: 7, vote_count: 10, runtime: 100
      },
      '/3/movie/501/credits?de-DE': { cast: [] },
      '/3/movie/501/videos?de-DE': { results: [{ site: 'YouTube', key: 'abc', type: 'Trailer', name: 'Trailer DE' }] }
    });

    const details = await TmdbService.getMovieDetails(501);

    expect(details.trailer).toEqual({ site: 'YouTube', key: 'abc', name: 'Trailer DE', type: 'Trailer' });
  });

  it('falls back to en-US videos when de-DE has no usable YouTube trailer', async () => {
    mockFetchByPath({
      '/3/movie/502?de-DE': { id: 502, title: 'Movie 502', release_date: '2023-01-01' },
      '/3/movie/502/credits?de-DE': { cast: [] },
      '/3/movie/502/videos?de-DE': { results: [] },
      '/3/movie/502/videos?en-US': { results: [{ site: 'YouTube', key: 'en-key', type: 'Trailer', name: 'Trailer EN' }] }
    });

    const details = await TmdbService.getMovieDetails(502);

    expect(details.trailer).toEqual({ site: 'YouTube', key: 'en-key', name: 'Trailer EN', type: 'Trailer' });
  });

  it('returns trailer: null when neither de-DE nor en-US has a usable trailer', async () => {
    mockFetchByPath({
      '/3/movie/504?de-DE': { id: 504, title: 'Movie 504', release_date: '2021-01-01' },
      '/3/movie/504/credits?de-DE': { cast: [] },
      '/3/movie/504/videos?de-DE': { results: [] },
      '/3/movie/504/videos?en-US': { results: [{ site: 'Vimeo', key: 'nope', type: 'Trailer' }] }
    });

    const details = await TmdbService.getMovieDetails(504);

    expect(details.trailer).toBeNull();
  });

  it('still resolves a trailer for a cached SQLite movie row that has no stored trailer data', async () => {
    dbState.cachedRows.set(503, {
      tmdb_id: 503, title: 'Cached Movie', overview: '', poster_path: null, backdrop_path: null,
      release_date: '2022-01-01', media_type: 'movie', score: 5, vote_count: 3, cached_at: Date.now()
    });

    mockFetchByPath({
      '/3/movie/503/videos?de-DE': { results: [{ site: 'YouTube', key: 'cached-trailer', type: 'Trailer', name: 'Cached Trailer' }] }
    });

    const details = await TmdbService.getMovieDetails(503);

    expect(details.title).toBe('Cached Movie');
    expect(details.trailer).toEqual({ site: 'YouTube', key: 'cached-trailer', name: 'Cached Trailer', type: 'Trailer' });
  });

  it('resolves a trailer for TV details via the /tv videos endpoint', async () => {
    mockFetchByPath({
      '/3/tv/601?de-DE': { id: 601, name: 'Series 601', first_air_date: '2020-05-01' },
      '/3/tv/601/credits?de-DE': { cast: [] },
      '/3/tv/601/videos?de-DE': { results: [{ site: 'YouTube', key: 'tv-key', type: 'Teaser', name: 'Teaser' }] }
    });

    const details = await TmdbService.getTvDetails(601);

    expect(details.trailer).toEqual({ site: 'YouTube', key: 'tv-key', name: 'Teaser', type: 'Teaser' });
  });
});

describe('TmdbService.getNowPlaying', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests /movie/now_playing with language=de-DE and the given region, mapping only movie fields', async () => {
    let requestedUrl = null;
    vi.stubGlobal('fetch', vi.fn((url) => {
      requestedUrl = url instanceof URL ? url : new URL(url);
      return jsonResponse({
        results: [
          { id: 701, title: 'Now Playing Movie', original_title: 'Now Playing Movie', release_date: '2026-07-01', popularity: 42.5, poster_path: '/x.jpg' }
        ]
      });
    }));

    const results = await TmdbService.getNowPlaying(60, 'DE');

    expect(requestedUrl.pathname).toBe('/3/movie/now_playing');
    expect(requestedUrl.searchParams.get('language')).toBe('de-DE');
    expect(requestedUrl.searchParams.get('region')).toBe('DE');
    expect(requestedUrl.searchParams.get('page')).toBe('1');

    expect(results).toEqual([{
      id: 701,
      title: 'Now Playing Movie',
      originalTitle: 'Now Playing Movie',
      mediaType: 'movie',
      releaseDate: '2026-07-01',
      popularity: 42.5
    }]);
  });

  it('respects the limit parameter', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      results: [
        { id: 1, title: 'A', release_date: '2026-01-01', popularity: 10 },
        { id: 2, title: 'B', release_date: '2026-01-02', popularity: 9 },
        { id: 3, title: 'C', release_date: '2026-01-03', popularity: 8 }
      ]
    })));

    const results = await TmdbService.getNowPlaying(2, 'AT');

    expect(results).toHaveLength(2);
  });
});

describe('TmdbService.getTvDetails', () => {
  beforeEach(() => {
    dbState.cachedRows.clear();
    dbState.runs.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ignores the seasonless tmdb_media row and fetches full details instead', async () => {
    dbState.cachedRows.set(602, {
      tmdb_id: 602, title: 'Cached Series', overview: '', poster_path: null, backdrop_path: null,
      first_air_date: '2020-05-01', media_type: 'tv', score: 5, vote_count: 3, cached_at: Date.now()
    });

    mockFetchByPath({
      '/3/tv/602?de-DE': {
        id: 602, name: 'Series 602', first_air_date: '2020-05-01',
        seasons: [{ season_number: 1, name: 'Staffel 1', episode_count: 8 }]
      },
      '/3/tv/602/credits?de-DE': { cast: [] },
      '/3/tv/602/videos?de-DE': { results: [] },
      '/3/tv/602/videos?en-US': { results: [] }
    });

    const details = await TmdbService.getTvDetails(602);

    expect(details.name).toBe('Series 602');
    expect(details.seasons).toEqual([{ season_number: 1, name: 'Staffel 1', episode_count: 8 }]);
  });

  it('returns an empty season list when TMDB reports none', async () => {
    mockFetchByPath({
      '/3/tv/603?de-DE': { id: 603, name: 'Series 603', first_air_date: '2019-01-01' },
      '/3/tv/603/credits?de-DE': { cast: [] },
      '/3/tv/603/videos?de-DE': { results: [] },
      '/3/tv/603/videos?en-US': { results: [] }
    });

    const details = await TmdbService.getTvDetails(603);

    expect(details.seasons).toEqual([]);
  });

  it('falls back to the cached row when TMDB is unreachable', async () => {
    dbState.cachedRows.set(610, {
      tmdb_id: 610, title: 'Cached Series', overview: 'aus dem Cache', poster_path: null,
      backdrop_path: null, first_air_date: '2018-03-01', media_type: 'tv', score: 5,
      vote_count: 3, cached_at: Date.now()
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503 })));

    const details = await TmdbService.getTvDetails(610);

    expect(details.title).toBe('Cached Series');
    expect(details.id).toBe(610);
    expect(details.media_type).toBe('tv');
    expect(details.seasons).toEqual([]);
  });

  it('propagates the error when TMDB is unreachable and nothing is cached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503 })));

    await expect(TmdbService.getTvDetails(611)).rejects.toThrow();
  });

  it('does not rewrite a tmdb_media row that a recent search already refreshed', async () => {
    dbState.cachedRows.set(612, {
      tmdb_id: 612, title: 'Series 612', media_type: 'tv', cached_at: Date.now()
    });
    dbState.runs.length = 0;

    mockFetchByPath({
      '/3/tv/612?de-DE': { id: 612, name: 'Series 612', seasons: [] },
      '/3/tv/612/credits?de-DE': { cast: [] },
      '/3/tv/612/videos?de-DE': { results: [] },
      '/3/tv/612/videos?en-US': { results: [] }
    });

    await TmdbService.getTvDetails(612);

    expect(dbState.runs).toHaveLength(0);
  });

  it('writes the tmdb_media row when none is cached yet', async () => {
    dbState.runs.length = 0;

    mockFetchByPath({
      '/3/tv/613?de-DE': { id: 613, name: 'Series 613', first_air_date: '2021-01-01', seasons: [] },
      '/3/tv/613/credits?de-DE': { cast: [] },
      '/3/tv/613/videos?de-DE': { results: [] },
      '/3/tv/613/videos?en-US': { results: [] }
    });

    await TmdbService.getTvDetails(613);

    expect(dbState.runs).toHaveLength(1);
    expect(dbState.runs[0].sql).toContain('tmdb_media');
    expect(dbState.runs[0].params[1]).toBe('Series 613');
  });

  // tmdb_media's primary key is the bare id, so without the type filter a series
  // row would answer a movie detail request under the same number.
  it('does not let a cached tv row answer a movie detail request for the same id', async () => {
    dbState.cachedRows.set(614, {
      tmdb_id: 614, title: 'Serie 614', media_type: 'tv', cached_at: Date.now()
    });

    mockFetchByPath({
      '/3/movie/614?de-DE': { id: 614, title: 'Film 614', release_date: '2015-01-01' },
      '/3/movie/614/credits?de-DE': { cast: [] },
      '/3/movie/614/videos?de-DE': { results: [] },
      '/3/movie/614/videos?en-US': { results: [] }
    });

    const details = await TmdbService.getMovieDetails(614);

    expect(details.title).toBe('Film 614');
  });

  it('serves a repeated lookup from memory instead of hitting TMDB again', async () => {
    mockFetchByPath({
      '/3/tv/604?de-DE': { id: 604, name: 'Series 604', seasons: [{ season_number: 1 }] },
      '/3/tv/604/credits?de-DE': { cast: [] },
      '/3/tv/604/videos?de-DE': { results: [{ site: 'YouTube', key: 'k', type: 'Trailer', name: 'T' }] }
    });

    await TmdbService.getTvDetails(604);
    const callsAfterFirst = fetch.mock.calls.length;
    const details = await TmdbService.getTvDetails(604);

    expect(fetch.mock.calls.length).toBe(callsAfterFirst);
    expect(details.seasons).toEqual([{ season_number: 1 }]);
  });
});

describe('TmdbService.getSeasonDetails', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests /tv/{id}/season/{n} in de-DE and returns its episodes', async () => {
    mockFetchByPath({
      '/3/tv/701/season/2?de-DE': {
        id: 4242, season_number: 2, name: 'Staffel 2',
        episodes: [
          { id: 1, episode_number: 1, name: 'Folge 1' },
          { id: 2, episode_number: 2, name: 'Folge 2' }
        ]
      }
    });

    const season = await TmdbService.getSeasonDetails(701, 2);

    expect(fetch.mock.calls[0][0].pathname).toBe('/3/tv/701/season/2');
    expect(season.season_number).toBe(2);
    expect(season.episodes).toHaveLength(2);
    expect(season.episodes[1]).toEqual({ id: 2, episode_number: 2, name: 'Folge 2' });
  });

  it('returns an empty episode list when TMDB sends none', async () => {
    mockFetchByPath({
      '/3/tv/702/season/1?de-DE': { id: 4243, season_number: 1, name: 'Staffel 1' }
    });

    const season = await TmdbService.getSeasonDetails(702, 1);

    expect(season.episodes).toEqual([]);
  });

  it('serves a repeated lookup from memory instead of hitting TMDB again', async () => {
    mockFetchByPath({
      '/3/tv/703/season/1?de-DE': { id: 4244, season_number: 1, episodes: [{ id: 9 }] }
    });

    await TmdbService.getSeasonDetails(703, 1);
    const season = await TmdbService.getSeasonDetails(703, 1);

    expect(fetch.mock.calls.length).toBe(1);
    expect(season.episodes).toEqual([{ id: 9 }]);
  });
});
