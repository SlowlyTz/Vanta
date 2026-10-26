// The trailer feed: YouTube trailers from the user's library in a per-feed random order,
// skipping videos YouTube no longer plays.
import { randomUUID } from 'node:crypto';
import { jellyfinJson } from '../jellyfin/client.js';
import { LibraryService } from './library.service.js';
import { setBounded } from '../../utils/boundedMap.js';
import { shuffle } from '../../utils/shuffle.js';

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
    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`
  };
}


// Whether YouTube still plays a video in an embed: its oEmbed answer is 200
// for a public, embeddable video and 401/403/404/400 for a private, removed
// or embed-blocked one. No key or account needed. Anything else (a timeout,
// YouTube down) counts as playable, so an outage never empties the feed.
const AVAILABLE_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 6 * 60 * 60 * 1000;
const AVAILABILITY_TIMEOUT_MS = 3000;
const availabilityCache = new Map(); // videoId -> { ok, until }

export async function isYouTubeVideoPlayable(videoId, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cached = availabilityCache.get(videoId);
  if (cached && cached.until > now()) return cached.ok;
  let ok = true;
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(AVAILABILITY_TIMEOUT_MS) });
    if ([400, 401, 403, 404].includes(response.status)) ok = false;
  } catch {
    return true;
  }
  availabilityCache.set(videoId, { ok, until: now() + (ok ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS) });
  return ok;
}

export function clearYouTubeAvailabilityCache() {
  availabilityCache.clear();
}

const CATALOG_TTL_MS = 10 * 60 * 1000;
// A feed is one random order of a user's trailers, kept in memory (not in the
// session, which is written to disk on every save) while it is scrolled.
const feeds = new Map();
const FEED_TTL_MS = 6 * 60 * 60 * 1000;
const FEEDS_MAX = 1000;

// Keyed by userId, holding the in-flight promise so parallel requests share one Jellyfin
// roundtrip. The shuffle happens per feed, not per catalog fetch, so caching here does not make
// the feed repeat itself.
const catalogCache = new Map();
// Each entry holds a user's whole trailer list.
const CATALOG_CACHE_MAX = 50;

export class TrailersService {
  // Replaced in tests; asks YouTube whether a trailer still plays.
  static isPlayable = videoId => isYouTubeVideoPlayable(videoId);

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

    setBounded(catalogCache, cacheKey, { timestamp: Date.now(), promise }, { max: CATALOG_CACHE_MAX, isExpired: entry => Date.now() - entry.timestamp >= CATALOG_TTL_MS });
    return promise;
  }

  static async getTrailerFeed(userId, token, feedId) {
    const catalog = await this.getCatalog(userId, token);
    const existing = feedId ? feeds.get(feedId) : null;

    if (existing && existing.userId === userId && Date.now() - existing.at < FEED_TTL_MS) {
      return { catalog, feed: existing };
    }

    // No feed id, or one that is unknown or gone: a full page load asked for
    // a brand new random order.
    const feed = {
      id: randomUUID(),
      userId,
      at: Date.now(),
      order: shuffle(catalog.list).map((trailer) => trailer.id)
    };
    setBounded(feeds, feed.id, feed, { max: FEEDS_MAX, isExpired: entry => Date.now() - entry.at >= FEED_TTL_MS });
    return { catalog, feed };
  }

  // The id order of a feed (tests and debugging).
  static feedOrder(feedId) {
    return feeds.get(feedId)?.order || null;
  }

  static async getTrailerPage(userId, token, { feedId = null, cursor = null, limit = null, target = null } = {}) {
    const { catalog, feed } = await this.getTrailerFeed(userId, token, feedId);
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

    // The catalog can change while a feed is alive, so ids may no longer resolve, and a trailer
    // may have gone private on YouTube. Skipping past both here keeps the client from receiving
    // an empty page, dead-ending its navigation or showing a player that can never start.
    const items = [];
    let scanIndex = startIndex;
    while (items.length < clampedLimit && scanIndex < order.length) {
      const batch = [];
      while (batch.length < clampedLimit - items.length && scanIndex < order.length) {
        const trailer = catalog.byId.get(order[scanIndex]);
        if (trailer) batch.push(trailer);
        scanIndex += 1;
      }
      const playable = await Promise.all(batch.map(trailer => this.isPlayable(trailer.youtubeVideoId).catch(() => true)));
      batch.forEach((trailer, index) => {
        if (playable[index]) items.push(trailer);
      });
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
