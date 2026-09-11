import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbState = vi.hoisted(() => ({
  blocking: [],
  requestById: null,
  cachedMedia: null,
  inserts: [],
  insertSql: '',
  statusUpdates: [],
  lastBlockingSql: '',
  lastBlockingParams: []
}));

// banned.json lives behind the real fs module; the in-memory stand-in lets the tests
// watch the cache and the write-invalidation without touching the disk.
const INITIAL_BANNED = JSON.stringify({
  movies: [{ name: 'Alien', releaseYear: '1979', tmdbId: 348 }],
  series: []
});

const fsState = vi.hoisted(() => ({
  banned: JSON.stringify({ movies: [{ name: 'Alien', releaseYear: '1979', tmdbId: 348 }], series: [] })
}));

vi.mock('fs', () => {
  const isBannedFile = (path) => String(path).endsWith('banned.json');
  return {
    default: {
      existsSync: vi.fn((path) => (isBannedFile(path) ? fsState.banned !== null : true)),
      readFileSync: vi.fn(() => fsState.banned),
      writeFileSync: vi.fn((path, data) => { fsState.banned = data; }),
      mkdirSync: vi.fn()
    }
  };
});

// Reads the status predicate out of the statement instead of restating it, so a
// change to the WHERE clause is visible in the test outcomes.
function statusPassesWhereClause(sql, status) {
  const excluded = sql.match(/status\s*!=\s*'([^']+)'/);
  if (excluded) return status !== excluded[1];

  const allowed = sql.match(/status\s+IN\s*\(([^)]+)\)/i);
  if (allowed) return allowed[1].split(',').map(part => part.trim().replace(/'/g, '')).includes(status);

  return true;
}

vi.mock('../../../src/server/db/database.js', () => ({
  default: {
    prepare: (sql) => ({
      run: (...params) => {
        if (sql.includes('INSERT INTO requests')) {
          dbState.inserts.push(params);
          dbState.insertSql = sql;
        }
        if (sql.includes('UPDATE requests SET status')) dbState.statusUpdates.push(params);
        return { changes: 1, lastInsertRowid: 1 };
      },
      get: () => {
        if (sql.includes('FROM tmdb_media')) return dbState.cachedMedia;
        if (sql.includes('FROM requests WHERE id')) return dbState.requestById;
        return undefined;
      },
      all: (...params) => {
        if (!sql.includes('FROM requests')) return [];
        dbState.lastBlockingSql = sql;
        dbState.lastBlockingParams = params;

        const [tmdbId, tmdbType] = params;
        return dbState.blocking.filter(row =>
          (row.tmdb_id === undefined || row.tmdb_id === tmdbId)
          && (row.tmdb_type === undefined || row.tmdb_type === tmdbType)
          && statusPassesWhereClause(sql, row.status || 'pending')
        );
      }
    })
  }
}));

vi.mock('../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: {
    getMovieDetails: vi.fn(),
    getTvDetails: vi.fn()
  }
}));

vi.mock('../../../src/server/services/jellyfin-crosscheck.service.js', () => ({
  JellyfinCrossCheck: {
    checkMediaExists: vi.fn(),
    checkSeriesSeasons: vi.fn()
  }
}));

import fs from 'fs';
import { TmdbService } from '../../../src/server/services/tmdb.service.js';
import { JellyfinCrossCheck } from '../../../src/server/services/jellyfin-crosscheck.service.js';
import { RequestsService } from '../../../src/server/services/requests.service.js';

const TV_DETAILS = {
  id: 70523,
  name: 'Dark',
  media_type: 'tv',
  poster_path: '/dark.jpg',
  seasons: [
    { season_number: 0, name: 'Specials', episode_count: 2 },
    { season_number: 1, name: 'Staffel 1', episode_count: 10 },
    { season_number: 2, name: 'Staffel 2', episode_count: 8 }
  ]
};

// Reads the column list and the VALUES list out of the real statement and walks
// them together, so a column added without a placeholder — or a bind in the
// wrong order — shows up here instead of silently landing in the wrong column.
const insertedRow = () => {
  const [, columnList, valueList] = dbState.insertSql
    .match(/INSERT INTO requests\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);

  const columns = columnList.split(',').map(column => column.trim());
  const values = valueList.split(',').map(value => value.trim());
  expect(columns).toHaveLength(values.length);

  const bound = [...dbState.inserts[0]];
  const row = {};
  values.forEach((value, index) => {
    row[columns[index]] = value === '?' ? bound.shift() : value.replace(/^'|'$/g, '');
  });

  expect(bound).toHaveLength(0);
  return row;
};

beforeEach(() => {
  vi.clearAllMocks();
  dbState.blocking = [];
  dbState.requestById = null;
  dbState.cachedMedia = null;
  dbState.inserts = [];
  dbState.insertSql = '';
  dbState.statusUpdates = [];
  dbState.lastBlockingParams = [];
  fsState.banned = INITIAL_BANNED;
});

describe('RequestsService.exists (duplicate rule)', () => {
  const openRow = (request_scope, season_number = null, episode_number = null) =>
    ({ request_scope, season_number, episode_number });

  // [what is already open, what is being requested, blocked?]
  const cases = [
    ['an open "all" row', [openRow('all')], { scope: 'all' }, true],
    ['an open "all" row', [openRow('all')], { scope: 'season', seasonNumber: 2 }, true],
    ['an open "all" row', [openRow('all')], { scope: 'episode', seasonNumber: 2, episodeNumber: 5 }, true],
    ['an open season 2', [openRow('season', 2)], { scope: 'season', seasonNumber: 2 }, true],
    ['an open season 2', [openRow('season', 2)], { scope: 'season', seasonNumber: 3 }, false],
    ['an open season 2', [openRow('season', 2)], { scope: 'episode', seasonNumber: 2, episodeNumber: 5 }, true],
    ['an open season 2', [openRow('season', 2)], { scope: 'episode', seasonNumber: 3, episodeNumber: 5 }, false],
    ['an open season 2', [openRow('season', 2)], { scope: 'all' }, true],
    ['an open S02E05', [openRow('episode', 2, 5)], { scope: 'episode', seasonNumber: 2, episodeNumber: 5 }, true],
    ['an open S02E05', [openRow('episode', 2, 5)], { scope: 'episode', seasonNumber: 2, episodeNumber: 6 }, false],
    ['an open S02E05', [openRow('episode', 2, 5)], { scope: 'episode', seasonNumber: 3, episodeNumber: 5 }, false],
    ['an open S02E05', [openRow('episode', 2, 5)], { scope: 'season', seasonNumber: 2 }, false],
    ['an open S02E05', [openRow('episode', 2, 5)], { scope: 'all' }, true],
    ['nothing open', [], { scope: 'all' }, false],
    ['several open seasons', [openRow('season', 1), openRow('season', 2)], { scope: 'season', seasonNumber: 2 }, true]
  ];

  for (const [existing, rows, selection, expected] of cases) {
    const label = selection.scope === 'all'
      ? 'the whole title'
      : selection.scope === 'season'
        ? `season ${selection.seasonNumber}`
        : `S${selection.seasonNumber}E${selection.episodeNumber}`;

    it(`${expected ? 'blocks' : 'allows'} ${label} with ${existing}`, async () => {
      dbState.blocking = rows;
      expect(await RequestsService.exists(70523, 'tv', selection)).toBe(expected);
    });
  }

  it('answers for the whole title when no selection is passed', async () => {
    dbState.blocking = [];
    expect(await RequestsService.exists(70523, 'tv')).toBe(false);

    dbState.blocking = [openRow('season', 2)];
    expect(await RequestsService.exists(70523, 'tv')).toBe(true);
  });

  it('treats a legacy row without a scope as a whole-title request', async () => {
    dbState.blocking = [{ request_scope: null, season_number: null, episode_number: null }];
    expect(await RequestsService.exists(70523, 'tv', { scope: 'season', seasonNumber: 1 })).toBe(true);
  });

  it('asks only about the requested title', async () => {
    dbState.blocking = [{ ...openRow('all'), tmdb_id: 999, tmdb_type: 'tv' }];

    expect(await RequestsService.exists(70523, 'tv')).toBe(false);
    expect(dbState.lastBlockingParams).toEqual([70523, 'tv']);
  });

  it('does not let a rejected row block, but an imported one still does', async () => {
    dbState.blocking = [{ ...openRow('all'), status: 'rejected' }];
    expect(await RequestsService.exists(70523, 'tv')).toBe(false);

    // Eine importierte Staffel steht im Regal — sie erneut anzufragen ist
    // weiterhin ein Duplikat.
    dbState.blocking = [{ ...openRow('season', 2), status: 'imported' }];
    expect(await RequestsService.exists(70523, 'tv', { scope: 'season', seasonNumber: 2 })).toBe(true);

    dbState.blocking = [{ ...openRow('all'), status: 'approved' }];
    expect(await RequestsService.exists(70523, 'tv')).toBe(true);
  });
});

describe('RequestsService.create (scope handling)', () => {
  beforeEach(() => {
    TmdbService.getTvDetails.mockResolvedValue(TV_DETAILS);
    TmdbService.getMovieDetails.mockResolvedValue({ id: 348, title: 'Alien', media_type: 'movie', poster_path: '/a.jpg' });
    dbState.requestById = {
      id: 1, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark', seasons: '[]',
      request_scope: 'season', season_number: 2, episode_number: null
    };
  });

  it('stores the whole series by default', async () => {
    await RequestsService.create('u1', 'alice', 70523, 'tv', '');

    expect(insertedRow()).toMatchObject({ request_scope: 'all', season_number: null, episode_number: null });
  });

  it('stores a season request', async () => {
    await RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'season', seasonNumber: 2 });

    expect(insertedRow()).toMatchObject({ request_scope: 'season', season_number: 2, episode_number: null });
  });

  it('stores an episode request', async () => {
    await RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'episode', seasonNumber: 2, episodeNumber: 5 });

    expect(insertedRow()).toMatchObject({ request_scope: 'episode', season_number: 2, episode_number: 5 });
  });

  // The seasons column keeps meaning "TMDB metadata of the whole series", not the selection.
  it('keeps the seasons column pointed at the full TMDB season list', async () => {
    await RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'season', seasonNumber: 2 });

    expect(JSON.parse(insertedRow().seasons)).toEqual(TV_DETAILS.seasons);
  });

  it('rejects a scope other than "all" for a movie with 400', async () => {
    await expect(RequestsService.create('u1', 'alice', 348, 'movie', '', { scope: 'season', seasonNumber: 1 }))
      .rejects.toMatchObject({ status: 400 });
    expect(dbState.inserts).toHaveLength(0);
  });

  it('rejects an unknown scope with 400', async () => {
    await expect(RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'half' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects a season request without a season number with 400', async () => {
    await expect(RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'season' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects an episode request without an episode number with 400', async () => {
    await expect(RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'episode', seasonNumber: 2 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects a duplicate with 409', async () => {
    dbState.blocking = [{ request_scope: 'season', season_number: 2, episode_number: null }];

    await expect(RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'season', seasonNumber: 2 }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('lets a second season through while the first one is open', async () => {
    dbState.blocking = [{ request_scope: 'season', season_number: 1, episode_number: null }];

    await RequestsService.create('u1', 'alice', 70523, 'tv', '', { scope: 'season', seasonNumber: 2 });

    expect(insertedRow()).toMatchObject({ request_scope: 'season', season_number: 2 });
  });
});

describe('RequestsService normalizeRequest', () => {
  it('ships the scope fields', async () => {
    dbState.requestById = {
      id: 5, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark', seasons: '[{"season_number":1}]',
      request_scope: 'episode', season_number: 2, episode_number: 5
    };

    expect(await RequestsService.getById(5)).toMatchObject({
      request_scope: 'episode',
      season_number: 2,
      episode_number: 5,
      seasons: [{ season_number: 1 }]
    });
  });

  it('falls back to a whole-title scope for a row written before the migration', async () => {
    dbState.requestById = { id: 5, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark', seasons: null };

    expect(await RequestsService.getById(5)).toMatchObject({
      request_scope: 'all',
      season_number: null,
      episode_number: null,
      seasons: []
    });
  });
});

describe('RequestsService.reject', () => {
  const rejectRequest = async (row) => {
    dbState.requestById = row;
    return RequestsService.reject(row.id);
  };

  it('bans the title when a whole-title request is rejected', async () => {
    dbState.cachedMedia = { first_air_date: '2017-12-01' };
    await rejectRequest({ id: 9, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark', request_scope: 'all', seasons: null });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).series).toContainEqual({
      name: 'Dark', releaseYear: '2017', tmdbId: 70523
    });
    expect(dbState.statusUpdates[0][0]).toBe('rejected');
  });

  it('bans a title whose row predates the migration', async () => {
    await rejectRequest({ id: 9, tmdb_id: 1399, tmdb_type: 'tv', title: 'Game of Thrones', seasons: null });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('never bans the title when a season request is rejected', async () => {
    await rejectRequest({
      id: 10, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark',
      request_scope: 'season', season_number: 2, seasons: null
    });

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(dbState.statusUpdates[0][0]).toBe('rejected');
  });

  it('never bans the title when an episode request is rejected', async () => {
    await rejectRequest({
      id: 11, tmdb_id: 70523, tmdb_type: 'tv', title: 'Dark',
      request_scope: 'episode', season_number: 2, episode_number: 5, seasons: null
    });

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('throws 404 for an unknown request', async () => {
    dbState.requestById = undefined;
    await expect(RequestsService.reject(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('banned list cache', () => {
  it('serves repeated lookups from the cache instead of re-reading the file', () => {
    RequestsService.isBanned(348, 'movie');
    fs.readFileSync.mockClear();

    expect(RequestsService.isBanned(348, 'movie')).toBe(true);
    expect(RequestsService.getBannedMedia(348, 'movie')).toMatchObject({ tmdbId: 348 });
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('drops the cache when the list is written', async () => {
    expect(RequestsService.isBanned(603, 'movie')).toBe(false);

    dbState.requestById = { id: 12, tmdb_id: 603, tmdb_type: 'movie', title: 'The Matrix', request_scope: 'all', seasons: null };
    await RequestsService.reject(12);

    expect(RequestsService.isBanned(603, 'movie')).toBe(true);
  });
});

describe('RequestsService.crossCheck', () => {
  it('passes the tmdb type along and returns the matched Jellyfin item id', async () => {
    const details = { id: 438631, title: 'Dune', media_type: 'movie', release_date: '2021-09-15' };
    TmdbService.getMovieDetails.mockResolvedValue(details);
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: true, jellyfinItems: [{ Id: 'jf-movie' }], jellyfinItemId: 'jf-movie'
    });

    const result = await RequestsService.crossCheck('u1', 't1', 438631, 'movie');

    expect(JellyfinCrossCheck.checkMediaExists).toHaveBeenCalledWith('u1', 't1', details, 'movie');
    expect(result.jellyfinItemId).toBe('jf-movie');
    expect(JellyfinCrossCheck.checkSeriesSeasons).not.toHaveBeenCalled();
  });

  it('checks the seasons of a matched series against its Jellyfin id', async () => {
    const seasons = [{ season_number: 1, name: 'Staffel 1', episode_count: 10 }];
    TmdbService.getTvDetails.mockResolvedValue({ id: 1399, name: 'Dune', media_type: 'tv', seasons });
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: true, jellyfinItems: [{ Id: 'jf-series' }], jellyfinItemId: 'jf-series'
    });
    JellyfinCrossCheck.checkSeriesSeasons.mockResolvedValue([
      { season_number: 1, name: 'Staffel 1', exists: true, jellyfin_season_id: 'jf-s1', episode_count: 10 }
    ]);

    const result = await RequestsService.crossCheck('u1', 't1', 1399, 'tv');

    expect(JellyfinCrossCheck.checkSeriesSeasons).toHaveBeenCalledWith('u1', 't1', 'jf-series', seasons);
    expect(result.jellyfinItemId).toBe('jf-series');
    expect(result.seasons).toHaveLength(1);
  });

  // The search route holds the TMDB payload already; refetching it there would
  // mean /tv/{id} plus /credits for every one of up to 40 hits.
  it('uses a supplied media payload instead of fetching the details again', async () => {
    const media = { id: 1399, name: 'Dune', media_type: 'tv', first_air_date: '2021-10-03' };
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: true, jellyfinItems: [{ Id: 'jf-series' }], jellyfinItemId: 'jf-series'
    });

    const result = await RequestsService.crossCheck('u1', 't1', 1399, 'tv', {
      media,
      withSeasons: false
    });

    expect(TmdbService.getTvDetails).not.toHaveBeenCalled();
    expect(JellyfinCrossCheck.checkMediaExists).toHaveBeenCalledWith('u1', 't1', media, 'tv');
    expect(JellyfinCrossCheck.checkSeriesSeasons).not.toHaveBeenCalled();
    expect(result.jellyfinItemId).toBe('jf-series');
  });

  it('skips the season check for a matched series when withSeasons is off', async () => {
    TmdbService.getTvDetails.mockResolvedValue({ id: 1399, name: 'Dune', media_type: 'tv', seasons: [{ season_number: 1 }] });
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: true, jellyfinItems: [{ Id: 'jf-series' }], jellyfinItemId: 'jf-series'
    });

    const result = await RequestsService.crossCheck('u1', 't1', 1399, 'tv', { withSeasons: false });

    expect(JellyfinCrossCheck.checkSeriesSeasons).not.toHaveBeenCalled();
    expect(result.seasons).toBeUndefined();
  });

  // exists can be true while the id is missing; the season lookup needs the id.
  it('skips the season check when the match carries no Jellyfin id', async () => {
    TmdbService.getTvDetails.mockResolvedValue({ id: 1399, name: 'Dune', media_type: 'tv', seasons: [] });
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: true, jellyfinItems: [], jellyfinItemId: null
    });

    await RequestsService.crossCheck('u1', 't1', 1399, 'tv');

    expect(JellyfinCrossCheck.checkSeriesSeasons).not.toHaveBeenCalled();
  });

  it('skips the season check when the series is not in the library', async () => {
    TmdbService.getTvDetails.mockResolvedValue({ id: 1399, name: 'Dune', media_type: 'tv', seasons: [] });
    JellyfinCrossCheck.checkMediaExists.mockResolvedValue({
      exists: false, jellyfinItems: [], jellyfinItemId: null
    });

    const result = await RequestsService.crossCheck('u1', 't1', 1399, 'tv');

    expect(JellyfinCrossCheck.checkSeriesSeasons).not.toHaveBeenCalled();
    expect(result.jellyfinItemId).toBeNull();
    expect(result.seasons).toBeUndefined();
  });
});
