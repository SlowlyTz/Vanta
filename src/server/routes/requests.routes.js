// Media requests: TMDB search and details, filing requests, and admin decisions.
import express from 'express';
import { requireAuth, requireFreshAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { RequestsService } from '../services/requests.service.js';
import { validateScopeAgainstTmdb } from '../services/request-validation.js';
import { TmdbService } from '../services/tmdb.service.js';
import { sendRequestCreated } from '../services/discord-webhook.service.js';
import { notifyNotificationsChanged } from '../realtime/app.socket.js';
import { NotificationTriggers } from '../services/notification-triggers.js';
import { normalizeScopeSelection, toScopeInteger } from '../services/request-scope.js';

const router = express.Router();
const MAX_NOTE_LENGTH = 500;

router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Suchbegriff fehlt' });

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

// A TMDB title as the client names it: a positive id and movie or tv.
const parseTmdbTarget = (tmdbId, tmdbType) => {
  const id = toScopeInteger(tmdbId);
  if (id === null || id <= 0 || (tmdbType !== 'movie' && tmdbType !== 'tv')) return null;
  return { id, type: tmdbType };
};

const TARGET_ERROR = 'Kein gültiger Titel angegeben';

router.get('/details', requireAuth, asyncHandler(async (req, res) => {
  const target = parseTmdbTarget(req.query.tmdbId, req.query.tmdbType);
  if (!target) return res.status(400).json({ error: TARGET_ERROR });

  const details = target.type === 'tv'
    ? await TmdbService.getTvDetails(target.id)
    : await TmdbService.getMovieDetails(target.id);

  res.json({
    ...details,
    banned: RequestsService.isBanned(target.id, target.type),
    bannedInfo: RequestsService.getBannedMedia(target.id, target.type),
    requested: await RequestsService.isWholeTitleRequested(target.id, target.type)
  });
}));

// Episodes of one season, for picking a single episode to request.
router.get('/season', requireAuth, asyncHandler(async (req, res) => {
  const tmdbId = toScopeInteger(req.query.tmdbId);
  const seasonNumber = toScopeInteger(req.query.seasonNumber);
  if (tmdbId === null || seasonNumber === null) {
    return res.status(400).json({ error: 'Titel und Staffel fehlen' });
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

router.post('/cross-check', requireAuth, asyncHandler(async (req, res) => {
  const target = parseTmdbTarget(req.body?.tmdbId, req.body?.tmdbType);
  if (!target) return res.status(400).json({ error: TARGET_ERROR });

  const { userId, accessToken } = req.session;
  const [result, requestedScopes] = await Promise.all([
    RequestsService.crossCheck(userId, accessToken, target.id, target.type),
    RequestsService.getOpenScopes(target.id, target.type)
  ]);
  res.json({ ...result, requestedScopes });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType, note, scope, seasonNumber, episodeNumber } = req.body;
  if (!parseTmdbTarget(tmdbId, tmdbType)) return res.status(400).json({ error: TARGET_ERROR });

  const selection = normalizeScopeSelection({ scope, tmdbType, seasonNumber, episodeNumber });
  if (selection.error) return res.status(400).json({ error: selection.error });

  const tmdbIdNumber = parseInt(tmdbId);
  const { error: tmdbError } = await validateScopeAgainstTmdb(tmdbIdNumber, selection);
  if (tmdbError) return res.status(400).json({ error: tmdbError });

  const { userId, username } = req.session;
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : '';
  const { request, media } = await RequestsService.create(userId, username, tmdbIdNumber, tmdbType, cleanNote, selection);
  res.status(201).json(request);
  notifyNotificationsChanged();

  // Fire and forget: a dead webhook must never block requests. New requests only.
  sendRequestCreated(request, media).catch((error) => {
    console.error('[Discord Webhook] trigger failed:', error.message);
  });
  NotificationTriggers.adminWork({ kind: 'request', username, title: request.title, url: '/#/admin/requests' });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getByUser(req.session.userId);
  res.json(requests);
}));

router.get('/admin/open', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getOpen();
  res.json(requests);
}));

router.get('/admin/all', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const requests = await RequestsService.getAll();
  res.json(requests);
}));

// A decision tells the requester only when it changed the status (a second
// click on "Annehmen" stays quiet).
const decide = (decision) => asyncHandler(async (req, res) => {
  const before = await RequestsService.getById(req.params.id);
  const request = await RequestsService[decision](req.params.id);
  res.json(request);
  if (before?.status === request?.status) return;
  notifyNotificationsChanged();
  NotificationTriggers.requestDecided(request);
});

router.post('/:id/approve', requireAuth, requireFreshAdmin, decide('approve'));

// Only a rejected whole title bans further requests; a rejected season or
// episode can be asked for again.
router.post('/:id/reject', requireAuth, requireFreshAdmin, decide('reject'));

export default router;
