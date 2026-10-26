// Problem reports on titles: validated against Jellyfin as the reporting
// user sees them, then decided by an admin.
import db from '../db/database.js';
import { ItemsService } from './jellyfin/items.service.js';
import { toScopeInteger } from './request-scope.js';
import { httpError } from '../utils/httpError.js';
import {
  REPORT_PROBLEM_KEYS,
  REPORT_SCOPES,
  REPORT_MESSAGE_MAX
} from '../../public/js/shared/reports.js';

const insertReport = db.prepare(`
  INSERT INTO reports (item_id, item_type, title, production_year, report_scope, season_number, episode_number,
    episode_name, problem, message, status, user_id, username, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
`);
const getReportById = db.prepare('SELECT * FROM reports WHERE id = ?');
const getUserReports = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC');
const getOpenReports = db.prepare("SELECT * FROM reports WHERE status = 'open' ORDER BY created_at ASC");
const getAllReports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC');
const getOpenDuplicate = db.prepare(`
  SELECT id FROM reports
  WHERE status = 'open' AND user_id = ? AND item_id = ? AND report_scope = ? AND problem = ?
    AND COALESCE(season_number, -1) = COALESCE(?, -1) AND COALESCE(episode_number, -1) = COALESCE(?, -1)
`);
const updateReportStatus = db.prepare('UPDATE reports SET status = ?, handled_by = ?, updated_at = ? WHERE id = ?');


const normalizeReport = row => (row ? {
  ...row,
  season_number: toScopeInteger(row.season_number),
  episode_number: toScopeInteger(row.episode_number),
  production_year: toScopeInteger(row.production_year)
} : null);

// Checks the payload's shape; the title itself is checked against Jellyfin.
export function validateReportInput({ itemId, scope = 'all', seasonNumber, episodeNumber, problem, message = '' } = {}) {
  if (typeof itemId !== 'string' || !/^[0-9a-f-]{16,64}$/i.test(itemId)) return { error: 'Ungültiger Titel' };
  if (!REPORT_SCOPES.includes(scope)) return { error: 'Ungültiger Umfang' };
  if (!REPORT_PROBLEM_KEYS.includes(problem)) return { error: 'Bitte wähle ein Problem aus' };

  const text = String(message ?? '').trim();
  if (text.length > REPORT_MESSAGE_MAX) return { error: `Die Beschreibung darf höchstens ${REPORT_MESSAGE_MAX} Zeichen lang sein` };
  if (problem === 'other' && !text) return { error: 'Bitte beschreibe das Problem' };

  const season = scope === 'all' ? null : toScopeInteger(seasonNumber);
  const episode = scope === 'episode' ? toScopeInteger(episodeNumber) : null;
  if (scope !== 'all' && season === null) return { error: 'Bitte wähle eine Staffel aus' };
  if (scope === 'episode' && episode === null) return { error: 'Bitte wähle eine Folge aus' };

  return { itemId, scope, seasonNumber: season, episodeNumber: episode, problem, message: text };
}

export class ReportsService {
  // Everything about the title comes from Jellyfin as the reporting user sees
  // it, never from the client: the title must be in their library, and the
  // season or episode must exist there.
  static async create({ userId, username, token }, input) {
    const report = validateReportInput(input);
    if (report.error) throw httpError(400, report.error);

    const item = await ItemsService.getItemDetails(userId, token, report.itemId).catch(() => null);
    if (!item || !['Movie', 'Series'].includes(item.Type)) throw httpError(404, 'Titel nicht gefunden');
    if (item.Type === 'Movie' && report.scope !== 'all') throw httpError(400, 'Filme können nur als Ganzes gemeldet werden');

    let episodeName = null;
    if (report.scope !== 'all') {
      const seasons = await ItemsService.getSeasons(userId, token, item.Id);
      if (!seasons.some(season => season.IndexNumber === report.seasonNumber)) throw httpError(400, 'Staffel nicht gefunden');
    }
    if (report.scope === 'episode') {
      const episodes = await ItemsService.getEpisodes(userId, token, item.Id);
      const episode = episodes.find(entry => entry.ParentIndexNumber === report.seasonNumber && entry.IndexNumber === report.episodeNumber);
      if (!episode) throw httpError(400, 'Folge nicht gefunden');
      episodeName = episode.Name || null;
    }

    const duplicate = getOpenDuplicate.get(userId, item.Id, report.scope, report.problem, report.seasonNumber, report.episodeNumber);
    if (duplicate) throw httpError(409, 'Du hast dieses Problem bereits gemeldet');

    const now = Date.now();
    const result = insertReport.run(
      item.Id, item.Type, item.Name, item.ProductionYear ?? null,
      report.scope, report.seasonNumber, report.episodeNumber, episodeName,
      report.problem, report.message, userId, username, now, now
    );
    return normalizeReport(getReportById.get(result.lastInsertRowid));
  }

  static getByUser(userId) {
    return getUserReports.all(userId).map(normalizeReport);
  }

  static getOpen() {
    return getOpenReports.all().map(normalizeReport);
  }

  static getAll() {
    return getAllReports.all().map(normalizeReport);
  }

  // Answers the report and whether its status really changed; the same
  // status again writes nothing.
  static decide(id, status, handledBy) {
    const report = getReportById.get(id);
    if (!report) throw httpError(404, 'Meldung nicht gefunden');
    if (report.status === status) return { report: normalizeReport(report), changed: false };
    updateReportStatus.run(status, handledBy || null, Date.now(), id);
    return { report: normalizeReport(getReportById.get(id)), changed: true };
  }
}
