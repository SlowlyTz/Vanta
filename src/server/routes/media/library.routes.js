import express from 'express';
import { LibraryService } from '../../services/jellyfin/library.service.js';
import { ItemsService } from '../../services/jellyfin/items.service.js';
import { destroyInvalidSession, isUpstreamUnauthorized, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

router.get('/home', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;

  try {
    const [resume, movies, series] = await Promise.all([
      LibraryService.getResumeItems(userId, accessToken),
      LibraryService.getMovies(userId, accessToken),
      LibraryService.getSeries(userId, accessToken)
    ]);

    return res.json({ resume, movies, series });
  } catch (error) {
    console.error('[Media Home Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch media library data' });
  }
}));

router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { q } = req.query;

  if (!q) return res.json([]);

  try {
    const results = await LibraryService.search(userId, accessToken, q);
    return res.json(results);
  } catch (error) {
    console.error('[Media Search Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to search media items' });
  }
}));

router.get('/item/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const item = await ItemsService.getItemDetails(userId, accessToken, id);
    return res.json(item);
  } catch (error) {
    console.error('[Media Item Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch item details' });
  }
}));

router.get('/item/:id/similar', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const items = await ItemsService.getSimilarItems(userId, accessToken, id);
    return res.json(items);
  } catch (error) {
    console.error('[Media Similar Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch similar items' });
  }
}));

router.get('/item/:id/seasons', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const seasons = await ItemsService.getSeasons(userId, accessToken, id);
    return res.json(seasons);
  } catch (error) {
    console.error('[Media Seasons Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch seasons' });
  }
}));

router.get('/item/:id/episodes', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const { seasonId } = req.query;

  try {
    const episodes = await ItemsService.getEpisodes(userId, accessToken, id, seasonId);
    return res.json(episodes);
  } catch (error) {
    console.error('[Media Episodes Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch episodes' });
  }
}));

router.get('/genres', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type } = req.query;

  if (!type) return res.status(400).json({ error: 'Type is required' });

  try {
    const genres = await LibraryService.getGenres(userId, accessToken, type);
    return res.json(genres);
  } catch (error) {
    console.error('[Media Genres Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch genres' });
  }
}));

router.get('/studios', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;

  try {
    const studios = await LibraryService.getStudios(userId, accessToken);
    return res.json(studios);
  } catch (error) {
    console.error('[Media Studios Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch studios' });
  }
}));

router.get('/library', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type, genre, studio, page, limit } = req.query;

  if (!type) return res.status(400).json({ error: 'Type is required' });

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));

  try {
    const result = await LibraryService.getLibrary(userId, accessToken, type, genre, studio, pageNum, limitNum);
    return res.json({
      items: result.items,
      totalItems: result.totalRecordCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.totalRecordCount / limitNum)
    });
  } catch (error) {
    console.error('[Media Library Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch library items' });
  }
}));

export default router;
