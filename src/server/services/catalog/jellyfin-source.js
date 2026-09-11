import env from '../../config/env.js';
import { jellyfinJson } from '../jellyfin/client.js';
import { COMMON_ITEM_FIELDS } from '../jellyfin/fields.js';

// Only these library kinds hold movies and series; box sets and the rest are skipped.
const COLLECTION_TYPES = new Set(['movies', 'tvshows']);
const ITEM_TYPES = 'Movie,Series';
const PAGE_SIZE = 500;

// Everything the cards, carousels and the trailer scroller read, plus what the
// sync needs to index. Blur hashes are deliberately left out — nothing reads them.
const CATALOG_FIELDS = [
  COMMON_ITEM_FIELDS,
  'DateCreated',
  'PremiereDate',
  'RemoteTrailers',
  'ExternalUrls',
  'OfficialRating',
  'CommunityRating',
  'CriticRating',
  'SortName',
  'OriginalTitle',
  'Studios'
].join(',');

const DROP_KEYS = new Set(['ImageBlurHashes', 'ServerId', 'ChannelId', 'LocationType', 'MediaType']);

const trimItem = (item) => {
  const trimmed = {};
  for (const [key, value] of Object.entries(item)) {
    if (!DROP_KEYS.has(key)) trimmed[key] = value;
  }
  return trimmed;
};

// Reads the whole catalogue with the server API key, library by library, so
// every item knows which library it belongs to. That is what per-user library
// access is later filtered on.
export function createJellyfinCatalogSource({ apiKey = env.JELLYFIN_API_KEY, fetchJson = jellyfinJson, pageSize = PAGE_SIZE } = {}) {
  const request = (path, query = {}) => fetchJson(path, { token: apiKey, query });

  const listLibraries = async () => {
    const folders = await request('/Library/VirtualFolders');
    return folders
      .filter(folder => COLLECTION_TYPES.has(folder.CollectionType))
      .map(folder => ({ id: folder.ItemId, name: folder.Name, collectionType: folder.CollectionType }));
  };

  const listLibraryItems = async (libraryId) => {
    const items = [];
    let startIndex = 0;

    for (;;) {
      const page = await request('/Items', {
        ParentId: libraryId,
        IncludeItemTypes: ITEM_TYPES,
        Recursive: 'true',
        Fields: CATALOG_FIELDS,
        SortBy: 'SortName',
        SortOrder: 'Ascending',
        StartIndex: startIndex,
        Limit: pageSize
      });

      const batch = page.Items || [];
      items.push(...batch.map(item => ({ ...trimItem(item), LibraryId: libraryId })));

      startIndex += batch.length;
      if (batch.length < pageSize || startIndex >= (page.TotalRecordCount || 0)) break;
    }

    return items;
  };

  // Episodes are not mirrored; a Limit=0 query still reports how many exist.
  const countEpisodes = async () => {
    const page = await request('/Items', { IncludeItemTypes: 'Episode', Recursive: 'true', Limit: 0 });
    return page.TotalRecordCount ?? 0;
  };

  const fetchAll = async () => {
    const [libraries, episodeCount] = await Promise.all([
      listLibraries(),
      countEpisodes().catch(() => null)
    ]);
    const perLibrary = await Promise.all(libraries.map(library => listLibraryItems(library.id)));
    return { libraries, items: perLibrary.flat(), episodeCount };
  };

  return { listLibraries, listLibraryItems, countEpisodes, fetchAll };
}
