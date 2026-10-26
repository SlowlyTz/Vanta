import express from 'express';
import { LibraryService } from '../../services/jellyfin/library.service.js';
import { ItemsService } from '../../services/jellyfin/items.service.js';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { HomeSectionsService } from '../../services/home-sections.service.js';
import { destroyInvalidSession, isUpstreamUnauthorized, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { UserDataService } from '../../services/user-data.service.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';
import { validateIdParam } from '../../utils/ids.js';

// A list restored after a detail visit asks for everything it showed at once:
// up to 20 batches of 36 cards.
export const MAX_LIBRARY_LIMIT = 720;

// Titles the search page shows; with "ungesehen" more are looked at first,
// so the watched ones can drop out before the list is cut.
const SEARCH_LIMIT = 60;
const UNWATCHED_POOL = 200;
const USER_DATA_BATCH = 100;

const router = express.Router();

router.param('id', validateIdParam);

router.get('/home', requireAuth, jellyfinRoute('Media Home Error', 'Startseite konnte nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;

  const [resume, movies, series] = await Promise.all([
    LibraryService.getResumeItems(userId, accessToken),
    LibraryService.getMovies(userId, accessToken),
    LibraryService.getSeries(userId, accessToken)
  ]);

  return res.json({ resume, movies, series });
}));

router.get('/home-sections/:group', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { group } = req.params;

  try {
    const sections = await HomeSectionsService.getHomeSectionGroup(userId, accessToken, group);
    return res.json({ sections });
  } catch (error) {
    console.error(`[Media Home Section Group Error:${group}]`, error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(error.status || 500).json({ error: 'Bereich der Startseite konnte nicht geladen werden' });
  }
}));

router.get('/search', requireAuth, jellyfinRoute('Media Search Error', 'Suche fehlgeschlagen', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { q } = req.query;

  if (!q) return res.json([]);

  const results = await LibraryService.search(userId, accessToken, q);
  return res.json(results);
}));

// Filters of the search page, from the query string; anything unknown is
// left out. `decade` is the first year of a decade (1960 = 1960s and older).
export function parseSearchFilters(query = {}) {
  const list = (value) => String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  const types = list(query.type).filter(type => type === 'Movie' || type === 'Series');
  const genres = list(query.genre).slice(0, 10);
  const decade = Number(query.decade);
  const fsk = Number(query.fsk);
  return {
    types,
    genres,
    decade: Number.isInteger(decade) && decade >= 1900 && decade <= 2100 && decade % 10 === 0 ? decade : null,
    maxAge: [0, 6, 12, 16, 18].includes(fsk) && query.fsk !== '' && query.fsk !== undefined ? fsk : null,
    unwatched: query.unwatched === '1'
  };
}

router.get('/search/full', requireAuth, jellyfinRoute('Media Search Error', 'Suche fehlgeschlagen', async (req, res) => {
  const { userId, accessToken } = req.session;
  const query = String(req.query.q || '').slice(0, 100).trim();
  const filters = parseSearchFilters(req.query);
  const hasFilter = filters.types.length || filters.genres.length || filters.decade !== null || filters.maxAge !== null || filters.unwatched;
  if (!query && !hasFilter) return res.json({ items: [], people: [] });

  const result = await LibraryService.searchFull(userId, accessToken, query, { ...filters, peopleToo: Boolean(query) },
    { limit: filters.unwatched ? UNWATCHED_POOL : SEARCH_LIMIT });
  if (filters.unwatched && result.items.length) {
    const ids = result.items.map(item => item.Id);
    const state = {};
    for (let i = 0; i < ids.length; i += USER_DATA_BATCH) {
      Object.assign(state, await UserDataService.forItems(userId, accessToken, ids.slice(i, i + USER_DATA_BATCH)));
    }
    result.items = result.items.filter(item => state[item.Id]?.played !== true);
  }
  result.items = result.items.slice(0, SEARCH_LIMIT);
  return res.json(result);
}));

router.get('/search/decades', requireAuth, jellyfinRoute('Media Decades Error', 'Jahrzehnte konnten nicht geladen werden', async (req, res) => {
  res.json({ decades: await LibraryService.getDecades(req.session.userId, req.session.accessToken) });
}));

router.get('/screensaver', requireAuth, jellyfinRoute('Screensaver Error', 'Bildschirmschoner konnte nicht geladen werden', async (req, res) => {
  const limit = Math.max(1, Math.min(60, parseInt(req.query.limit) || 30));
  res.json({ items: await LibraryService.getScreensaverItems(req.session.userId, req.session.accessToken, limit) });
}));

router.get('/item/:id', requireAuth, jellyfinRoute('Media Item Error', 'Details konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const item = await ItemsService.getItemDetails(userId, accessToken, id);
  return res.json(item);
}));

router.get('/item/:id/similar', requireAuth, jellyfinRoute('Media Similar Error', 'Ähnliche Titel konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const items = await ItemsService.getSimilarItems(userId, accessToken, id);
  return res.json(items);
}));

router.get('/item/:id/seasons', requireAuth, jellyfinRoute('Media Seasons Error', 'Staffeln konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const seasons = await ItemsService.getSeasons(userId, accessToken, id);
  return res.json(seasons);
}));

router.get('/item/:id/episodes', requireAuth, jellyfinRoute('Media Episodes Error', 'Folgen konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const { seasonId } = req.query;

  const episodes = await ItemsService.getEpisodes(userId, accessToken, id, seasonId);
  return res.json(episodes);
}));

// "Als gesehen markieren" and back, for a film, an episode, a season or a
// whole series (Jellyfin applies it to every episode below). The progress
// cache of the user starts over, so every card shows the new state.
const setPlayed = (played) => jellyfinRoute('Media Played Error', played ? 'Konnte nicht als gesehen markiert werden' : 'Konnte nicht als ungesehen markiert werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const userData = played
    ? await PlaybackApiService.markPlayed(userId, accessToken, id)
    : await PlaybackApiService.markUnplayed(userId, accessToken, id);
  UserDataService.forget(userId);
  return res.json({ played, userData });
});

router.post('/item/:id/played', requireAuth, setPlayed(true));
router.delete('/item/:id/played', requireAuth, setPlayed(false));

router.get('/genres', requireAuth, jellyfinRoute('Media Genres Error', 'Genres konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type } = req.query;

  if (!type) return res.status(400).json({ error: 'Typ fehlt' });

  const genres = await LibraryService.getGenres(userId, accessToken, type);
  return res.json(genres);
}));

router.get('/studios', requireAuth, jellyfinRoute('Media Studios Error', 'Studios konnten nicht geladen werden', async (req, res) => {
  const { userId, accessToken } = req.session;

  const studios = await LibraryService.getStudios(userId, accessToken);
  return res.json(studios);
}));

router.get('/library', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type, genre, studio, publisher, page, limit } = req.query;

  if (!type) return res.status(400).json({ error: 'Typ fehlt' });
  if (studio && publisher) {
    return res.status(400).json({ error: 'Entweder Studio oder Publisher angeben, nicht beides' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(MAX_LIBRARY_LIMIT, parseInt(limit) || 50));

  try {
    const result = publisher
      ? await LibraryService.getLibraryByPublisher(userId, accessToken, type, publisher, genre, pageNum, limitNum)
      : await LibraryService.getLibrary(userId, accessToken, type, genre, studio, pageNum, limitNum);
    return res.json({
      items: result.items,
      totalItems: result.totalRecordCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.totalRecordCount / limitNum)
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('[Media Library Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Bibliothek konnte nicht geladen werden' });
  }
}));

export default router;
