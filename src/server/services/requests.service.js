import db from '../db/database.js';
import { TmdbService } from './tmdb.service.js';
import { JellyfinCrossCheck } from './jellyfin-crosscheck.service.js';
import { normalizeScopeSelection, toScopeInteger } from './request-scope.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');
const BANNED_FILE = join(DB_DIR, 'banned.json');

const createRequest = db.prepare(`
  INSERT INTO requests (tmdb_id, tmdb_type, title, media_type, poster_path, status, seasons, request_scope, season_number, episode_number, note, user_id, username, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getRequestById = db.prepare('SELECT * FROM requests WHERE id = ?');
const getUserRequests = db.prepare('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC');
const getAllRequests = db.prepare('SELECT * FROM requests ORDER BY created_at DESC');
const getOpenRequests = db.prepare("SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC");
const updateRequestStatus = db.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?');
const getCachedMedia = db.prepare('SELECT * FROM tmdb_media WHERE tmdb_id = ? AND tmdb_type = ?');

// Everything but a rejected row stands in the way of a new request — an already
// imported season is on the shelf, so asking for it again is still a duplicate.
const getBlockingRequests = db.prepare(`
  SELECT request_scope, season_number, episode_number FROM requests
  WHERE tmdb_id = ? AND tmdb_type = ? AND status != 'rejected'
`);

const emptyBannedList = () => ({ movies: [], series: [] });

// The search route asks for the banned state twice per hit, up to 40 hits per keystroke.
// Re-reading and re-parsing the file that often is pure waste; the cache is dropped again
// whenever the file is written, and nothing outside this module writes it.
let bannedListCache = null;

const readBannedList = () => {
  if (bannedListCache) return bannedListCache;

  if (!fs.existsSync(BANNED_FILE)) return emptyBannedList();

  try {
    const parsed = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf8'));
    bannedListCache = {
      movies: Array.isArray(parsed.movies) ? parsed.movies : [],
      series: Array.isArray(parsed.series) ? parsed.series : []
    };
  } catch (error) {
    // Never cache a failure: the cache is only dropped on a write, so one
    // unreadable read would keep the list empty for the rest of the process.
    console.warn('[Banned Requests] Could not read banned.json:', error.message);
    return emptyBannedList();
  }

  return bannedListCache;
};

const writeBannedList = (list) => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  fs.writeFileSync(BANNED_FILE, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
  bannedListCache = null;
};

const getBannedBucket = (tmdbType) => tmdbType === 'tv' ? 'series' : 'movies';

const getReleaseYear = (media) => {
  const date = media?.release_date || media?.first_air_date || '';
  return date ? String(date).slice(0, 4) : '';
};

const normalizeRequest = (request) => {
  if (!request) return null;
  return {
    ...request,
    seasons: request.seasons ? JSON.parse(request.seasons) : [],
    request_scope: request.request_scope || 'all',
    season_number: toScopeInteger(request.season_number),
    episode_number: toScopeInteger(request.episode_number)
  };
};

// One row covers exactly one scope. `row` is an open request, the rest is the new one.
const rowCovers = (row, scope, seasonNumber, episodeNumber) => {
  const rowScope = row.request_scope || 'all';
  if (rowScope === 'all') return true;
  // A whole-title request subsumes every open season and episode, so any of
  // them already answers it.
  if (scope === 'all') return true;

  const rowSeason = toScopeInteger(row.season_number);
  if (rowSeason !== seasonNumber) return false;

  // A season already on the pile also covers every episode inside it, while a
  // single episode only ever collides with itself.
  if (rowScope === 'season') return true;
  return scope === 'episode' && toScopeInteger(row.episode_number) === episodeNumber;
};

class RequestsService {
  static async create(userId, username, tmdbId, tmdbType, note = '', selection = {}) {
    const { scope, seasonNumber, episodeNumber, error: scopeError } = normalizeScopeSelection({
      ...selection,
      tmdbType
    });

    if (scopeError) {
      const error = new Error(scopeError);
      error.status = 400;
      throw error;
    }

    const details = tmdbType === 'tv'
      ? await TmdbService.getTvDetails(tmdbId)
      : await TmdbService.getMovieDetails(tmdbId);

    if (!details || !details.id) {
      const error = new Error('Medium konnte nicht in der Datenbank gefunden werden');
      error.status = 502;
      throw error;
    }

    if (this.isBanned(tmdbId, tmdbType)) {
      const error = new Error('Dieses Medium wurde abgelehnt und kann nicht erneut angefragt werden');
      error.status = 409;
      throw error;
    }

    const exists = await this.exists(tmdbId, tmdbType, { scope, seasonNumber, episodeNumber });
    if (exists) {
      const error = new Error('Diese Anfrage existiert bereits');
      error.status = 409;
      throw error;
    }

    const now = Date.now();
    // Unchanged meaning: the TMDB season metadata of the whole series, never the
    // user's selection — that lives in request_scope/season_number/episode_number.
    const seasonsJson = tmdbType === 'tv'
      ? JSON.stringify(details.seasons?.filter(s => s.season_number >= 0) || [])
      : '[]';

    const result = createRequest.run(
      details.id,
      tmdbType,
      details.name || details.title,
      details.media_type,
      details.poster_path,
      seasonsJson,
      scope,
      seasonNumber,
      episodeNumber,
      note,
      userId,
      username,
      now,
      now
    );

    const request = normalizeRequest({ id: result.lastInsertRowid, ...getRequestById.get(result.lastInsertRowid) });

    // `details` sind die bereits geladenen TMDB-Daten (Jahr, Overview, ...), die nicht in der
    // requests-Tabelle liegen. An den Aufrufer durchgereicht, statt sie später erneut zu laden
    // (siehe discord-webhook.service.js, wird von requests.routes.js dafür genutzt).
    return { request, media: details };
  }

  // Scope-aware duplicate check. Without a selection it answers the old question:
  // is the whole title already requested?
  static async exists(tmdbId, tmdbType, selection = {}) {
    const scope = selection.scope || 'all';
    const seasonNumber = toScopeInteger(selection.seasonNumber);
    const episodeNumber = toScopeInteger(selection.episodeNumber);

    const rows = getBlockingRequests.all(tmdbId, tmdbType);
    return rows.some(row => rowCovers(row, scope, seasonNumber, episodeNumber));
  }

  // Every open scope for a title, across all users — the client cannot derive
  // this from its own requests, but the duplicate rule is evaluated globally.
  static async getOpenScopes(tmdbId, tmdbType) {
    return getBlockingRequests.all(tmdbId, tmdbType).map(row => ({
      request_scope: row.request_scope || 'all',
      season_number: toScopeInteger(row.season_number),
      episode_number: toScopeInteger(row.episode_number)
    }));
  }

  static async getById(id) {
    return normalizeRequest(getRequestById.get(id));
  }

  static async getByUser(userId) {
    const requests = getUserRequests.all(userId);
    return requests.map(normalizeRequest);
  }

  static async getAll() {
    const requests = getAllRequests.all();
    return requests.map(normalizeRequest);
  }

  static async getOpen() {
    const requests = getOpenRequests.all();
    return requests.map(normalizeRequest);
  }

  static async updateStatus(id, status) {
    updateRequestStatus.run(status, Date.now(), id);
  }

  static async approve(id) {
    const request = await this.getById(id);
    if (!request) {
      const error = new Error('Anfrage nicht gefunden');
      error.status = 404;
      throw error;
    }

    await this.updateStatus(id, 'approved');
    return this.getById(id);
  }

  static async reject(id) {
    const request = await this.getById(id);
    if (!request) {
      const error = new Error('Anfrage nicht gefunden');
      error.status = 404;
      throw error;
    }

    await this.updateStatus(id, 'rejected');

    // Only a rejected whole title is banned for good. A rejected season or episode
    // may be asked for again, so it must never reach banned.json.
    if ((request.request_scope || 'all') === 'all') {
      this.addToBannedList(request);
    }

    return this.getById(id);
  }

  // `media` lets a caller that already holds the TMDB payload skip the detail
  // fetch entirely — the search route has up to 40 hits and would otherwise pull
  // /tv/{id} plus /credits for every one of them. `withSeasons` skips the extra
  // Jellyfin round-trip for callers that only need availability.
  static async crossCheck(userId, token, tmdbId, tmdbType, { media = null, withSeasons = true } = {}) {
    const details = media || (tmdbType === 'tv'
      ? await TmdbService.getTvDetails(tmdbId)
      : await TmdbService.getMovieDetails(tmdbId));

    const check = await JellyfinCrossCheck.checkMediaExists(userId, token, details, tmdbType);
    check.banned = this.isBanned(tmdbId, tmdbType);

    if (withSeasons && tmdbType === 'tv' && check.exists && check.jellyfinItemId) {
      const tmdbSeasons = details.seasons || [];
      const seasonResults = await JellyfinCrossCheck.checkSeriesSeasons(userId, token, check.jellyfinItemId, tmdbSeasons);
      return { ...check, seasons: seasonResults };
    }

    return check;
  }

  static isBanned(tmdbId, tmdbType) {
    const list = readBannedList();
    const bucket = getBannedBucket(tmdbType);
    return list[bucket].some(item => Number(item.tmdbId) === Number(tmdbId));
  }

  static getBannedMedia(tmdbId, tmdbType) {
    const list = readBannedList();
    const bucket = getBannedBucket(tmdbType);
    return list[bucket].find(item => Number(item.tmdbId) === Number(tmdbId)) || null;
  }

  static addToBannedList(request) {
    const list = readBannedList();
    const bucket = getBannedBucket(request.tmdb_type);

    if (list[bucket].some(item => Number(item.tmdbId) === Number(request.tmdb_id))) {
      return;
    }

    const media = getCachedMedia.get(request.tmdb_id, request.tmdb_type);
    const entry = {
      name: request.title,
      releaseYear: getReleaseYear(media),
      tmdbId: Number(request.tmdb_id)
    };

    writeBannedList({ ...list, [bucket]: [...list[bucket], entry] });
  }
}

export { RequestsService };
