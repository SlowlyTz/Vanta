import { LibraryService } from '../jellyfin/library.service.js';
import { setBounded } from '../../utils/boundedMap.js';

export const INDEX_LIMIT = 2000;
const INDEX_CACHE_TTL = 30 * 1000;

// Each entry holds a user's parsed catalogue: kept for few users at once.
const INDEX_CACHE_MAX = 50;
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

    setBounded(indexCache, cacheKey, { timestamp: Date.now(), promise }, { max: INDEX_CACHE_MAX, isExpired: entry => Date.now() - entry.timestamp >= INDEX_CACHE_TTL });
    return promise;
  }
};
