import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS, TRAILER_ITEM_FIELDS } from './fields.js';
import { getFeaturedPublisherById, matchFeaturedPublisher } from '../../../public/js/constants/featuredPublishers.js';

function getItems(userId, token, params = {}) {
  return jellyfinJson(`/Users/${userId}/Items`, {
    token,
    query: {
      Fields: COMMON_ITEM_FIELDS,
      ...params
    }
  });
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
    return data.Items || [];
  }

  static async getMovies(userId, token) {
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
    const data = await getItems(userId, token, {
      SearchTerm: query,
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      Limit: 50
    });
    return data.Items || [];
  }

  static async getGenres(userId, token, type) {
    const data = await jellyfinJson('/Genres', {
      token,
      query: { userId, IncludeItemTypes: type, Recursive: 'true' }
    });
    return data.Items || [];
  }

  static async getStudios(userId, token) {
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
