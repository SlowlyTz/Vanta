import express from 'express';
import { LibraryService } from '../../services/jellyfin/library.service.js';
import { ItemsService } from '../../services/jellyfin/items.service.js';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { HomeSectionsService } from '../../services/home-sections.service.js';
import { destroyInvalidSession, isUpstreamUnauthorized, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';

const router = express.Router();

router.get('/home', requireAuth, jellyfinRoute('Media Home Error', 'Failed to fetch media library data', async (req, res) => {
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
    return res.status(error.status || 500).json({ error: 'Failed to fetch home section group' });
  }
}));

router.get('/search', requireAuth, jellyfinRoute('Media Search Error', 'Failed to search media items', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { q } = req.query;

  if (!q) return res.json([]);

  const results = await LibraryService.search(userId, accessToken, q);
  return res.json(results);
}));

router.get('/item/:id', requireAuth, jellyfinRoute('Media Item Error', 'Failed to fetch item details', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const item = await ItemsService.getItemDetails(userId, accessToken, id);
  return res.json(item);
}));

router.get('/item/:id/similar', requireAuth, jellyfinRoute('Media Similar Error', 'Failed to fetch similar items', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const items = await ItemsService.getSimilarItems(userId, accessToken, id);
  return res.json(items);
}));

router.get('/item/:id/seasons', requireAuth, jellyfinRoute('Media Seasons Error', 'Failed to fetch seasons', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const seasons = await ItemsService.getSeasons(userId, accessToken, id);
  return res.json(seasons);
}));

router.get('/item/:id/episodes', requireAuth, jellyfinRoute('Media Episodes Error', 'Failed to fetch episodes', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const { seasonId } = req.query;

  const episodes = await ItemsService.getEpisodes(userId, accessToken, id, seasonId);
  return res.json(episodes);
}));

const setPlayed = (played) => asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const userData = played
      ? await PlaybackApiService.markPlayed(userId, accessToken, id)
      : await PlaybackApiService.markUnplayed(userId, accessToken, id);
    return res.json({ played, userData });
  } catch (error) {
    console.error('[Media Played Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: played ? 'Failed to mark as played' : 'Failed to mark as unplayed' });
  }
});

router.post('/item/:id/played', requireAuth, setPlayed(true));
router.delete('/item/:id/played', requireAuth, setPlayed(false));

router.get('/genres', requireAuth, jellyfinRoute('Media Genres Error', 'Failed to fetch genres', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type } = req.query;

  if (!type) return res.status(400).json({ error: 'Type is required' });

  const genres = await LibraryService.getGenres(userId, accessToken, type);
  return res.json(genres);
}));

router.get('/studios', requireAuth, jellyfinRoute('Media Studios Error', 'Failed to fetch studios', async (req, res) => {
  const { userId, accessToken } = req.session;

  const studios = await LibraryService.getStudios(userId, accessToken);
  return res.json(studios);
}));

router.get('/library', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type, genre, studio, publisher, page, limit } = req.query;

  if (!type) return res.status(400).json({ error: 'Type is required' });
  if (studio && publisher) {
    return res.status(400).json({ error: 'Use either studio or publisher, not both' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));

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
    return res.status(500).json({ error: 'Failed to fetch library items' });
  }
}));

export default router;
