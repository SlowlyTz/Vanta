import { randomUUID } from 'node:crypto';
import { jellyfinJson } from './client.js';
import { LibraryService } from './library.service.js';

export const YOUTUBE_VIDEO_ID_LENGTH = 11;

export function isYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtu.be' ||
      host === 'www.youtu.be' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    );
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      const searchParams = parsed.searchParams;
      const v = searchParams.get('v');
      if (v) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
        return pathParts[1] || null;
      }

      if (pathParts[0] === 'watch') {
        return searchParams.get('v') || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function findYouTubeTrailerUrl(item) {
  if (!item || typeof item !== 'object') return null;

  if (Array.isArray(item.RemoteTrailers)) {
    const trailer = item.RemoteTrailers.find(
      (rt) => rt && isYouTubeUrl(rt.Url)
    );
    if (trailer) return trailer.Url;
  }

  if (Array.isArray(item.ExternalUrls)) {
    const trailer = item.ExternalUrls.find(
      (eu) => eu && isYouTubeUrl(eu.Url)
    );
    if (trailer) return trailer.Url;
  }

  if (isYouTubeUrl(item.TrailerUrl)) {
    return item.TrailerUrl;
  }

  return null;
}

export function normalizeTrailer(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.Type !== 'Movie' && item.Type !== 'Series') return null;

  const youtubeUrl = findYouTubeTrailerUrl(item);
  if (!youtubeUrl) return null;

  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
  if (!youtubeVideoId || youtubeVideoId.length < YOUTUBE_VIDEO_ID_LENGTH) return null;

  return {
    id: `${item.Id}:${youtubeVideoId}`,
    itemId: item.Id,
    itemType: item.Type,
    title: item.Name || '',
    overview: item.Overview || '',
    year: item.ProductionYear || null,
    typeLabel: item.Type === 'Movie' ? 'Film' : 'Serie',
    fsk: item.OfficialRating || null,
    rating: item.CommunityRating || null,
    criticRating: item.CriticRating || null,
    backdropUrl: null,
    primaryImageTag: item.ImageTags?.Primary || null,
    backdropImageTag: item.BackdropImageTags?.[0] || null,
    youtubeVideoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    isFavorite: Boolean(item.UserData?.IsFavorite)
  };
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const SESSION_FEED_KEY = 'trailerFeed';
const CATALOG_TTL_MS = 10 * 60 * 1000;

// Keyed by userId, holding the in-flight promise so parallel requests share one Jellyfin
// roundtrip. The shuffle happens per feed, not per catalog fetch, so caching here does not make
// the feed repeat itself.
const catalogCache = new Map();

export class TrailersService {
  static async loadAllTrailerItems(userId, token, limit = 10000) {
    const items = await LibraryService.getAllMoviesAndSeries(userId, token, limit);
    return items
      .map((item) => normalizeTrailer(item))
      .filter((trailer) => trailer !== null);
  }

  static clearCatalogCache() {
    catalogCache.clear();
  }

  static async getCatalog(userId, token) {
    const cacheKey = String(userId);
    const cached = catalogCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CATALOG_TTL_MS) {
      return cached.promise;
    }

    const promise = this.loadAllTrailerItems(userId, token)
      .then((list) => ({
        list,
        byId: new Map(list.map((trailer) => [trailer.id, trailer]))
      }))
      .catch((error) => {
        catalogCache.delete(cacheKey);
        throw error;
      });

    catalogCache.set(cacheKey, { timestamp: Date.now(), promise });
    return promise;
  }

  static async getTrailerFeed(req, userId, token, feedId) {
    const catalog = await this.getCatalog(userId, token);
    const existingFeed = req.session?.[SESSION_FEED_KEY];

    if (feedId && existingFeed?.id === feedId && Array.isArray(existingFeed.order)) {
      return { catalog, feed: existingFeed };
    }

    // No feed id, or one this session does not know: a full page load asked for a brand new
    // random order.
    const feed = {
      id: randomUUID(),
      order: shuffleArray(catalog.list).map((trailer) => trailer.id)
    };

    if (req.session) {
      req.session[SESSION_FEED_KEY] = feed;
    }

    return { catalog, feed };
  }

  static async getTrailerPage(req, userId, token, { feedId = null, cursor = null, limit = null, target = null } = {}) {
    const { catalog, feed } = await this.getTrailerFeed(req, userId, token, feedId);
    const { order } = feed;

    const clampedLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 8));

    let startIndex;
    if (cursor === null || cursor === undefined || cursor === '') {
      // A share link or a return from the detail page enters the feed where that trailer
      // already sits, instead of reordering the feed around it.
      const targetIndex = target ? order.indexOf(target) : -1;
      startIndex = targetIndex > 0 ? targetIndex : 0;
    } else {
      startIndex = Math.max(0, parseInt(cursor, 10) || 0);
    }

    // The catalog can change while a feed is alive, so ids may no longer resolve. Skipping past
    // them here keeps the client from receiving an empty page and dead-ending its navigation.
    const items = [];
    let scanIndex = startIndex;
    while (items.length < clampedLimit && scanIndex < order.length) {
      const trailer = catalog.byId.get(order[scanIndex]);
      if (trailer) items.push(trailer);
      scanIndex += 1;
    }

    const hasMore = scanIndex < order.length;

    return {
      feedId: feed.id,
      items,
      nextCursor: hasMore ? String(scanIndex) : null,
      hasMore
    };
  }

  static async setFavorite(userId, token, itemId, isFavorite) {
    const method = isFavorite ? 'POST' : 'DELETE';
    await jellyfinJson(`/Users/${userId}/FavoriteItems/${itemId}`, {
      token,
      method
    });
    return { isFavorite };
  }
}
