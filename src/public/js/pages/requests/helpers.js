import { getRequestScope } from '../../shared/requestScope.js';

export { getRequestScope, getScopeLabel } from '../../shared/requestScope.js';
export { getTmdbImageUrl } from '../../utils/poster.js';

export const STATUS_MAP = {
  pending: { label: 'ausstehend', cls: 'pending' },
  approved: { label: 'genehmigt', cls: 'approved' },
  imported: { label: 'genehmigt', cls: 'approved' },
  rejected: { label: 'abgelehnt', cls: 'rejected' }
};

const REQUEST_SEARCH_STATE_KEY = 'vanta.requests.searchState';

export function loadRequestSearchState() {
  try {
    const raw = sessionStorage.getItem(REQUEST_SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : { query: '', results: [] };
  } catch {
    return { query: '', results: [] };
  }
}

export function saveRequestSearchState(query, results = []) {
  try {
    sessionStorage.setItem(REQUEST_SEARCH_STATE_KEY, JSON.stringify({ query, results }));
  } catch {
    // Ignore unavailable storage; search still works without restoration.
  }
}

export function clearRequestSearchState() {
  try {
    sessionStorage.removeItem(REQUEST_SEARCH_STATE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Three season shapes meet here: raw TMDB (poster_path, episode_count, no
// availability), the cross-check shape (exists/requestable/reason, no poster)
// and the season list stored on a request row, which is raw TMDB again.
export function mergeSeasons(tmdbSeasons = [], crossCheckSeasons = []) {
  const availability = new Map();
  (crossCheckSeasons || []).forEach(season => {
    const number = toNumber(season?.season_number);
    if (number !== null) availability.set(number, season);
  });

  const base = (tmdbSeasons && tmdbSeasons.length > 0) ? tmdbSeasons : (crossCheckSeasons || []);
  const merged = new Map();

  base.forEach(season => {
    const number = toNumber(season?.season_number);
    if (number === null || number < 0 || merged.has(number)) return;

    const check = availability.get(number) || null;
    const special = number === 0 || check?.reason === 'special';

    merged.set(number, {
      season_number: number,
      name: season.name || check?.name || `Staffel ${number}`,
      episode_count: toNumber(season.episode_count ?? check?.episode_count) ?? 0,
      poster_path: season.poster_path || null,
      exists: Boolean(check?.exists),
      // Present with every episode; a partly present season stays requestable.
      complete: Boolean(check?.complete ?? check?.exists),
      availableEpisodes: Array.isArray(check?.available_episodes) ? check.available_episodes : [],
      // `requestable` is server policy (specials and complete library seasons
      // are out); without a cross-check only specials are excluded.
      requestable: check ? Boolean(check.requestable) : !special,
      special
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.season_number - b.season_number);
}

// Which scopes of a title are already taken by a pending/approved request.
export function buildRequestCoverage(requests = [], tmdbId = null, tmdbType = null) {
  const coverage = { all: false, seasons: new Set(), episodes: new Set() };

  (Array.isArray(requests) ? requests : []).forEach(req => {
    if (!req || req.status === 'rejected') return;
    if (tmdbId !== null && Number(req.tmdb_id) !== Number(tmdbId)) return;
    if (tmdbType !== null && req.tmdb_type !== tmdbType) return;

    const scope = getRequestScope(req);
    const seasonNumber = toNumber(req.season_number ?? req.seasonNumber);
    const episodeNumber = toNumber(req.episode_number ?? req.episodeNumber);

    if (scope === 'season' && seasonNumber !== null) {
      coverage.seasons.add(seasonNumber);
    } else if (scope === 'episode' && seasonNumber !== null && episodeNumber !== null) {
      coverage.episodes.add(`${seasonNumber}:${episodeNumber}`);
    } else {
      coverage.all = true;
    }
  });

  return coverage;
}

export function isScopeCovered(coverage, target = {}) {
  if (!coverage) return false;
  if (coverage.all) return true;

  const scope = getRequestScope(target);
  const seasonNumber = toNumber(target.season_number ?? target.seasonNumber);
  const episodeNumber = toNumber(target.episode_number ?? target.episodeNumber);

  if (scope === 'season') return seasonNumber !== null && coverage.seasons.has(seasonNumber);
  if (scope === 'episode') {
    if (seasonNumber === null || episodeNumber === null) return false;
    return coverage.seasons.has(seasonNumber) || coverage.episodes.has(`${seasonNumber}:${episodeNumber}`);
  }

  return false;
}

export function addScopeToCoverage(coverage, target = {}) {
  if (!coverage) return coverage;

  const scope = getRequestScope(target);
  const seasonNumber = toNumber(target.season_number ?? target.seasonNumber);
  const episodeNumber = toNumber(target.episode_number ?? target.episodeNumber);

  if (scope === 'season' && seasonNumber !== null) coverage.seasons.add(seasonNumber);
  else if (scope === 'episode' && seasonNumber !== null && episodeNumber !== null) coverage.episodes.add(`${seasonNumber}:${episodeNumber}`);
  else coverage.all = true;

  return coverage;
}
