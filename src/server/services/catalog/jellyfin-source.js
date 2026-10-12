import env from '../../config/env.js';
import { jellyfinJson } from '../jellyfin/client.js';
import { COMMON_ITEM_FIELDS } from '../jellyfin/fields.js';

// Only these library kinds hold movies and series; box sets and the rest are skipped.
const COLLECTION_TYPES = new Set(['movies', 'tvshows']);
const ITEM_TYPES = 'Movie,Series';
const MIRRORED_TYPES = new Set(ITEM_TYPES.split(','));
const PAGE_SIZE = 500;

// Everything the cards, carousels and the trailer scroller read, plus what the
// sync needs to index. Blur hashes are deliberately left out — nothing reads them.
const CATALOG_FIELDS = [
  COMMON_ITEM_FIELDS,
  'DateCreated',
  // Moves when a series gets a new episode, so the series counts as changed
  // and the new-episode notification looks at it.
  'DateLastMediaAdded',
  'PremiereDate',
  'RemoteTrailers',
  'ExternalUrls',
  'OfficialRating',
  'CommunityRating',
  'CriticRating',
  'SortName',
  'OriginalTitle',
  'Studios',
  'People'
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
export function createJellyfinCatalogSource({ apiKey = env.JELLYFIN_API_KEY, fetchJson = jellyfinJson, pageSize = PAGE_SIZE, log = console } = {}) {
  // Pages of the whole library are big; a sync may wait longer than a page view.
  const request = (path, query = {}) => fetchJson(path, { token: apiKey, query, timeoutMs: 60 * 1000 });

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
        // Jellyfin 12 folds movies of a collection into one BoxSet item when
        // the query has no user; the mirror needs every movie on its own.
        CollapseBoxSetItems: 'false',
        Recursive: 'true',
        Fields: CATALOG_FIELDS,
        SortBy: 'SortName',
        SortOrder: 'Ascending',
        StartIndex: startIndex,
        Limit: pageSize
      });

      const batch = page.Items || [];
      // Anything else Jellyfin hands back (a BoxSet, a folder) has no place in
      // the mirror and must not fail the whole sync.
      const kept = batch.filter(item => MIRRORED_TYPES.has(item.Type));
      if (kept.length < batch.length) {
        log.warn?.(`[CatalogSync] ${batch.length - kept.length} Einträge anderen Typs in Bibliothek ${libraryId} übersprungen`);
      }
      items.push(...kept.map(item => ({ ...trimItem(item), LibraryId: libraryId })));

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
