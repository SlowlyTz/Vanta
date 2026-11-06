import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: { getSeasons: vi.fn(), getEpisodes: vi.fn() }
}));
vi.mock('../../../../src/server/services/catalog/visibility.js', () => ({
  getCatalogAccess: vi.fn(async () => ({ libraryIds: null, ageLimit: null }))
}));
vi.mock('../../../../src/server/services/catalog/reader.js', () => ({ getActiveCatalogReader: vi.fn() }));

const { ItemsService } = await import('../../../../src/server/services/jellyfin/items.service.js');
const { getActiveCatalogReader } = await import('../../../../src/server/services/catalog/reader.js');
const { copiesOf, getSeasons, getEpisodes, firstCopiesOnly } = await import('../../../../src/server/services/browse/title-copies.js');

const season = (id, index, seriesId) => ({ Id: id, IndexNumber: index, SeriesId: seriesId, Name: `Staffel ${index}` });
const episode = (id, seasonIndex, index) => ({ Id: id, ParentIndexNumber: seasonIndex, IndexNumber: index });

// Copy A holds season 1 and the first half of season 2, copy B season 2 in full.
const SEASONS = {
  a: [season('a-s1', 1, 'a'), season('a-s2', 2, 'a')],
  b: [season('b-s2', 2, 'b')]
};
const EPISODES = {
  'a-s1': [episode('a-e11', 1, 1), episode('a-e12', 1, 2)],
  'a-s2': [episode('a-e21', 2, 1), episode('a-e22', 2, 2)],
  'b-s2': [episode('b-e21', 2, 1), episode('b-e22', 2, 2), episode('b-e23', 2, 3)]
};

beforeEach(() => {
  vi.clearAllMocks();
  getActiveCatalogReader.mockReturnValue({
    copiesOf: vi.fn(id => (['a', 'b'].includes(id) ? [{ id: 'a' }, { id: 'b' }] : []))
  });
  ItemsService.getSeasons.mockImplementation(async (userId, token, seriesId) => SEASONS[seriesId] || []);
  ItemsService.getEpisodes.mockImplementation(async (userId, token, seriesId, seasonId) => (seasonId
    ? EPISODES[seasonId] || []
    : (SEASONS[seriesId] || []).flatMap(entry => EPISODES[entry.Id])));
});

describe('title copies', () => {
  it('answers the item itself without a catalogue or other copies', async () => {
    expect(await copiesOf('u', 't', 'loose')).toEqual([{ id: 'loose' }]);
    getActiveCatalogReader.mockReturnValue(null);
    expect(await copiesOf('u', 't', 'a')).toEqual([{ id: 'a' }]);
  });

  it('merges the seasons of every copy, one per number, first copy first', async () => {
    const seasons = await getSeasons('u', 't', 'b');
    expect(seasons.map(entry => entry.Id)).toEqual(['a-s1', 'a-s2']);
  });

  it('joins a season held by two copies, each episode once', async () => {
    const episodes = await getEpisodes('u', 't', 'a', 'a-s2');
    expect(episodes.map(entry => entry.Id)).toEqual(['a-e21', 'a-e22', 'b-e23']);
  });

  it('merges all episodes of the series without a season', async () => {
    const episodes = await getEpisodes('u', 't', 'b');
    expect(episodes.map(entry => entry.Id)).toEqual(['a-e11', 'a-e12', 'a-e21', 'a-e22', 'b-e23']);
  });

  it('leaves a single series to Jellyfin', async () => {
    await getSeasons('u', 't', 'loose');
    expect(ItemsService.getSeasons).toHaveBeenCalledWith('u', 't', 'loose');
  });

  it('keeps only the first copy of a title in a list', async () => {
    const items = [{ Id: 'b', Type: 'Series' }, { Id: 'a', Type: 'Series' }, { Id: 'x', Type: 'Movie' }, { Id: 'e', Type: 'Episode' }];
    expect((await firstCopiesOnly('u', 't', items)).map(item => item.Id)).toEqual(['a', 'x', 'e']);
  });
});
