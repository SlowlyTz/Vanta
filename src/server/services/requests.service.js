// Media requests: scope-aware duplicate checks, admin decisions and the
// list of titles rejected for good.
import db from '../db/database.js';
import { TmdbService } from './tmdb.service.js';
import { JellyfinCrossCheck } from './jellyfin-crosscheck.service.js';
import { normalizeScopeSelection, toScopeInteger } from './request-scope.js';
import { join } from 'path';
import { httpError } from '../utils/httpError.js';
import { DB_DIR } from '../config/paths.js';
import { createJsonStore } from '../utils/jsonStore.js';

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

// Titles an admin rejected for good (db/banned.json). The search asks for
// them twice per hit, so the list stays in memory.
const bannedTitles = createJsonStore(BANNED_FILE, {
  empty: emptyBannedList,
  parse: parsed => ({
    movies: Array.isArray(parsed.movies) ? parsed.movies : [],
    series: Array.isArray(parsed.series) ? parsed.series : []
  }),
  label: 'banned.json'
});
const readBannedList = () => bannedTitles.read();
const writeBannedList = (list) => bannedTitles.write(list);

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
      throw httpError(400, scopeError);
    }

    const details = tmdbType === 'tv'
      ? await TmdbService.getTvDetails(tmdbId)
      : await TmdbService.getMovieDetails(tmdbId);

    if (!details || !details.id) {
      throw httpError(502, 'Medium konnte nicht in der Datenbank gefunden werden');
    }

    if (this.isBanned(tmdbId, tmdbType)) {
      throw httpError(409, 'Dieses Medium wurde abgelehnt und kann nicht erneut angefragt werden');
    }

    const exists = this.exists(tmdbId, tmdbType, { scope, seasonNumber, episodeNumber });
    if (exists) {
      throw httpError(409, 'Diese Anfrage existiert bereits');
    }

    const now = Date.now();
    // The TMDB season metadata of the whole series, never the user's
    // selection; that lives in request_scope/season_number/episode_number.
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

    // The TMDB details (year, overview) are not in the requests table; handed
    // back so requests.routes.js can pass them to the Discord webhook.
    return { request, media: details };
  }

  // Scope-aware duplicate check; without a selection: is the whole title
  // already requested?
  static exists(tmdbId, tmdbType, selection = {}) {
    const scope = selection.scope || 'all';
    const seasonNumber = toScopeInteger(selection.seasonNumber);
    const episodeNumber = toScopeInteger(selection.episodeNumber);

    const rows = getBlockingRequests.all(tmdbId, tmdbType);
    return rows.some(row => rowCovers(row, scope, seasonNumber, episodeNumber));
  }

  // Is the whole title asked for (not just one of its seasons or episodes)?
  // A title with an open season request can still get further requests.
  static isWholeTitleRequested(tmdbId, tmdbType) {
    return getBlockingRequests.all(tmdbId, tmdbType).some(row => (row.request_scope || 'all') === 'all');
  }

  // Every open scope for a title, across all users — the client cannot derive
  // this from its own requests, but the duplicate rule is evaluated globally.
  static getOpenScopes(tmdbId, tmdbType) {
    return getBlockingRequests.all(tmdbId, tmdbType).map(row => ({
      request_scope: row.request_scope || 'all',
      season_number: toScopeInteger(row.season_number),
      episode_number: toScopeInteger(row.episode_number)
    }));
  }

  static getById(id) {
    return normalizeRequest(getRequestById.get(id));
  }

  static getByUser(userId) {
    const requests = getUserRequests.all(userId);
    return requests.map(normalizeRequest);
  }

  static getAll() {
    const requests = getAllRequests.all();
    return requests.map(normalizeRequest);
  }

  static getOpen() {
    const requests = getOpenRequests.all();
    return requests.map(normalizeRequest);
  }

  static updateStatus(id, status) {
    updateRequestStatus.run(status, Date.now(), id);
  }

  // A decision that is already the request's status changes nothing: no
  // new updated_at (which lights the requester's menu dot) and no write.
  static approve(id) {
    const request = this.getById(id);
    if (!request) {
      throw httpError(404, 'Anfrage nicht gefunden');
    }
    if (request.status === 'approved') return request;

    this.updateStatus(id, 'approved');
    return this.getById(id);
  }

  static reject(id) {
    const request = this.getById(id);
    if (!request) {
      throw httpError(404, 'Anfrage nicht gefunden');
    }
    if (request.status === 'rejected') return request;

    this.updateStatus(id, 'rejected');

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
