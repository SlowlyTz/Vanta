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

const SESSION_QUEUE_KEY = 'trailerQueue';

export class TrailersService {
  static async loadAllTrailerItems(userId, token, limit = 10000) {
    const items = await LibraryService.getAllMoviesAndSeries(userId, token, limit);
    return items
      .map((item) => normalizeTrailer(item))
      .filter((trailer) => trailer !== null);
  }

  static async getTrailerQueue(req, userId, token, refresh = false) {
    const existingQueue = req.session?.[SESSION_QUEUE_KEY];

    if (!refresh && Array.isArray(existingQueue) && existingQueue.length > 0) {
      return existingQueue;
    }

    const trailers = await this.loadAllTrailerItems(userId, token);
    const shuffled = shuffleArray(trailers);

    if (req.session) {
      req.session[SESSION_QUEUE_KEY] = shuffled;
    }

    return shuffled;
  }

  static async getTrailerPage(req, userId, token, cursor, limit, refresh = false) {
    const queue = await this.getTrailerQueue(req, userId, token, refresh);
    const startIndex = Math.max(0, parseInt(cursor, 10) || 0);
    const clampedLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 8));

    const items = queue.slice(startIndex, startIndex + clampedLimit);
    const nextCursor = startIndex + items.length;
    const hasMore = nextCursor < queue.length;

    return {
      items,
      nextCursor: hasMore ? String(nextCursor) : null,
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
