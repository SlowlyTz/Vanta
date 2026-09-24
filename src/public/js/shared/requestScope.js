// Scope of a media request: the whole title, one season, or one episode.
// Shared by the request pages and the server (routes, Discord webhook).

export const REQUEST_SCOPES = ['all', 'season', 'episode'];

const toNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pad2 = value => String(value).padStart(2, '0');

// Accepts every shape a scope travels in: a stored request row
// (request_scope/season_number/...) as well as a freshly built payload
// (scope/seasonNumber/...).
export function getRequestScope(source = {}) {
  const scope = source.request_scope || source.scope || 'all';
  return REQUEST_SCOPES.includes(scope) ? scope : 'all';
}

// "Staffel 2", "S02E05", or "Ganzer Film" / "Komplette Serie".
export function getScopeLabel(source = {}) {
  const scope = getRequestScope(source);
  const seasonNumber = toNumber(source.season_number ?? source.seasonNumber);
  const episodeNumber = toNumber(source.episode_number ?? source.episodeNumber);

  if (scope === 'season' && seasonNumber !== null) return `Staffel ${seasonNumber}`;
  if (scope === 'episode' && seasonNumber !== null && episodeNumber !== null) {
    return `S${pad2(seasonNumber)}E${pad2(episodeNumber)}`;
  }

  const type = source.tmdb_type || source.tmdbType || source.media_type || 'tv';
  return type === 'movie' ? 'Ganzer Film' : 'Komplette Serie';
}
