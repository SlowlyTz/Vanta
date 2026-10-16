import { describe, it, expect, beforeAll, vi } from 'vitest';
import initSqlJs from 'sql.js';
import { createCatalogDb } from '../../../../src/server/db/catalog.js';
import { createCatalogSync } from '../../../../src/server/services/catalog/sync.service.js';
import { createCatalogReader } from '../../../../src/server/services/catalog/reader.js';
import { ageLimitOf, withinAgeLimit } from '../../../../src/server/services/catalog/age-limit.js';
import { getCatalogAccess, clearVisibilityCache } from '../../../../src/server/services/catalog/visibility.js';

const SQL = await initSqlJs();

const item = (Id, Type, OfficialRating, extra = {}) => ({
  Id, Type, Name: Id, SortName: Id, LibraryId: Type === 'Movie' ? 'lib-m' : 'lib-s', DateCreated: '2026-01-01',
  Genres: ['Drama'], Studios: [{ Name: 'Netflix' }], BackdropImageTags: ['b'], OfficialRating, ...extra
});
const ITEMS = [
  item('kids', 'Movie', 'FSK-0'),
  item('teen', 'Movie', 'FSK-12'),
  item('adult', 'Movie', 'FSK-18'),
  item('us-r', 'Movie', 'R'),
  item('odd', 'Movie', 'Unrated-XY'),
  item('unrated-movie', 'Movie', undefined),
  item('teen-series', 'Series', 'FSK-12'),
  item('adult-series', 'Series', 'FSK-18', { People: [{ Id: 'p1', Name: 'Mads Mikkelsen', Type: 'Actor' }] }),
  item('unrated-series', 'Series', undefined)
];

const ids = (items) => items.map(entry => entry.Id).sort();

describe('age limit', () => {
  it('follows Jellyfin: the age limit, and unrated titles of blocked kinds even without one', () => {
    const twelve = { maxAge: 12, blockUnrated: ['Movie'] };
    expect(withinAgeLimit(twelve, { type: 'Movie', officialRating: 'FSK-12' })).toBe(true);
    expect(withinAgeLimit(twelve, { type: 'Movie', officialRating: 'FSK-16' })).toBe(false);
    expect(withinAgeLimit(twelve, { Type: 'Movie', OfficialRating: 'PG-13' })).toBe(true);
    expect(withinAgeLimit(twelve, { type: 'Movie', officialRating: null })).toBe(false);
    expect(withinAgeLimit(twelve, { type: 'Series', officialRating: null })).toBe(true);
    // A rating VANTA cannot read is let through.
    expect(withinAgeLimit(twelve, { type: 'Movie', officialRating: 'Unrated-XY' })).toBe(true);
    expect(withinAgeLimit({ maxAge: null, blockUnrated: ['Series'] }, { type: 'Series', officialRating: null })).toBe(false);
    expect(withinAgeLimit(null, { type: 'Movie', officialRating: 'FSK-18' })).toBe(true);
  });

  it('reads the limit from a Jellyfin policy, none when nothing is set', () => {
    expect(ageLimitOf({ MaxParentalRating: 16, BlockUnratedItems: ['Movie'] })).toEqual({ maxAge: 16, blockUnrated: ['Movie'] });
    expect(ageLimitOf({ BlockUnratedItems: [] })).toBeNull();
    expect(ageLimitOf({})).toBeNull();
  });

  it('access carries libraries and age limit, and is cleared per user', async () => {
    clearVisibilityCache();
    const fetchJson = vi.fn(async () => ({ Policy: { EnableAllFolders: true, MaxParentalRating: 12, BlockUnratedItems: ['Movie'] } }));
    expect(await getCatalogAccess('u1', 't', { fetchJson })).toEqual({ libraryIds: null, ageLimit: { maxAge: 12, blockUnrated: ['Movie'] } });
    await getCatalogAccess('u1', 't', { fetchJson });
    expect(fetchJson).toHaveBeenCalledTimes(1);
    clearVisibilityCache('u1');
    await getCatalogAccess('u1', 't', { fetchJson });
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });
});

describe('catalogue reader with an age limit', () => {
  let reader;
  const twelve = { maxAge: 12, blockUnrated: ['Movie'] };

  beforeAll(async () => {
    const db = createCatalogDb({ SQL });
    const sync = createCatalogSync({ db, source: { fetchAll: async () => ({ libraries: [{ id: 'lib-m', name: 'Filme', collectionType: 'movies' }, { id: 'lib-s', name: 'Serien', collectionType: 'tvshows' }], items: ITEMS }) } });
    await sync.runFull();
    reader = createCatalogReader(db);
  });

  it('hides titles above the limit and blocked unrated ones in every list', () => {
    const allowed = ['kids', 'odd', 'teen', 'teen-series', 'unrated-series'];
    expect(ids(reader.all({ ageLimit: twelve }))).toEqual(allowed);
    expect(ids(reader.newest({ type: 'Movie', ageLimit: twelve }))).toEqual(['kids', 'odd', 'teen']);
    expect(reader.page({ type: 'Movie,Series', ageLimit: twelve }).totalRecordCount).toBe(allowed.length);
    expect(ids(reader.screensaver({ ageLimit: twelve }))).toEqual(allowed);
    expect(ids(reader.search({ query: 'adult', ageLimit: twelve }))).toEqual([]);
    expect(reader.searchPeople({ query: 'Mikkelsen', ageLimit: twelve })).toEqual([]);
    expect(reader.searchPeople({ query: 'Mikkelsen' })).toHaveLength(1);
  });

  it('without a limit everything stays', () => {
    expect(ids(reader.all({}))).toHaveLength(ITEMS.length);
    expect(ids(reader.all({ ageLimit: null }))).toHaveLength(ITEMS.length);
  });

  it('blocks only unrated titles when there is no age', () => {
    expect(ids(reader.all({ ageLimit: { maxAge: null, blockUnrated: ['Series'] } }))).not.toContain('unrated-series');
    expect(ids(reader.all({ ageLimit: { maxAge: null, blockUnrated: ['Series'] } }))).toContain('adult');
  });

  it('names what access to a title depends on', () => {
    expect(reader.accessOf('adult')).toEqual({ libraryId: 'lib-m', type: 'Movie', officialRating: 'FSK-18' });
    expect(reader.accessOf('nope')).toBeUndefined();
  });
});
