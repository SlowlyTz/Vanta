import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS } from './fields.js';
import { visibleResumeItems } from '../resume-visibility.js';

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

async function fetchGroupedProfilePage(userId, token, { filters, includeItemTypes, sortBy, sortOrder, page, limit, keep = items => items }) {
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

  const groupedItems = await groupProfileItems(userId, token, keep(rawItems));
  const startOffset = (page - 1) * limit;

  return {
    items: groupedItems.slice(startOffset, startOffset + limit),
    totalItems: groupedItems.length
  };
}

// What one has watched, for the profile's head: counted over every played
// film and episode (up to a cap), kept a few minutes per account.
const STATS_BATCH_SIZE = 1000;
const MAX_STATS_ITEMS = 20000;
const STATS_TTL_MS = 5 * 60 * 1000;
const TICKS_PER_MINUTE = 600000000;
const statsCache = new Map(); // userId -> { at, promise }

async function fetchAllPlayed(userId, token, type) {
  let items = [];
  let total = 0;
  while (items.length < MAX_STATS_ITEMS) {
    const data = await jellyfinJson(`/Users/${userId}/Items`, {
      token,
      query: {
        Filters: 'IsPlayed',
        IncludeItemTypes: type,
        Recursive: 'true',
        Fields: 'Genres',
        EnableImages: 'false',
        StartIndex: items.length,
        Limit: STATS_BATCH_SIZE
      }
    });
    const batch = data.Items || [];
    total = Math.max(total, data.TotalRecordCount || 0);
    items = items.concat(batch);
    if (batch.length < STATS_BATCH_SIZE) break;
  }
  return { items, total: Math.max(total, items.length) };
}

async function fetchSeriesGenres(userId, token, seriesIds) {
  const genres = new Map();
  for (let index = 0; index < seriesIds.length; index += GROUPED_BATCH_SIZE) {
    const data = await jellyfinJson(`/Users/${userId}/Items`, {
      token,
      query: { Ids: seriesIds.slice(index, index + GROUPED_BATCH_SIZE).join(','), Fields: 'Genres', EnableImages: 'false' }
    });
    (data.Items || []).forEach(series => genres.set(series.Id, series.Genres || []));
  }
  return genres;
}

// The last title one watched, as the film or the series it belongs to.
async function fetchLastWatched(userId, token) {
  for (const filters of ['IsPlayed', 'IsResumable']) {
    const data = await getItems(userId, token, {
      Filters: filters,
      IncludeItemTypes: 'Movie,Episode',
      Recursive: 'true',
      SortBy: 'DatePlayed',
      SortOrder: 'Descending',
      Limit: 1
    });
    const item = data.Items?.[0];
    if (!item) continue;
    if (item.Type !== 'Episode') return item;
    const series = await resolveSeriesById(userId, token, [item.SeriesId]);
    return series.get(item.SeriesId) || buildFallbackSeries(item);
  }
  return null;
}

async function buildStats(userId, token) {
  const [movies, episodes, lastWatched] = await Promise.all([
    fetchAllPlayed(userId, token, 'Movie'),
    fetchAllPlayed(userId, token, 'Episode'),
    fetchLastWatched(userId, token).catch(() => null)
  ]);
  const minutesOf = item => (Number(item.RunTimeTicks) || 0) / TICKS_PER_MINUTE;
  const genreMinutes = new Map();
  const addGenres = (genres, minutes) => {
    for (const genre of genres || []) genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + Math.max(minutes, 1));
  };

  let minutes = 0;
  for (const movie of movies.items) {
    minutes += minutesOf(movie);
    addGenres(movie.Genres, minutesOf(movie));
  }
  const minutesBySeries = new Map();
  for (const episode of episodes.items) {
    minutes += minutesOf(episode);
    if (episode.SeriesId) minutesBySeries.set(episode.SeriesId, (minutesBySeries.get(episode.SeriesId) || 0) + minutesOf(episode));
  }
  const seriesGenres = await fetchSeriesGenres(userId, token, [...minutesBySeries.keys()]).catch(() => new Map());
  for (const [seriesId, seriesMinutes] of minutesBySeries) addGenres(seriesGenres.get(seriesId), seriesMinutes);

  return {
    movies: movies.total,
    episodes: episodes.total,
    series: minutesBySeries.size,
    minutes: Math.round(minutes),
    topGenres: [...genreMinutes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre),
    lastWatched
  };
}

export function resetProfileStatsCache() {
  statsCache.clear();
}

export class ProfileService {
  static getStats(userId, token, { now = Date.now() } = {}) {
    const cached = statsCache.get(userId);
    if (cached && now - cached.at < STATS_TTL_MS) return cached.promise;
    const promise = buildStats(userId, token);
    statsCache.set(userId, { at: now, promise });
    // A failed count is not kept.
    promise.catch(() => {
      if (statsCache.get(userId)?.promise === promise) statsCache.delete(userId);
    });
    return promise;
  }

  static getContinueWatching(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchGroupedProfilePage(userId, token, {
      filters: 'IsResumable',
      includeItemTypes: 'Movie,Series,Episode',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      page,
      limit,
      keep: items => visibleResumeItems(userId, items)
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
