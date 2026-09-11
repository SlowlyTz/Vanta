import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS, TRAILER_ITEM_FIELDS } from './fields.js';
import { getFeaturedPublisherById, matchFeaturedPublisher } from '../../../public/js/constants/featuredPublishers.js';
import { ItemsService } from './items.service.js';
import { findNextEpisode } from '../../../player/src/nextEpisode.js';
import { getActiveCatalogReader } from '../catalog/reader.js';
import { getVisibleLibraryIds } from '../catalog/visibility.js';

const NEXT_EPISODE_PROGRESS_THRESHOLD = 90;

// Browsing reads come from the local catalogue mirror whenever it is filled;
// Jellyfin stays the fallback for a fresh install and for everything per-user
// (resume, playback state). Returns null when the mirror cannot answer.
async function fromCatalog(userId, token, read) {
  const reader = getActiveCatalogReader();
  if (!reader) return null;

  const libraryIds = await getVisibleLibraryIds(userId, token);
  return read(reader, libraryIds);
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
  static async getResumeItems(userId, token) {
    const data = await getItems(userId, token, {
      Filters: 'IsResumable',
      Recursive: 'true',
      SortBy: 'DatePlayed',
      SortOrder: 'Descending',
      Limit: 12
    });

    const resolved = await Promise.all(
      (data.Items || []).map(item => resolveResumeItem(userId, token, item))
    );

    return dedupeById(resolved.filter(Boolean));
  }

  static async getMovies(userId, token) {
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.newest({ type: 'Movie', libraryIds, limit: 24 }));
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
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.newest({ type: 'Series', libraryIds, limit: 24 }));
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
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.search({ query, libraryIds, limit: 50 }));
    if (mirrored) return mirrored;

    const data = await getItems(userId, token, {
      SearchTerm: query,
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      Limit: 50
    });
    return data.Items || [];
  }

  static async getGenres(userId, token, type) {
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.genres({ type, libraryIds }));
    if (mirrored) return mirrored;

    const data = await jellyfinJson('/Genres', {
      token,
      query: { userId, IncludeItemTypes: type, Recursive: 'true' }
    });
    return data.Items || [];
  }

  static async getStudios(userId, token) {
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.studios({ libraryIds }));
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
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.page({ type, libraryIds, genre, studios: studio ? [studio] : [], page, limit }));
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

    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.page({ type, libraryIds, genre, studios: studioNames, page, limit }));
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
    const mirrored = await fromCatalog(userId, token, (reader, libraryIds) =>
      reader.all({ libraryIds }));
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
