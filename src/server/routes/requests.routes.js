import express from 'express';
import { requireAuth, requireFreshAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { RequestsService } from '../services/requests.service.js';
import { TmdbService } from '../services/tmdb.service.js';
import { sendRequestCreated } from '../services/discord-webhook.service.js';
import { notifyNotificationsChanged } from '../realtime/app.socket.js';
import { normalizeScopeSelection, toScopeInteger } from '../services/request-scope.js';

const router = express.Router();

// Checks the requested season/episode against TMDB, on top of the shape check that
// normalizeScopeSelection already did. Returns { error } for a 400.
const validateAgainstTmdb = async (tmdbId, selection) => {
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

// Search TMDB
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { userId, accessToken } = req.session;
  const { results } = await TmdbService.search(q);

  const enriched = await Promise.all(results.map(async (item) => {
    const tmdbId = item.id;
    const tmdbType = item.media_type;
    const [banned, requested, crossCheck] = await Promise.all([
      RequestsService.isBanned(tmdbId, tmdbType),
      RequestsService.isWholeTitleRequested(tmdbId, tmdbType),
      RequestsService.crossCheck(userId, accessToken, tmdbId, tmdbType, { media: item, withSeasons: false })
        .catch(() => ({ exists: false, jellyfinItemId: null }))
    ]);

    return {
      ...item,
      banned,
      requested,
      exists: crossCheck.exists,
      jellyfinItemId: crossCheck.jellyfinItemId ?? null
    };
  }));

  res.json(enriched);
}));

// Get TMDB details
router.get('/details', asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType } = req.query;
  if (!tmdbId || !tmdbType) return res.status(400).json({ error: 'tmdbId and tmdbType required' });

  const details = tmdbType === 'tv'
    ? await TmdbService.getTvDetails(parseInt(tmdbId))
    : await TmdbService.getMovieDetails(parseInt(tmdbId));

  res.json({
    ...details,
    banned: RequestsService.isBanned(parseInt(tmdbId), tmdbType),
    bannedInfo: RequestsService.getBannedMedia(parseInt(tmdbId), tmdbType),
    requested: await RequestsService.isWholeTitleRequested(parseInt(tmdbId), tmdbType)
  });
}));

// Episodes of a single season, for picking one episode to request
router.get('/season', requireAuth, asyncHandler(async (req, res) => {
  const tmdbId = toScopeInteger(req.query.tmdbId);
  const seasonNumber = toScopeInteger(req.query.seasonNumber);
  if (tmdbId === null || seasonNumber === null) {
    return res.status(400).json({ error: 'tmdbId and seasonNumber required' });
  }

  const season = await TmdbService.getSeasonDetails(tmdbId, seasonNumber);
  if (!season) return res.status(404).json({ error: 'Staffel nicht gefunden' });

  res.json({
    season_number: season.season_number ?? seasonNumber,
    name: season.name || `Staffel ${seasonNumber}`,
    episodes: (season.episodes || []).map(episode => ({
      episode_number: episode.episode_number,
      name: episode.name,
      overview: episode.overview,
      still_path: episode.still_path,
      air_date: episode.air_date
    }))
  });
}));

// Cross-check with Jellyfin library
router.post('/cross-check', requireAuth, asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType } = req.body;
  if (!tmdbId || !tmdbType) return res.status(400).json({ error: 'tmdbId and tmdbType required' });

  const { userId, accessToken } = req.session;
  const id = parseInt(tmdbId);
  const [result, requestedScopes] = await Promise.all([
    RequestsService.crossCheck(userId, accessToken, id, tmdbType),
    RequestsService.getOpenScopes(id, tmdbType)
  ]);
  res.json({ ...result, requestedScopes });
}));

// Create request (requires auth)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType, note, scope, seasonNumber, episodeNumber } = req.body;
  if (!tmdbId || !tmdbType) return res.status(400).json({ error: 'tmdbId and tmdbType required' });

  const selection = normalizeScopeSelection({ scope, tmdbType, seasonNumber, episodeNumber });
  if (selection.error) return res.status(400).json({ error: selection.error });

  const tmdbIdNumber = parseInt(tmdbId);
  const { error: tmdbError } = await validateAgainstTmdb(tmdbIdNumber, selection);
  if (tmdbError) return res.status(400).json({ error: tmdbError });

  const { userId, username } = req.session;
  const { request, media } = await RequestsService.create(userId, username, tmdbIdNumber, tmdbType, note, selection);
  res.status(201).json(request);
  notifyNotificationsChanged();

  // Fire-and-forget: Der Nutzer wartet nie auf Discord, ein toter Webhook darf die
  // Anfragefunktion nie blockieren. Nur bei neuen Anfragen, nicht bei Approve/Reject.
  sendRequestCreated(request, media).catch((error) => {
    console.error('[Discord Webhook] Trigger fehlgeschlagen:', error.message);
  });
}));

// Get user's requests
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getByUser(req.session.userId);
  res.json(requests);
}));

// Get all open requests (admin only)
router.get('/admin/open', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getOpen();
  res.json(requests);
}));

// Get every request regardless of status (admin only). Must stay registered before
// GET /:id, otherwise the param route swallows this path.
router.get('/admin/all', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getAll();
  res.json(requests);
}));

// Approve request (admin only)
router.post('/:id/approve', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const request = await RequestsService.approve(req.params.id);
  res.json(request);
  notifyNotificationsChanged();
}));

// Reject request (admin only). Only a rejected whole title bans further requests;
// a rejected season or episode can be asked for again.
router.post('/:id/reject', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const request = await RequestsService.reject(req.params.id);
  res.json(request);
  notifyNotificationsChanged();
}));

export default router;
