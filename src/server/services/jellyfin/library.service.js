import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS, TRAILER_ITEM_FIELDS } from './fields.js';
import { getFeaturedPublisherById, matchFeaturedPublisher } from '../../../public/js/constants/featuredPublishers.js';
import { ItemsService } from './items.service.js';
import { findNextEpisode } from '../../../player/src/nextEpisode.js';
import { getActiveCatalogReader } from '../catalog/reader.js';
import { getCatalogAccess } from '../catalog/visibility.js';
import { visibleResumeItems } from '../resume-visibility.js';
import { itemMatchesFilters } from '../catalog/search.js';

const NEXT_EPISODE_PROGRESS_THRESHOLD = 90;

// "Weiter schauen" shows this many; more are fetched, since hidden series
// and finished episodes drop out before the row is cut to size.
export const RESUME_LIMIT = 12;
const RESUME_FETCH_LIMIT = 36;
// Only what can be played on: films and episodes (never a season or a
// series as such).
const RESUMABLE_TYPES = ['Movie', 'Episode', 'Video'];

// The search without the catalogue filters what Jellyfin found itself, so
// it asks for more than it shows.
const FALLBACK_SEARCH_POOL = 200;

// Browsing reads come from the local catalogue mirror whenever it is filled;
// Jellyfin stays the fallback for a fresh install and for everything per-user
// (resume, playback state). Returns null when the mirror cannot answer.
async function fromCatalog(userId, token, read) {
  const reader = getActiveCatalogReader();
  if (!reader) return null;

  return read(reader, await getCatalogAccess(userId, token));
}

function getItems(userId, token, params = {}) {
  return jellyfinJson(`/Users/${userId}/Items`, {
    token,
    query: {
      Fields: COMMON_ITEM_FIELDS,
      ...params
    }
  });
}

function shouldPromoteContinueWatchingEpisode(item) {
  if (item.Type !== 'Episode') return false;
  const percent = Number(item.UserData?.PlayedPercentage);
  if (Number.isFinite(percent)) return percent >= NEXT_EPISODE_PROGRESS_THRESHOLD;

  const ticks = Number(item.UserData?.PlaybackPositionTicks || 0);
  const runtime = Number(item.RunTimeTicks || 0);
  return runtime > 0 && ticks / runtime >= 0.9;
}

async function buildEpisodeContext(userId, token, seriesId) {
  const seasons = await ItemsService.getSeasons(userId, token, seriesId);
  // One round-trip per season, all at once: sequentially a six-season show
  // costs seven Jellyfin round-trips before the resume row can render.
  const episodeLists = await Promise.all(
    seasons.map(season => ItemsService.getEpisodes(userId, token, seriesId, season.Id))
  );
  const episodesBySeason = Object.fromEntries(seasons.map((season, index) => [season.Id, episodeLists[index]]));

  return { seasons, episodesBySeason };
}

// Near-finished episodes resume into a stale, almost-watched episode rather than the
// next one, so promote them to the next episode (or drop them once the series is caught up).
async function resolveResumeItem(userId, token, item) {
  if (!shouldPromoteContinueWatchingEpisode(item) || !item.SeriesId) return item;

  const context = await buildEpisodeContext(userId, token, item.SeriesId);
  const next = findNextEpisode(context, item.Id);
  return next?.episode || null;
}

// An entry of the row may only be a film or an episode; the next episode
// found above carries no Type when Jellyfin left it out.
const isResumableEntry = (item) => !item?.Type || RESUMABLE_TYPES.includes(item.Type);

function dedupeById(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item?.Id || seen.has(item.Id)) continue;
    seen.add(item.Id);
    result.push(item);
  }

  return result;
}

export class LibraryService {
  // Resolved a row's worth at a time (each near-finished episode costs a
  // look at its series), until the row is full or nothing is left.
  static async getResumeItems(userId, token) {
    const data = await getItems(userId, token, {
      Filters: 'IsResumable',
      IncludeItemTypes: RESUMABLE_TYPES.join(','),
      Recursive: 'true',
      SortBy: 'DatePlayed',
      SortOrder: 'Descending',
      Limit: RESUME_FETCH_LIMIT
    });

    const candidates = visibleResumeItems(userId, (data.Items || []).filter(isResumableEntry));
    let result = [];
    for (let i = 0; i < candidates.length && result.length < RESUME_LIMIT; i += RESUME_LIMIT) {
      const resolved = await Promise.all(candidates.slice(i, i + RESUME_LIMIT).map(item => resolveResumeItem(userId, token, item)));
      result = dedupeById([...result, ...resolved.filter(item => item && isResumableEntry(item))]);
    }
    return result.slice(0, RESUME_LIMIT);
  }

  static async getMovies(userId, token) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.newest({ type: 'Movie', libraryIds, ageLimit, limit: 24 }));
    if (mirrored) return mirrored;

    const data = await getItems(userId, token, {
      IncludeItemTypes: 'Movie',
      Recursive: 'true',
      SortBy: 'DateCreated,SortName',
      SortOrder: 'Descending',
      Limit: 24
    });
    return data.Items || [];
  }

  static async getSeries(userId, token) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.newest({ type: 'Series', libraryIds, ageLimit, limit: 24 }));
    if (mirrored) return mirrored;

    const data = await getItems(userId, token, {
      IncludeItemTypes: 'Series',
      Recursive: 'true',
      SortBy: 'DateCreated,SortName',
      SortOrder: 'Descending',
      Limit: 24
    });
    return data.Items || [];
  }

  static async search(userId, token, query) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.search({ query, libraryIds, ageLimit, limit: 50 }));
    if (mirrored) return mirrored;

    const data = await getItems(userId, token, {
      SearchTerm: query,
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      Limit: 50
    });
    return data.Items || [];
  }

  // The search page: ranked titles (typo-tolerant, filtered) and matching
  // people. Without the catalogue Jellyfin answers the titles alone, with
  // the same filters applied to what it found.
  static async searchFull(userId, token, query, filters = {}, { limit = 60 } = {}) {
    const text = String(query || '').trim();
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) => ({
      items: reader.search({ query: text, libraryIds, ageLimit, filters, limit }),
      people: filters.peopleToo === false ? [] : reader.searchPeople({ query: text, libraryIds, ageLimit })
    }));
    if (mirrored) return mirrored;

    const hasFilter = filters.types?.length || filters.genres?.length || Number.isFinite(filters.decade) || Number.isFinite(filters.maxAge) || filters.unwatched;
    if (!text && !hasFilter) return { items: [], people: [] };
    const params = {
      IncludeItemTypes: filters.types?.length ? filters.types.join(',') : 'Movie,Series',
      Recursive: 'true',
      Fields: `${COMMON_ITEM_FIELDS},OfficialRating`,
      Limit: FALLBACK_SEARCH_POOL
    };
    // A text search keeps Jellyfin's own order; a filter alone goes by name.
    if (text) params.SearchTerm = text;
    else Object.assign(params, { SortBy: 'SortName', SortOrder: 'Ascending' });
    if (filters.genres?.length) params.Genres = filters.genres.join('|');
    if (filters.unwatched) params.Filters = 'IsUnplayed';
    const data = await jellyfinJson(`/Users/${userId}/Items`, { token, query: params });
    const items = (data.Items || []).filter(item => itemMatchesFilters(item, filters)).slice(0, limit);
    return { items, people: [] };
  }

  // The screensaver's titles; without the catalogue there are none.
  static async getScreensaverItems(userId, token, limit = 30) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) => reader.screensaver({ libraryIds, ageLimit, limit }));
    return mirrored || [];
  }

  // Null without the catalogue: then every decade stays on offer.
  static async getDecades(userId, token) {
    return fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) => reader.decades({ libraryIds, ageLimit }));
  }

  static async getGenres(userId, token, type) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.genres({ type, libraryIds, ageLimit }));
    if (mirrored) return mirrored;

    const data = await jellyfinJson('/Genres', {
      token,
      query: { userId, IncludeItemTypes: type, Recursive: 'true' }
    });
    return data.Items || [];
  }

  static async getStudios(userId, token) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.studios({ libraryIds, ageLimit }));
    if (mirrored) return mirrored;

    const data = await jellyfinJson('/Studios', {
      token,
      query: {
        userId,
        Recursive: 'true',
        SortBy: 'SortName',
        SortOrder: 'Ascending'
      }
    });
    return data.Items || [];
  }

  static async getLibrary(userId, token, type, genre = null, studio = null, page = 1, limit = 50) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.page({ type, libraryIds, ageLimit, genre, studios: studio ? [studio] : [], page, limit }));
    if (mirrored) return mirrored;

    const types = type.split(',').map(t => t.trim()).filter(Boolean);

    if (types.length <= 1) {
      return this._fetchLibraryPage(userId, token, types[0] || type, genre, studio, page, limit);
    }

    const allResults = await Promise.all(
      types.map(t => this._fetchLibraryPage(userId, token, t, genre, studio, 1, 100000))
    );

    const allItems = allResults.flatMap(r => r.items);
    const totalRecordCount = allResults.reduce((sum, r) => sum + r.totalRecordCount, 0);

    allItems.sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));

    const startIndex = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);

    return { items: paginatedItems, totalRecordCount };
  }

  static async getPublisherStudioNames(userId, token, publisherId) {
    const publisher = getFeaturedPublisherById(publisherId);
    if (!publisher) {
      const error = new Error(`Unknown publisher: ${publisherId}`);
      error.status = 400;
      throw error;
    }

    const studios = await this.getStudios(userId, token);
    return studios
      .filter(studio => matchFeaturedPublisher(studio.Name)?.id === publisherId)
      .map(studio => studio.Name);
  }

  static async getLibraryByPublisher(userId, token, type, publisherId, genre = null, page = 1, limit = 50) {
    const studioNames = await this.getPublisherStudioNames(userId, token, publisherId);
    return this.getLibraryByStudioNames(userId, token, type, studioNames, genre, page, limit);
  }

  static async getLibraryByStudioNames(userId, token, type, studioNames, genre = null, page = 1, limit = 50) {
    if (studioNames.length === 0) {
      return { items: [], totalRecordCount: 0 };
    }

    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.page({ type, libraryIds, ageLimit, genre, studios: studioNames, page, limit }));
    if (mirrored) return mirrored;

    const types = type.split(',').map(t => t.trim()).filter(Boolean);
    const requests = [];

    for (const itemType of types.length ? types : [type]) {
      for (const studioName of studioNames) {
        requests.push(this._fetchLibraryPage(userId, token, itemType, genre, studioName, 1, 100000));
      }
    }

    const results = await Promise.all(requests);
    const byId = new Map();

    for (const item of results.flatMap(result => result.items)) {
      if (item?.Id) byId.set(item.Id, item);
    }

    const allItems = Array.from(byId.values())
      .sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));

    const startIndex = (page - 1) * limit;
    return {
      items: allItems.slice(startIndex, startIndex + limit),
      totalRecordCount: allItems.length
    };
  }

  static async getAllMoviesAndSeries(userId, token, limit = 2000) {
    const mirrored = await fromCatalog(userId, token, (reader, { libraryIds, ageLimit }) =>
      reader.all({ libraryIds, ageLimit }));
    if (mirrored) return mirrored;

    const data = await getItems(userId, token, {
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      Fields: TRAILER_ITEM_FIELDS,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      Limit: limit
    });
    return data.Items || [];
  }

  static async _fetchLibraryPage(userId, token, type, genre, studio, page, limit) {
    const startIndex = (page - 1) * limit;
    const query = {
      IncludeItemTypes: type,
      Recursive: 'true',
      Fields: COMMON_ITEM_FIELDS,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      StartIndex: startIndex,
      Limit: limit
    };

    if (genre) query.Genres = genre;
    if (studio) query.Studios = studio;

    const data = await getItems(userId, token, query);
    return {
      items: data.Items || [],
      totalRecordCount: data.TotalRecordCount || 0
    };
  }
}
