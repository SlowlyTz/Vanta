import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';

vi.mock('../../../../src/server/services/jellyfin/client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { jellyfinJson } from '../../../../src/server/services/jellyfin/client.js';
import { LibraryService } from '../../../../src/server/services/jellyfin/library.service.js';
import { createCatalogDb } from '../../../../src/server/db/catalog.js';
import { createCatalogSync } from '../../../../src/server/services/catalog/sync.service.js';
import { createCatalogReader, setActiveCatalogReader } from '../../../../src/server/services/catalog/reader.js';
import { clearVisibilityCache } from '../../../../src/server/services/catalog/visibility.js';

const SQL = await initSqlJs();

const ITEMS = [
  { Id: 'm1', Type: 'Movie', Name: 'Dune', SortName: 'dune', LibraryId: 'lib-a', DateCreated: '2026-03-01', Genres: ['Sci-Fi'], Studios: [{ Name: 'Warner Bros.' }], ProviderIds: { Tmdb: '1' } },
  { Id: 'm2', Type: 'Movie', Name: 'Heat', SortName: 'heat', LibraryId: 'lib-b', DateCreated: '2026-01-01', Genres: ['Drama'], Studios: [{ Name: 'Warner Bros.' }] },
  { Id: 's1', Type: 'Series', Name: 'Dark', SortName: 'dark', LibraryId: 'lib-s', DateCreated: '2026-04-01', Genres: ['Drama'], Studios: [{ Name: 'Netflix' }], RemoteTrailers: [{ Url: 'y' }] }
];

const LIBRARIES = [
  { id: 'lib-a', name: 'A', collectionType: 'movies' },
  { id: 'lib-b', name: 'B', collectionType: 'movies' },
  { id: 'lib-s', name: 'S', collectionType: 'tvshows' }
];

// Jellyfin is only asked which libraries the user may see; every browsing
// call must be answered by the mirror.
const viewsFor = (...ids) => ({ Items: ids.map(Id => ({ Id })) });

async function fillCatalog() {
  const db = createCatalogDb({ SQL });
  await createCatalogSync({ db, source: { fetchAll: async () => ({ libraries: LIBRARIES, items: ITEMS }) } }).runFull();
  setActiveCatalogReader(createCatalogReader(db));
}

describe('LibraryService with a filled catalogue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearVisibilityCache();
    await fillCatalog();
    jellyfinJson.mockResolvedValue(viewsFor('lib-a', 'lib-b', 'lib-s'));
  });

  afterEach(() => {
    setActiveCatalogReader(null);
  });

  it('answers getMovies/getSeries from the mirror after one Views lookup', async () => {
    const movies = await LibraryService.getMovies('u1', 't');
    const series = await LibraryService.getSeries('u1', 't');

    expect(movies.map(i => i.Id)).toEqual(['m1', 'm2']);
    expect(series.map(i => i.Id)).toEqual(['s1']);
    expect(jellyfinJson).toHaveBeenCalledTimes(1);
    expect(jellyfinJson).toHaveBeenCalledWith('/Users/u1/Views', { token: 't' });
  });

  it('hides libraries the user cannot see', async () => {
    jellyfinJson.mockResolvedValue(viewsFor('lib-b'));

    const movies = await LibraryService.getMovies('u2', 't');
    const page = await LibraryService.getLibrary('u2', 't', 'Movie,Series');
    const genres = await LibraryService.getGenres('u2', 't', 'Movie');

    expect(movies.map(i => i.Id)).toEqual(['m2']);
    expect(page).toEqual({ items: [expect.objectContaining({ Id: 'm2' })], totalRecordCount: 1 });
    expect(genres).toEqual([{ Name: 'Drama' }]);
  });

  it('serves search, genres, studios, library pages and the trailer index locally', async () => {
    expect((await LibraryService.search('u1', 't', 'du')).map(i => i.Id)).toEqual(['m1']);
    expect(await LibraryService.getGenres('u1', 't', 'Series')).toEqual([{ Name: 'Drama' }]);
    expect((await LibraryService.getStudios('u1', 't')).map(s => s.Name)).toEqual(['Netflix', 'Warner Bros.']);
    expect((await LibraryService.getLibrary('u1', 't', 'Movie', null, 'Warner Bros.', 1, 1)).totalRecordCount).toBe(2);
    expect((await LibraryService.getLibraryByStudioNames('u1', 't', 'Movie,Series', ['Netflix'])).items.map(i => i.Id)).toEqual(['s1']);
    expect((await LibraryService.getAllMoviesAndSeries('u1', 't')).length).toBe(3);

    // Everything above shares the single cached Views lookup.
    expect(jellyfinJson).toHaveBeenCalledTimes(1);
  });

  it('keeps serving with the last known library access when Jellyfin is down', async () => {
    await LibraryService.getMovies('u1', 't');
    jellyfinJson.mockRejectedValue(new Error('jellyfin down'));
    clearVisibilityCache();

    // No cached answer yet for this user: the error surfaces.
    await expect(LibraryService.getMovies('u9', 't')).rejects.toThrow('jellyfin down');
  });

  it('still asks Jellyfin for the resume row', async () => {
    jellyfinJson.mockResolvedValueOnce({ Items: [] });

    await LibraryService.getResumeItems('u1', 't');

    expect(jellyfinJson).toHaveBeenCalledWith('/Users/u1/Items', expect.objectContaining({
      query: expect.objectContaining({ Filters: 'IsResumable' })
    }));
  });

  it('falls back to Jellyfin while the catalogue is empty', async () => {
    setActiveCatalogReader(createCatalogReader(createCatalogDb({ SQL })));
    jellyfinJson.mockResolvedValue({ Items: [{ Id: 'live' }] });

    const movies = await LibraryService.getMovies('u1', 't');

    expect(movies).toEqual([{ Id: 'live' }]);
    expect(jellyfinJson).toHaveBeenCalledWith('/Users/u1/Items', expect.objectContaining({
      query: expect.objectContaining({ IncludeItemTypes: 'Movie' })
    }));
  });
});
