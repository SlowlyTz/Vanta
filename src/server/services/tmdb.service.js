import env from '../config/env.js';
import db from '../db/database.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_REQUEST_TIMEOUT_MS = Number(process.env.TMDB_REQUEST_TIMEOUT_MS || 2500);

const cacheMovie = db.prepare(`INSERT OR REPLACE INTO tmdb_media (tmdb_id, tmdb_type, title, overview, poster_path, backdrop_path, release_date, media_type, score, vote_count, cached_at) VALUES (?, 'movie', ?, ?, ?, ?, ?, 'movie', ?, ?, ?)`);
const cacheTv = db.prepare(`INSERT OR REPLACE INTO tmdb_media (tmdb_id, tmdb_type, title, overview, poster_path, backdrop_path, first_air_date, media_type, score, vote_count, cached_at) VALUES (?, 'tv', ?, ?, ?, ?, ?, 'tv', ?, ?, ?)`);
const getCached = db.prepare('SELECT * FROM tmdb_media WHERE tmdb_id = ? AND tmdb_type = ?');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map();
const MEMORY_CACHE_MAX_ENTRIES = 500;

// The request detail page asks for details and a cross-check at the same time,
// and a multi-season submit fires one POST per season. Without this, every one
// of those concurrent calls misses the cache and hits TMDB again.
const inFlight = new Map();

function dedupe(key, run) {
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

function getMemoryCache(key, ttlMs) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMemoryCache(key, data) {
  // Entries are only evicted on an expired read, so bound the map: detail objects
  // are far larger than the trailer stubs this cache originally held.
  if (!memoryCache.has(key) && memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    memoryCache.delete(memoryCache.keys().next().value);
  }
  memoryCache.set(key, { data, timestamp: Date.now() });
}

const TRAILER_CACHE_TTL = 24 * 60 * 60 * 1000;
const DETAIL_CACHE_TTL = 60 * 60 * 1000;

function findTmdbYouTubeTrailer(videos = []) {
  const preferred = videos
    .filter(video => video.site === 'YouTube' && video.key)
    .sort((a, b) => {
      const typeScore = (video) => video.type === 'Trailer' ? 0 : video.type === 'Teaser' ? 1 : 2;
      return typeScore(a) - typeScore(b);
    });

  const video = preferred[0];
  return video ? {
    site: 'YouTube',
    key: video.key,
    name: video.name || 'Trailer',
    type: video.type || 'Trailer'
  } : null;
}

const isV4Token = env.TMDB_API_KEY.startsWith('eyJ');

const buildTmdbUrl = (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  if (!isV4Token) {
    url.searchParams.set('api_key', env.TMDB_API_KEY);
  }

  return url;
};

const fetchTmdbJson = async (path, params = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TMDB_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(buildTmdbUrl(path, params), {
      headers: isV4Token ? { Authorization: `Bearer ${env.TMDB_API_KEY}` } : {},
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`TMDB request timed out after ${TMDB_REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.status_message || data.errors?.join(', ') || response.statusText;
    throw new Error(`TMDB request failed: ${message}`);
  }

  return data;
};

async function getYouTubeTrailer(tmdbType, tmdbId) {
  const cacheKey = `tmdb_trailer_${tmdbType}_${tmdbId}`;
  const cached = getMemoryCache(cacheKey, TRAILER_CACHE_TTL);
  if (cached) return cached.trailer;

  const path = tmdbType === 'tv' ? `/tv/${tmdbId}/videos` : `/movie/${tmdbId}/videos`;
  let trailer = null;

  try {
    const deVideos = await fetchTmdbJson(path, { language: 'de-DE' });
    trailer = findTmdbYouTubeTrailer(deVideos.results || []);

    if (!trailer) {
      const enVideos = await fetchTmdbJson(path, { language: 'en-US' });
      trailer = findTmdbYouTubeTrailer(enVideos.results || []);
    }
  } catch (error) {
    trailer = null;
  }

  setMemoryCache(cacheKey, { trailer });
  return trailer;
}

class TmdbService {
  static async search(query, page = 1) {
    const searchParams = {
      query,
      language: 'de-DE',
      page
    };

    const [movies, tv] = await Promise.all([
      fetchTmdbJson('/search/movie', searchParams),
      fetchTmdbJson('/search/tv', searchParams)
    ]);

    const results = [
      ...(movies.results || []).map((m) => ({ ...m, media_type: 'movie' })),
      ...(tv.results || []).map((m) => ({ ...m, media_type: 'tv' })),
    ];

    // Cache all results
    const now = Date.now();
    for (const item of results) {
      if (item.media_type === 'movie') {
        cacheMovie.run(item.id, item.title, item.overview, item.poster_path, item.backdrop_path, item.release_date, item.vote_average ?? 0, item.vote_count ?? 0, now);
      } else {
        cacheTv.run(item.id, item.name || item.title, item.overview, item.poster_path, item.backdrop_path, item.first_air_date, item.vote_average ?? 0, item.vote_count ?? 0, now);
      }
    }

    return {
      results,
      total_results: (movies.results || []).length + (tv.results || []).length,
    };
  }

  static async getMovieDetails(movieId) {
    // Check cache
    const cached = getCached.get(movieId, 'movie');
    if (cached && (Date.now() - cached.cached_at < CACHE_TTL)) {
      const trailer = await getYouTubeTrailer('movie', movieId);
      return { ...cached, id: cached.tmdb_id, media_type: 'movie', trailer };
    }

    const [details, credits, trailer] = await Promise.all([
      fetchTmdbJson(`/movie/${movieId}`, { language: 'de-DE' }),
      fetchTmdbJson(`/movie/${movieId}/credits`, { language: 'de-DE' }),
      getYouTubeTrailer('movie', movieId)
    ]);

    cacheMovie.run(movieId, details.title, details.overview, details.poster_path, details.backdrop_path, details.release_date, details.vote_average ?? 0, details.vote_count ?? 0, Date.now());

    return {
      id: movieId,
      ...details,
      media_type: 'movie',
      cast: credits.cast?.slice(0, 10) || [],
      runtime: details.runtime,
      trailer
    };
  }

  // Deliberately not served from the tmdb_media row: it holds neither seasons nor cast, and its
  // primary key has no type discriminator, so a movie cached under the same id would answer here.
  static async getTvDetails(tvId) {
    const cacheKey = `tmdb_tv_details_${tvId}`;
    const cached = getMemoryCache(cacheKey, DETAIL_CACHE_TTL);
    if (cached) return { ...cached };

    return dedupe(cacheKey, () => this.#fetchTvDetails(tvId, cacheKey));
  }

  static async #fetchTvDetails(tvId, cacheKey) {
    const row = getCached.get(tvId, 'tv');

    try {
      const [details, credits, trailer] = await Promise.all([
        fetchTmdbJson(`/tv/${tvId}`, { language: 'de-DE' }),
        fetchTmdbJson(`/tv/${tvId}/credits`, { language: 'de-DE' }),
        getYouTubeTrailer('tv', tvId)
      ]);

      // TmdbService.search already wrote a fresh row for anything just searched;
      // rewriting it would re-serialise the whole database for nothing.
      if (!row || Date.now() - row.cached_at >= CACHE_TTL) {
        cacheTv.run(tvId, details.name, details.overview, details.poster_path, details.backdrop_path, details.first_air_date, details.vote_average ?? 0, details.vote_count ?? 0, Date.now());
      }

      const result = {
        ...details,
        media_type: 'tv',
        seasons: details.seasons || [],
        cast: credits.cast?.slice(0, 10) || [],
        trailer
      };

      setMemoryCache(cacheKey, result);
      return { ...result };
    } catch (error) {
      // The row holds no seasons, so it cannot serve a full detail request — but
      // degrading to it beats a 500 when TMDB is slow or down.
      if (!row) throw error;
      console.error(`[TmdbService] TV details for ${tvId} unavailable, serving the cached row:`, error.message);
      return { ...row, id: row.tmdb_id, media_type: 'tv', seasons: [], cast: [], trailer: null };
    }
  }

  static async getSeasonDetails(tvId, seasonNumber) {
    const cacheKey = `tmdb_season_details_${tvId}_${seasonNumber}`;
    const cached = getMemoryCache(cacheKey, DETAIL_CACHE_TTL);
    if (cached) return { ...cached };

    return dedupe(cacheKey, async () => {
      const season = await fetchTmdbJson(`/tv/${tvId}/season/${seasonNumber}`, { language: 'de-DE' });
      const result = { ...season, episodes: season.episodes || [] };

      setMemoryCache(cacheKey, result);
      return { ...result };
    });
  }

  static async getTrending(timeWindow = 'week', limit = 20) {
    const cacheKey = `tmdb_trending_${timeWindow}`;
    const cached = getMemoryCache(cacheKey, 60 * 60 * 1000);
    if (cached) return cached.slice(0, limit);

    const data = await fetchTmdbJson(`/trending/all/${timeWindow}`, { language: 'de-DE' });
    const results = (data.results || [])
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => ({
        id: item.id,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        mediaType: item.media_type,
        releaseDate: item.release_date || item.first_air_date,
        popularity: item.popularity || 0
      }));

    setMemoryCache(cacheKey, results);
    return results.slice(0, limit);
  }

  static async getPopular(limit = 20) {
    const cacheKey = 'tmdb_popular';
    const cached = getMemoryCache(cacheKey, 60 * 60 * 1000);
    if (cached) return cached.slice(0, limit);

    const [movies, tv] = await Promise.all([
      fetchTmdbJson('/movie/popular', { language: 'de-DE' }),
      fetchTmdbJson('/tv/popular', { language: 'de-DE' })
    ]);

    const results = [
      ...(movies.results || []).map(item => ({
        id: item.id,
        title: item.title,
        originalTitle: item.original_title,
        mediaType: 'movie',
        releaseDate: item.release_date,
        popularity: item.popularity || 0
      })),
      ...(tv.results || []).map(item => ({
        id: item.id,
        title: item.name,
        originalTitle: item.original_name,
        mediaType: 'tv',
        releaseDate: item.first_air_date,
        popularity: item.popularity || 0
      }))
    ];

    results.sort((a, b) => b.popularity - a.popularity);

    setMemoryCache(cacheKey, results);
    return results.slice(0, limit);
  }

  static async getNowPlaying(limit = 60, region = 'DE') {
    const cacheKey = `tmdb_now_playing_${region}`;
    const cached = getMemoryCache(cacheKey, 60 * 60 * 1000);
    if (cached) return cached.slice(0, limit);

    const data = await fetchTmdbJson('/movie/now_playing', {
      language: 'de-DE',
      region,
      page: 1
    });

    const results = (data.results || []).map(item => ({
      id: item.id,
      title: item.title,
      originalTitle: item.original_title,
      mediaType: 'movie',
      releaseDate: item.release_date,
      popularity: item.popularity || 0
    }));

    setMemoryCache(cacheKey, results);
    return results.slice(0, limit);
  }

}

export { TmdbService, findTmdbYouTubeTrailer };
