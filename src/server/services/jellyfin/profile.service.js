import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS } from './fields.js';

const GROUPED_BATCH_SIZE = 200;
// Caps how many raw Jellyfin rows we scan to build one grouped profile list.
// Keeps pathologically long histories from triggering unbounded upstream calls.
const MAX_RAW_ITEMS = 4000;

function getItems(userId, token, params = {}) {
  return jellyfinJson(`/Users/${userId}/Items`, {
    token,
    query: {
      Fields: COMMON_ITEM_FIELDS,
      ...params
    }
  });
}

async function fetchProfilePage(userId, token, { filters, includeItemTypes, sortBy, sortOrder, page, limit }) {
  const startIndex = (page - 1) * limit;
  const data = await getItems(userId, token, {
    Filters: filters,
    IncludeItemTypes: includeItemTypes,
    Recursive: 'true',
    SortBy: sortBy,
    SortOrder: sortOrder,
    StartIndex: startIndex,
    Limit: limit
  });

  return {
    items: data.Items || [],
    totalItems: data.TotalRecordCount || 0
  };
}

function groupKeyFor(item) {
  if (item.Type === 'Episode') return `Series:${item.SeriesId}`;
  if (item.Type === 'Series') return `Series:${item.Id}`;
  return `Movie:${item.Id}`;
}

// Episodes and an already-typed Series row for the same show normalize to the
// same key, so a series never appears twice even if Jellyfin returns both.
function dedupeByGroupKey(rawItems) {
  const order = [];
  const firstByKey = new Map();

  for (const item of rawItems) {
    const key = groupKeyFor(item);
    if (!firstByKey.has(key)) {
      firstByKey.set(key, item);
      order.push(key);
    }
  }

  return { order, firstByKey };
}

function buildFallbackSeries(episode) {
  return {
    Id: episode.SeriesId,
    Type: 'Series',
    Name: episode.SeriesName || 'Unbekannte Serie',
    SeriesPrimaryImageTag: episode.SeriesPrimaryImageTag,
    ImageTags: episode.SeriesPrimaryImageTag ? { Primary: episode.SeriesPrimaryImageTag } : {}
  };
}

async function resolveSeriesById(userId, token, seriesIds) {
  const metadataById = new Map();
  if (seriesIds.length === 0) return metadataById;

  const data = await getItems(userId, token, {
    Ids: seriesIds.join(','),
    IncludeItemTypes: 'Series',
    Recursive: 'true'
  });

  (data.Items || []).forEach(series => metadataById.set(series.Id, series));
  return metadataById;
}

async function groupProfileItems(userId, token, rawItems) {
  const { order, firstByKey } = dedupeByGroupKey(rawItems);

  const seriesIds = [...new Set(
    order
      .filter(key => key.startsWith('Series:'))
      .map(key => firstByKey.get(key))
      .map(item => (item.Type === 'Episode' ? item.SeriesId : item.Id))
  )];

  const seriesById = await resolveSeriesById(userId, token, seriesIds);

  return order.map(key => {
    const item = firstByKey.get(key);
    if (item.Type === 'Movie') return item;

    const seriesId = item.Type === 'Episode' ? item.SeriesId : item.Id;
    return seriesById.get(seriesId) || buildFallbackSeries(item);
  });
}

async function fetchGroupedProfilePage(userId, token, { filters, includeItemTypes, sortBy, sortOrder, page, limit }) {
  let rawItems = [];
  let startIndex = 0;

  while (rawItems.length < MAX_RAW_ITEMS) {
    const data = await getItems(userId, token, {
      Filters: filters,
      IncludeItemTypes: includeItemTypes,
      Recursive: 'true',
      SortBy: sortBy,
      SortOrder: sortOrder,
      StartIndex: startIndex,
      Limit: GROUPED_BATCH_SIZE
    });

    const batch = data.Items || [];
    rawItems = rawItems.concat(batch);
    startIndex += batch.length;

    if (batch.length < GROUPED_BATCH_SIZE) break;
  }

  const groupedItems = await groupProfileItems(userId, token, rawItems);
  const startOffset = (page - 1) * limit;

  return {
    items: groupedItems.slice(startOffset, startOffset + limit),
    totalItems: groupedItems.length
  };
}

export class ProfileService {
  static getContinueWatching(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchGroupedProfilePage(userId, token, {
      filters: 'IsResumable',
      includeItemTypes: 'Movie,Series,Episode',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      page,
      limit
    });
  }

  static getHistory(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchGroupedProfilePage(userId, token, {
      filters: 'IsPlayed',
      includeItemTypes: 'Movie,Series,Episode',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      page,
      limit
    });
  }

  static getFavorites(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchProfilePage(userId, token, {
      filters: 'IsFavorite',
      includeItemTypes: 'Movie,Series',
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      page,
      limit
    });
  }
}
