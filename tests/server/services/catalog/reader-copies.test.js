import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import { createCatalogDb } from '../../../../src/server/db/catalog.js';
import { createCatalogSync } from '../../../../src/server/services/catalog/sync.service.js';
import { createCatalogReader } from '../../../../src/server/services/catalog/reader.js';

const SQL = await initSqlJs();

const LIBRARIES = [
  { id: 'films-a', name: 'Filme A', collectionType: 'movies' },
  { id: 'films-b', name: 'Filme B', collectionType: 'movies' },
  { id: 'shows-a', name: 'Serien A', collectionType: 'tvshows' },
  { id: 'shows-b', name: 'Serien B', collectionType: 'tvshows' }
];

// "Alice" lies in two series libraries (one season each), "Mulan" twice as a
// film; "Mulan" 1998 and the remake share the name but not the TMDB id.
const ITEMS = [
  { Id: 'alice-1', Type: 'Series', Name: 'Alice', SortName: 'alice', LibraryId: 'shows-a', DateCreated: '2025-01-01', ProviderIds: { Tmdb: '110316' } },
  { Id: 'alice-2', Type: 'Series', Name: 'Alice', SortName: 'alice', LibraryId: 'shows-b', DateCreated: '2025-06-01', ProviderIds: { Tmdb: '110316' } },
  { Id: 'mulan-a', Type: 'Movie', Name: 'Mulan', SortName: 'mulan', LibraryId: 'films-a', DateCreated: '2025-02-01', ProviderIds: { Tmdb: '10674' }, OfficialRating: 'FSK-6' },
  { Id: 'mulan-b', Type: 'Movie', Name: 'Mulan', SortName: 'mulan', LibraryId: 'films-b', DateCreated: '2025-03-01', ProviderIds: { Tmdb: '10674' }, OfficialRating: 'FSK-6' },
  { Id: 'mulan-2020', Type: 'Movie', Name: 'Mulan', SortName: 'mulan', LibraryId: 'films-b', DateCreated: '2025-04-01', ProviderIds: { Tmdb: '337401' } },
  { Id: 'imdb-only-a', Type: 'Movie', Name: 'Rare', SortName: 'rare', LibraryId: 'films-a', DateCreated: '2025-01-05', ProviderIds: { Imdb: 'tt001' } },
  { Id: 'imdb-only-b', Type: 'Movie', Name: 'Rare', SortName: 'rare', LibraryId: 'films-b', DateCreated: '2025-01-06', ProviderIds: { Imdb: 'tt001' } },
  { Id: 'loose', Type: 'Movie', Name: 'Loose', SortName: 'loose', LibraryId: 'films-a', DateCreated: '2025-01-07' }
];

let reader;

beforeAll(async () => {
  const db = createCatalogDb({ SQL });
  const sync = createCatalogSync({ db, source: { fetchAll: async () => ({ libraries: LIBRARIES, items: ITEMS }) } });
  await sync.runFull();
  reader = createCatalogReader(db);
});

const ids = (items) => items.map(item => item.Id).sort();

describe('CatalogReader copies of one title', () => {
  it('lists each title once, as its oldest copy', () => {
    expect(ids(reader.page({ type: 'Series' }).items)).toEqual(['alice-1']);
    expect(ids(reader.page({ type: 'Movie' }).items)).toEqual(['imdb-only-a', 'loose', 'mulan-2020', 'mulan-a']);
    expect(reader.page({ type: 'Movie' }).totalRecordCount).toBe(4);
  });

  it('shows the copy a user can see when the first one is in a hidden library', () => {
    expect(ids(reader.page({ type: 'Series', libraryIds: ['shows-b'] }).items)).toEqual(['alice-2']);
    expect(ids(reader.newest({ type: 'Movie', libraryIds: ['films-b'] }))).toEqual(['imdb-only-b', 'mulan-2020', 'mulan-b']);
  });

  it('answers a search with the first visible copy', () => {
    expect(reader.search({ query: 'alice' }).map(item => item.Id)).toEqual(['alice-1']);
    expect(reader.search({ query: 'alice', libraryIds: ['shows-b'] }).map(item => item.Id)).toEqual(['alice-2']);
    expect(reader.search({ query: 'mulan' }).map(item => item.Id).sort()).toEqual(['mulan-2020', 'mulan-a']);
  });

  it('names every visible copy of a title, oldest first', () => {
    expect(reader.copiesOf('alice-2').map(copy => copy.id)).toEqual(['alice-1', 'alice-2']);
    expect(reader.copiesOf('alice-1', { libraryIds: ['shows-b'] }).map(copy => copy.id)).toEqual(['alice-2']);
    expect(reader.copiesOf('imdb-only-b').map(copy => copy.id)).toEqual(['imdb-only-a', 'imdb-only-b']);
    expect(reader.copiesOf('loose').map(copy => copy.id)).toEqual(['loose']);
    expect(reader.copiesOf('unknown')).toEqual([]);
  });

  it('applies the age limit to the copies', () => {
    const ageLimit = { maxAge: 0, blockUnrated: [] };
    expect(reader.copiesOf('mulan-b', { ageLimit })).toEqual([]);
  });

  it('groups the titles held more than once with their library names', () => {
    const groups = reader.titleGroups();
    expect(groups.map(group => group.key).sort()).toEqual(['Movie:imdb:tt001', 'Movie:tmdb:10674', 'Series:tmdb:110316']);
    const alice = groups.find(group => group.type === 'Series');
    expect(alice.copies).toEqual([
      { id: 'alice-1', libraryId: 'shows-a', libraryName: 'Serien A' },
      { id: 'alice-2', libraryId: 'shows-b', libraryName: 'Serien B' }
    ]);
  });
});

describe('CatalogReader films identified as the wrong title', () => {
  it('keeps a film with the same id but another runtime apart and flags it', async () => {
    const db = createCatalogDb({ SQL });
    const minutes = (value) => value * 60 * 10_000_000;
    const items = [
      { Id: 'hp1', Type: 'Movie', Name: 'HP 7.1', SortName: 'hp', LibraryId: 'films-a', DateCreated: '2025-01-01', RunTimeTicks: minutes(146), ProviderIds: { Tmdb: '12444' } },
      { Id: 'hp2-file', Type: 'Movie', Name: 'HP 7.1', SortName: 'hp', LibraryId: 'films-a', DateCreated: '2025-01-02', RunTimeTicks: minutes(130), ProviderIds: { Tmdb: '12444' } },
      { Id: 'hp1-copy', Type: 'Movie', Name: 'HP 7.1', SortName: 'hp', LibraryId: 'films-b', DateCreated: '2025-01-03', RunTimeTicks: minutes(144), ProviderIds: { Tmdb: '12444' } }
    ];
    const sync = createCatalogSync({ db, source: { fetchAll: async () => ({ libraries: LIBRARIES, items }) } });
    await sync.runFull();
    const local = createCatalogReader(db);

    expect(local.page({ type: 'Movie' }).items.map(item => item.Id).sort()).toEqual(['hp1', 'hp2-file']);
    expect(local.copiesOf('hp1-copy').map(copy => copy.id)).toEqual(['hp1', 'hp1-copy']);
    expect(local.copiesOf('hp2-file').map(copy => copy.id)).toEqual(['hp2-file']);
    expect(local.search({ query: 'hp' }).map(item => item.Id).sort()).toEqual(['hp1', 'hp2-file']);
    const [group] = local.titleGroups();
    expect(group).toMatchObject({ key: 'Movie:tmdb:12444', mismatch: true });
    expect(group.copies.map(copy => copy.id)).toEqual(['hp1', 'hp1-copy', 'hp2-file']);
  });
});
