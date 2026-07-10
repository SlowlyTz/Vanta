import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const dbState = { cachedRows: new Map() };

vi.mock('../config/env.js', () => ({
  default: {
    TMDB_API_KEY: 'test-key',
    JELLYFIN_BASE_URL: 'http://jellyfin.test'
  }
}));

vi.mock('../db/database.js', () => ({
  default: {
    prepare: (sql) => {
      if (sql.trim().startsWith('SELECT')) {
        return { get: (id) => dbState.cachedRows.get(id) };
      }
      return { run: vi.fn() };
    }
  }
}));

import { TmdbService, findTmdbYouTubeTrailer } from './tmdb.service.js';

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
