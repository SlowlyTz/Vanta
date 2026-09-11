// Scope of a single request row: the whole title, one season, or one episode.
// Pure and DB-free so routes, the requests service and the Discord webhook can
// share both the validation and the German labels without pulling in the DB.

export const REQUEST_SCOPES = ['all', 'season', 'episode'];

// Accepts the numbers as they arrive from JSON bodies and query strings alike.
export const toScopeInteger = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
};

// Returns either { scope, seasonNumber, episodeNumber } or { error } with a
// German message ready to hand back as a 400.
export const normalizeScopeSelection = ({ scope, tmdbType, seasonNumber, episodeNumber } = {}) => {
  const requested = scope ?? 'all';

  if (!REQUEST_SCOPES.includes(requested)) {
    return { error: 'Ungültiger Anfrageumfang' };
  }

  if (tmdbType === 'movie' && requested !== 'all') {
    return { error: 'Filme können nur als Ganzes angefragt werden' };
  }

  if (requested === 'all') {
    return { scope: 'all', seasonNumber: null, episodeNumber: null };
  }

  const season = toScopeInteger(seasonNumber);
  if (season === null) {
    return { error: 'seasonNumber muss eine ganze Zahl sein' };
  }

  if (requested === 'season') {
    return { scope: 'season', seasonNumber: season, episodeNumber: null };
  }

  const episode = toScopeInteger(episodeNumber);
  if (episode === null) {
    return { error: 'episodeNumber muss eine ganze Zahl sein' };
  }

  return { scope: 'episode', seasonNumber: season, episodeNumber: episode };
};

const pad = (value) => String(value ?? '').padStart(2, '0');

// German scope label, shared with the frontend wording.
export const formatScopeLabel = (request = {}) => {
  const scope = request.request_scope || 'all';

  if (scope === 'season') return `Staffel ${request.season_number}`;
  if (scope === 'episode') return `S${pad(request.season_number)}E${pad(request.episode_number)}`;

  return request.tmdb_type === 'movie' ? 'Ganzer Film' : 'Komplette Serie';
};
