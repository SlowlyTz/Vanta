import db from '../db/database.js';
import { TmdbService } from './tmdb.service.js';
import { JellyfinCrossCheck } from './jellyfin-crosscheck.service.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');
const BANNED_FILE = join(DB_DIR, 'banned.json');

const createRequest = db.prepare(`
  INSERT INTO requests (tmdb_id, tmdb_type, title, media_type, poster_path, status, seasons, note, user_id, username, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
`);

const getRequestById = db.prepare('SELECT * FROM requests WHERE id = ?');
const getUserRequests = db.prepare('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC');
const getAllRequests = db.prepare('SELECT * FROM requests ORDER BY created_at DESC');
const getOpenRequests = db.prepare("SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC");
const deleteRequest = db.prepare('DELETE FROM requests WHERE id = ?');
const updateRequestStatus = db.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?');
const getCachedMedia = db.prepare('SELECT * FROM tmdb_media WHERE tmdb_id = ? AND tmdb_type = ?');

const emptyBannedList = () => ({ movies: [], series: [] });

const readBannedList = () => {
  if (!fs.existsSync(BANNED_FILE)) return emptyBannedList();

  try {
    const parsed = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf8'));
    return {
      movies: Array.isArray(parsed.movies) ? parsed.movies : [],
      series: Array.isArray(parsed.series) ? parsed.series : []
    };
  } catch (error) {
    console.warn('[Banned Requests] Could not read banned.json:', error.message);
    return emptyBannedList();
  }
};

const writeBannedList = (list) => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  fs.writeFileSync(BANNED_FILE, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
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
    seasons: request.seasons ? JSON.parse(request.seasons) : []
  };
};

class RequestsService {
  static async create(userId, username, tmdbId, tmdbType, note = '') {
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

    const exists = await this.exists(tmdbId, tmdbType);
    if (exists) {
      const error = new Error('Diese Anfrage existiert bereits');
      error.status = 409;
      throw error;
    }

    const now = Date.now();
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
      note,
      userId,
      username,
      now,
      now
    );

    return normalizeRequest({ id: result.lastInsertRowid, ...getRequestById.get(result.lastInsertRowid) });
  }

  static async exists(tmdbId, tmdbType) {
    const row = db.prepare(`
      SELECT id FROM requests WHERE tmdb_id = ? AND tmdb_type = ? AND status != 'rejected'
    `).get(tmdbId, tmdbType);
    return !!row;
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
    this.addToBannedList(request);
    return this.getById(id);
  }

  static async delete(id) {
    deleteRequest.run(id);
  }

  static async crossCheck(userId, token, tmdbId, tmdbType) {
    const details = tmdbType === 'tv'
      ? await TmdbService.getTvDetails(tmdbId)
      : await TmdbService.getMovieDetails(tmdbId);

    const check = await JellyfinCrossCheck.checkMediaExists(userId, token, details);
    check.banned = this.isBanned(tmdbId, tmdbType);

    if (tmdbType === 'tv' && check.exists && check.jellyfinItems.length > 0) {
      const seriesId = check.jellyfinItems[0].Id;
      const tmdbSeasons = details.seasons || [];
      const seasonResults = await JellyfinCrossCheck.checkSeriesSeasons(userId, token, seriesId, tmdbSeasons);
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
    list[bucket].push({
      name: request.title,
      releaseYear: getReleaseYear(media),
      tmdbId: Number(request.tmdb_id)
    });

    writeBannedList(list);
  }
}

export { RequestsService };
