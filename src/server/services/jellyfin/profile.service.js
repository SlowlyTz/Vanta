import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS } from './fields.js';

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

export class ProfileService {
  static getContinueWatching(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchProfilePage(userId, token, {
      filters: 'IsResumable',
      includeItemTypes: 'Movie,Series,Episode',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      page,
      limit
    });
  }

  static getHistory(userId, token, { page = 1, limit = 24 } = {}) {
    return fetchProfilePage(userId, token, {
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
