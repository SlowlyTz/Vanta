import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: { getItemDetails: vi.fn() },
  queryUserItems: vi.fn()
}));
vi.mock('../../../../src/server/services/jellyfin/client.js', () => ({ jellyfinJson: vi.fn() }));
vi.mock('../../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: { getMovieDetails: vi.fn(), getCollection: vi.fn() }
}));
vi.mock('../../../../src/server/services/catalog/visibility.js', () => ({
  getCatalogAccess: vi.fn(async () => ({ libraryIds: null, ageLimit: null }))
}));
vi.mock('../../../../src/server/services/catalog/reader.js', () => ({ getActiveCatalogReader: vi.fn() }));
vi.mock('../../../../src/server/services/browse/title-copies.js', () => ({
  copiesOf: vi.fn(async (userId, token, itemId) => [{ id: itemId }])
}));

const { ItemsService, queryUserItems } = await import('../../../../src/server/services/jellyfin/items.service.js');
const { jellyfinJson } = await import('../../../../src/server/services/jellyfin/client.js');
const { TmdbService } = await import('../../../../src/server/services/tmdb.service.js');
const { getActiveCatalogReader } = await import('../../../../src/server/services/catalog/reader.js');
const { copiesOf } = await import('../../../../src/server/services/browse/title-copies.js');
const { getCollection, getExtras, lastWatchedTitle } = await import('../../../../src/server/services/browse/title-extras.service.js');

// The library holds parts 1 and 3 (part 3 twice), not part 2.
const HELD = { 1: [{ Id: 'p1' }], 3: [{ Id: 'p3b' }, { Id: 'p3a' }] };

beforeEach(() => {
  vi.clearAllMocks();
  getActiveCatalogReader.mockReturnValue({ byProviderId: ({ tmdbId }) => HELD[tmdbId] || [] });
  ItemsService.getItemDetails.mockResolvedValue({ Type: 'Movie', ProviderIds: { Tmdb: '1' } });
  TmdbService.getMovieDetails.mockResolvedValue({ belongs_to_collection: { id: 9 } });
  TmdbService.getCollection.mockResolvedValue({
    id: 9,
    name: 'Reihe',
    parts: [
      { id: 3, releaseDate: '2010-01-01' },
      { id: 1, releaseDate: '2001-01-01' },
      { id: 2, releaseDate: '2005-01-01' }
    ]
  });
});

describe('getCollection', () => {
  it('lists the held films in release order, first copies only, and counts the missing ones', async () => {
    copiesOf.mockImplementation(async (userId, token, itemId) => (itemId === 'p3b' ? [{ id: 'p3a' }, { id: 'p3b' }] : [{ id: itemId }]));
    const collection = await getCollection('u', 't', 'p1');
    expect(collection).toEqual({ name: 'Reihe', items: [{ Id: 'p1' }, { Id: 'p3a' }], missing: 1 });
  });

  it('is null when the library holds only one film of the series', async () => {
    HELD[3] = [];
    try {
      expect(await getCollection('u', 't', 'p1')).toBeNull();
    } finally {
      HELD[3] = [{ Id: 'p3b' }, { Id: 'p3a' }];
    }
  });

  it('is null for a film outside any series and for series', async () => {
    TmdbService.getMovieDetails.mockResolvedValueOnce({ belongs_to_collection: null });
    expect(await getCollection('u', 't', 'p1')).toBeNull();
    ItemsService.getItemDetails.mockResolvedValueOnce({ Type: 'Series', ProviderIds: { Tmdb: '1' } });
    expect(await getCollection('u', 't', 's')).toBeNull();
  });
});

describe('getExtras', () => {
  it('joins local trailers and special features and survives a failing call', async () => {
    jellyfinJson.mockImplementation(async (path) => {
      if (path.endsWith('LocalTrailers')) return [{ Id: 'tr' }];
      throw new Error('down');
    });
    expect(await getExtras('u', 't', 'x')).toEqual([{ Id: 'tr' }]);
  });
});

describe('lastWatchedTitle', () => {
  it('names the series of a watched episode', async () => {
    queryUserItems.mockResolvedValue({ Items: [{ Type: 'Episode', Name: 'Folge 1', SeriesId: 's1', SeriesName: 'Alice' }] });
    expect(await lastWatchedTitle('u', 't')).toEqual({ id: 's1', name: 'Alice' });
  });

  it('is null when nothing was watched', async () => {
    queryUserItems.mockResolvedValue({ Items: [] });
    expect(await lastWatchedTitle('u', 't')).toBeNull();
  });
});
