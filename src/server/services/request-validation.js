// Checks a request's season or episode against TMDB, on top of the shape
// check in request-scope.js.
import { TmdbService } from './tmdb.service.js';

// Returns { error } for a 400, else {}.
export const validateScopeAgainstTmdb = async (tmdbId, selection) => {
  if (selection.scope === 'all') return {};

  if (selection.seasonNumber === 0) {
    return { error: 'Specials können nicht angefragt werden' };
  }

  const details = await TmdbService.getTvDetails(tmdbId);
  const seasons = details?.seasons || [];

  // An empty list means TMDB was unreachable and getTvDetails fell back to the cached
  // row — there is nothing to validate against, so the request is let through.
  if (seasons.length > 0 && !seasons.some(season => season.season_number === selection.seasonNumber)) {
    return { error: 'Staffel existiert nicht' };
  }

  if (selection.scope === 'season') return {};

  const season = await TmdbService.getSeasonDetails(tmdbId, selection.seasonNumber);
  const episodes = season?.episodes || [];

  if (!episodes.some(episode => episode.episode_number === selection.episodeNumber)) {
    return { error: 'Episode existiert nicht' };
  }

  return {};
};
