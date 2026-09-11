import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_API_KEY: 'test-key', JELLYFIN_BASE_URL: 'http://jellyfin.test' }
}));

import { createJellyfinCatalogSource } from '../../../../src/server/services/catalog/jellyfin-source.js';

const FOLDERS = [
  { Name: 'Filme', CollectionType: 'movies', ItemId: 'lib-m' },
  { Name: 'Serien', CollectionType: 'tvshows', ItemId: 'lib-s' },
  { Name: 'Sammlungen', CollectionType: 'boxsets', ItemId: 'lib-b' },
  { Name: 'Musik', CollectionType: 'music', ItemId: 'lib-a' }
];

function fakeJellyfin(itemsByLibrary) {
  const calls = [];
  const fetchJson = vi.fn(async (path, options) => {
    calls.push({ path, options });
    if (path === '/Library/VirtualFolders') return FOLDERS;

    const { ParentId, StartIndex = 0, Limit, IncludeItemTypes } = options.query;
    if (IncludeItemTypes === 'Episode') return { Items: [], TotalRecordCount: 1444 };
    const all = itemsByLibrary[ParentId] || [];
    return { Items: all.slice(StartIndex, StartIndex + Limit), TotalRecordCount: all.length };
  });
  return { fetchJson, calls };
}

const item = (id, extra = {}) => ({
  Id: id, Name: `Titel ${id}`, Type: 'Movie',
  ImageBlurHashes: { Primary: { x: 'y' } }, ServerId: 'srv', ...extra
});

describe('createJellyfinCatalogSource', () => {
  it('authenticates every call with the API key', async () => {
    const { fetchJson, calls } = fakeJellyfin({});
    await createJellyfinCatalogSource({ fetchJson }).listLibraries();

    expect(calls[0].options.token).toBe('test-key');
  });

  it('lists only movie and series libraries', async () => {
    const { fetchJson } = fakeJellyfin({});
    const libraries = await createJellyfinCatalogSource({ fetchJson }).listLibraries();

    expect(libraries).toEqual([
      { id: 'lib-m', name: 'Filme', collectionType: 'movies' },
      { id: 'lib-s', name: 'Serien', collectionType: 'tvshows' }
    ]);
  });

  it('pages through a library and stops after the last page', async () => {
    const items = Array.from({ length: 7 }, (_, i) => item(`m${i}`));
    const { fetchJson, calls } = fakeJellyfin({ 'lib-m': items });

    const result = await createJellyfinCatalogSource({ fetchJson, pageSize: 3 }).listLibraryItems('lib-m');

    expect(result.map(i => i.Id)).toEqual(items.map(i => i.Id));
    const pages = calls.filter(c => c.path === '/Items');
    expect(pages.map(c => c.options.query.StartIndex)).toEqual([0, 3, 6]);
    expect(pages[0].options.query).toMatchObject({
      ParentId: 'lib-m', IncludeItemTypes: 'Movie,Series', Recursive: 'true', Limit: 3
    });
  });

  it('tags every item with its library and drops the fields nothing reads', async () => {
    const { fetchJson } = fakeJellyfin({ 'lib-m': [item('m1')], 'lib-s': [item('s1', { Type: 'Series' })] });

    const { libraries, items, episodeCount } = await createJellyfinCatalogSource({ fetchJson }).fetchAll();

    expect(libraries).toHaveLength(2);
    expect(items.map(i => [i.Id, i.LibraryId])).toEqual([['m1', 'lib-m'], ['s1', 'lib-s']]);
    expect(episodeCount).toBe(1444);
    expect(items[0]).not.toHaveProperty('ImageBlurHashes');
    expect(items[0]).not.toHaveProperty('ServerId');
    expect(items[0].Name).toBe('Titel m1');
  });

  it('requests the fields the catalogue indexes', async () => {
    const { fetchJson, calls } = fakeJellyfin({ 'lib-m': [item('m1')] });
    await createJellyfinCatalogSource({ fetchJson }).listLibraryItems('lib-m');

    const fields = calls.find(c => c.path === '/Items').options.query.Fields;
    for (const needed of ['ProviderIds', 'Genres', 'Studios', 'DateCreated', 'RemoteTrailers', 'ExternalUrls', 'CriticRating', 'SortName', 'ImageTags']) {
      expect(fields).toContain(needed);
    }
  });

  it('counts episodes with a Limit=0 query and tolerates that call failing', async () => {
    const { fetchJson, calls } = fakeJellyfin({});
    const source = createJellyfinCatalogSource({ fetchJson });

    expect(await source.countEpisodes()).toBe(1444);
    expect(calls.at(-1).options.query).toMatchObject({ IncludeItemTypes: 'Episode', Recursive: 'true', Limit: 0 });

    fetchJson.mockImplementation(async (path, options) => {
      if (path === '/Library/VirtualFolders') return FOLDERS;
      if (options.query.IncludeItemTypes === 'Episode') throw new Error('count failed');
      return { Items: [], TotalRecordCount: 0 };
    });
    const { episodeCount } = await createJellyfinCatalogSource({ fetchJson }).fetchAll();
    expect(episodeCount).toBeNull();
  });

  it('returns an empty list for a library with no items', async () => {
    const { fetchJson } = fakeJellyfin({});
    const result = await createJellyfinCatalogSource({ fetchJson }).listLibraryItems('lib-m');
    expect(result).toEqual([]);
  });
});
