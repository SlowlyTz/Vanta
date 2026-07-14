import { LibraryService } from '../jellyfin/library.service.js';

export const INDEX_LIMIT = 2000;
const INDEX_CACHE_TTL = 30 * 1000;

const indexCache = new Map();

export const cacheMethods = {
  async _buildIndex(userId, accessToken) {
    const cacheKey = String(userId);
    const cached = indexCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < INDEX_CACHE_TTL) {
      return cached.promise;
    }

    const promise = LibraryService.getAllMoviesAndSeries(userId, accessToken, INDEX_LIMIT)
      .catch(error => {
        indexCache.delete(cacheKey);
        throw error;
      });

    indexCache.set(cacheKey, { timestamp: Date.now(), promise });
    return promise;
  }
};
