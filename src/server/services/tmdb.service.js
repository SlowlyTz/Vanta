import env from '../config/env.js';
import db from '../db/database.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const cacheMovie = db.prepare(`INSERT OR REPLACE INTO tmdb_media (tmdb_id, tmdb_type, title, overview, poster_path, backdrop_path, release_date, media_type, score, vote_count, cached_at) VALUES (?, 'movie', ?, ?, ?, ?, ?, 'movie', ?, ?, ?)`);
const cacheTv = db.prepare(`INSERT OR REPLACE INTO tmdb_media (tmdb_id, tmdb_type, title, overview, poster_path, backdrop_path, first_air_date, media_type, score, vote_count, cached_at) VALUES (?, 'tv', ?, ?, ?, ?, ?, 'tv', ?, ?, ?)`);
const getCached = db.prepare('SELECT * FROM tmdb_media WHERE tmdb_id = ?');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

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
  const response = await fetch(buildTmdbUrl(path, params), {
    headers: isV4Token ? { Authorization: `Bearer ${env.TMDB_API_KEY}` } : {}
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.status_message || data.errors?.join(', ') || response.statusText;
    throw new Error(`TMDB request failed: ${message}`);
  }

  return data;
};

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
    const cached = getCached.get(movieId);
    if (cached && (Date.now() - cached.cached_at < CACHE_TTL)) {
      return { ...cached, id: cached.tmdb_id, media_type: 'movie' };
    }

    const [details, credits] = await Promise.all([
      fetchTmdbJson(`/movie/${movieId}`, { language: 'de-DE' }),
      fetchTmdbJson(`/movie/${movieId}/credits`, { language: 'de-DE' })
    ]);

    cacheMovie.run(movieId, details.title, details.overview, details.poster_path, details.backdrop_path, details.release_date, details.vote_average ?? 0, details.vote_count ?? 0, Date.now());

    return {
      id: movieId,
      ...details,
      media_type: 'movie',
      cast: credits.cast?.slice(0, 10) || [],
      runtime: details.runtime,
    };
  }

  static async getTvDetails(tvId) {
    const cached = getCached.get(tvId);
    if (cached && (Date.now() - cached.cached_at < CACHE_TTL)) {
      return { ...cached, id: cached.tmdb_id, media_type: 'tv' };
    }

    const [details, credits] = await Promise.all([
      fetchTmdbJson(`/tv/${tvId}`, { language: 'de-DE' }),
      fetchTmdbJson(`/tv/${tvId}/credits`, { language: 'de-DE' })
    ]);

    cacheTv.run(tvId, details.name, details.overview, details.poster_path, details.backdrop_path, details.first_air_date, details.vote_average ?? 0, details.vote_count ?? 0, Date.now());

    return {
      ...details,
      media_type: 'tv',
      cast: credits.cast?.slice(0, 10) || [],
    };
  }

  static getImageUrl(path) {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}${path}`;
  }
}

export { TmdbService };
