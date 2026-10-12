import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import { createCatalogDb } from '../../../../src/server/db/catalog.js';
import { createCatalogSync } from '../../../../src/server/services/catalog/sync.service.js';
import { createCatalogReader, setActiveCatalogReader, getActiveCatalogReader } from '../../../../src/server/services/catalog/reader.js';

const SQL = await initSqlJs();

const LIBRARIES = [
  { id: 'lib-a', name: 'Filme A', collectionType: 'movies' },
  { id: 'lib-b', name: 'Filme B', collectionType: 'movies' },
  { id: 'lib-s', name: 'Serien', collectionType: 'tvshows' }
];

const ITEMS = [
  { Id: 'm1', Type: 'Movie', Name: 'Dune', SortName: 'dune', LibraryId: 'lib-a', DateCreated: '2026-03-01', Genres: ['Sci-Fi', 'Drama'], Studios: [{ Name: 'Warner Bros.' }], ProviderIds: { Tmdb: '438631', Imdb: 'tt1160419' }, RemoteTrailers: [{ Url: 'x' }] },
  { Id: 'm2', Type: 'Movie', Name: 'Heat', SortName: 'heat', LibraryId: 'lib-a', DateCreated: '2026-01-01', Genres: ['Drama'], Studios: [{ Name: 'Warner Bros.' }], ProviderIds: { Tmdb: '949' }, BackdropImageTags: ['b2'], CommunityRating: 8 },
  { Id: 'm3', Type: 'Movie', Name: 'Alien', SortName: 'alien', OriginalTitle: 'Alien', LibraryId: 'lib-b', DateCreated: '2026-02-01', Genres: ['Horror', 'Sci-Fi'], Studios: [{ Name: '20th Century Fox' }], ProviderIds: { Tmdb: '348' } },
  { Id: 's1', Type: 'Series', Name: 'Dark', SortName: 'dark', LibraryId: 'lib-s', DateCreated: '2026-04-01', Genres: ['Drama'], Studios: [{ Name: 'Netflix' }], ProviderIds: { Tmdb: '70523' }, RemoteTrailers: [{ Url: 'y' }], BackdropImageTags: ['b1'] },
  { Id: 's2', Type: 'Series', Name: 'Der Pass', SortName: 'pass', LibraryId: 'lib-s', DateCreated: '2025-12-01', Genres: ['Krimi'], Studios: [] }
];

let reader;

beforeAll(async () => {
  const db = createCatalogDb({ SQL });
  const sync = createCatalogSync({ db, source: { fetchAll: async () => ({ libraries: LIBRARIES, items: ITEMS }) } });
  await sync.runFull();
  reader = createCatalogReader(db);
});

const ids = (items) => items.map(item => item.Id);

describe('CatalogReader', () => {
  it('is ready once the catalogue holds items', () => {
    expect(reader.isReady()).toBe(true);
    expect(createCatalogReader(createCatalogDb({ SQL })).isReady()).toBe(false);
  });

  it('returns the stored Jellyfin item unchanged', () => {
    const [dune] = reader.byProviderId({ tmdbId: 438631 });
    expect(dune).toEqual(ITEMS[0]);
  });

  describe('newest', () => {
    it('sorts by DateCreated descending within a type', () => {
      expect(ids(reader.newest({ type: 'Movie' }))).toEqual(['m1', 'm3', 'm2']);
      expect(ids(reader.newest({ type: 'Series', limit: 1 }))).toEqual(['s1']);
    });

    it('applies the visible libraries', () => {
      expect(ids(reader.newest({ type: 'Movie', libraryIds: ['lib-b'] }))).toEqual(['m3']);
      expect(reader.newest({ type: 'Movie', libraryIds: [] })).toEqual([]);
    });
  });

  describe('page', () => {
    it('paginates a single type by sort name with the total count', () => {
      const first = reader.page({ type: 'Movie', page: 1, limit: 2 });
      const second = reader.page({ type: 'Movie', page: 2, limit: 2 });

      expect(ids(first.items)).toEqual(['m3', 'm1']);
      expect(ids(second.items)).toEqual(['m2']);
      expect(first.totalRecordCount).toBe(3);
    });

    it('merges movies and series in one sorted, paginated list', () => {
      const result = reader.page({ type: 'Movie,Series', page: 1, limit: 10 });
      expect(ids(result.items)).toEqual(['m3', 's1', 'm1', 'm2', 's2']);
      expect(result.totalRecordCount).toBe(5);
    });

    it('filters by genre, case-insensitively', () => {
      expect(ids(reader.page({ type: 'Movie,Series', genre: 'sci-fi' }).items)).toEqual(['m3', 'm1']);
      expect(reader.page({ type: 'Series', genre: 'Horror' }).totalRecordCount).toBe(0);
    });

    it('returns null for types the mirror does not hold so the caller falls back to Jellyfin', () => {
      expect(reader.page({ type: 'Episode', page: 1, limit: 1 })).toBeNull();
      expect(reader.page({ type: 'Movie,Episode' })).toBeNull();
      expect(reader.newest({ type: 'Episode' })).toBeNull();
      expect(reader.genres({ type: 'Episode' })).toBeNull();
    });

    it('filters by one or several studio names', () => {
      expect(ids(reader.page({ type: 'Movie', studios: ['warner bros.'] }).items)).toEqual(['m1', 'm2']);
      expect(ids(reader.page({ type: 'Movie,Series', studios: ['Netflix', '20th Century Fox'] }).items)).toEqual(['m3', 's1']);
    });
  });

  describe('search', () => {
    it('matches a substring of the name regardless of case and spacing', () => {
      expect(ids(reader.search({ query: 'DUNE' }))).toEqual(['m1']);
      expect(ids(reader.search({ query: 'der  pass' }))).toEqual(['s2']);
    });

    it('treats wildcards as punctuation, never as patterns', () => {
      expect(reader.search({ query: '%' })).toEqual([]);
      expect(reader.search({ query: '_' })).toEqual([]);
      expect(reader.search({ query: 'd%e' })).toEqual([]);
    });

    it('forgives a typo and finds titles through their cast', () => {
      expect(ids(reader.search({ query: 'Dnue' }))).toEqual(['m1']);
    });

    it('respects the visible libraries', () => {
      expect(reader.search({ query: 'a', libraryIds: ['lib-s'] }).every(item => item.Type === 'Series')).toBe(true);
    });
  });

  describe('decades', () => {
    it('lists nothing for titles without a year or libraries the user cannot see', () => {
      expect(reader.decades()).toEqual([]);
      expect(reader.decades({ libraryIds: [] })).toEqual([]);
    });
  });

  describe('screensaver', () => {
    it('only offers titles with a backdrop the user may see', () => {
      const items = reader.screensaver({ random: () => 0.5 });
      expect(items.map(item => item.Id).sort()).toEqual(['m2', 's1']);
      expect(reader.screensaver({ libraryIds: ['lib-s'] }).map(item => item.Id)).toEqual(['s1']);
      expect(reader.screensaver({ libraryIds: [] })).toEqual([]);
    });

    it('picks among the newest and the best rated titles only', () => {
      // limit 1: the newest with a backdrop is Dark, the best rated Heat.
      const rising = () => { let n = 0; return () => (n += 1); };
      const falling = () => { let n = 0; return () => (n -= 1); };
      expect(ids(reader.screensaver({ limit: 1, random: rising() }))).toEqual(['s1']);
      expect(ids(reader.screensaver({ limit: 1, random: falling() }))).toEqual(['m2']);
    });
  });

  describe('genres and studios', () => {
    it('lists distinct genre names for a type, sorted', () => {
      expect(reader.genres({ type: 'Movie' })).toEqual([{ Name: 'Drama' }, { Name: 'Horror' }, { Name: 'Sci-Fi' }]);
      expect(reader.genres({ type: 'Series', libraryIds: [] })).toEqual([]);
    });

    it('lists distinct studios with a stable id and their title count', () => {
      expect(reader.studios()).toEqual([
        { Name: '20th Century Fox', Id: '20th century fox', ItemCount: 1 },
        { Name: 'Netflix', Id: 'netflix', ItemCount: 1 },
        { Name: 'Warner Bros.', Id: 'warner bros.', ItemCount: 2 }
      ]);
    });
  });

  it('names the library of a catalogue title and nothing for unknown ids', () => {
    expect(reader.libraryOf('m3')).toBe('lib-b');
    expect(reader.libraryOf('s1')).toBe('lib-s');
    expect(reader.libraryOf('episode-1')).toBeUndefined();
  });

  describe('all and byProviderId', () => {
    it('returns every visible title, optionally only those with a trailer', () => {
      expect(reader.all()).toHaveLength(5);
      expect(ids(reader.all({ withTrailer: true }))).toEqual(['s1', 'm1']);
    });

    it('finds items by TMDB or IMDb id within a type', () => {
      expect(ids(reader.byProviderId({ tmdbId: '70523', type: 'Series' }))).toEqual(['s1']);
      expect(reader.byProviderId({ tmdbId: '70523', type: 'Movie' })).toEqual([]);
      expect(ids(reader.byProviderId({ imdbId: 'TT1160419' }))).toEqual(['m1']);
      expect(reader.byProviderId({})).toEqual([]);
    });
  });
});

describe('active reader registry', () => {
  it('hands out the reader only while it has data', () => {
    setActiveCatalogReader(null);
    expect(getActiveCatalogReader()).toBeNull();

    setActiveCatalogReader(createCatalogReader(createCatalogDb({ SQL })));
    expect(getActiveCatalogReader()).toBeNull();

    setActiveCatalogReader(reader);
    expect(getActiveCatalogReader()).toBe(reader);
    setActiveCatalogReader(null);
  });
});
