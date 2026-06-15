import express from 'express';
import env from '../config/env.js';
import { SeerService } from '../services/seer.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const SEER_API_KEY = env.SEER_API_KEY;

router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json([]);
  }

  try {
    const results = await SeerService.search(q, SEER_API_KEY);
    return res.json(results);
  } catch (error) {
    console.error('[Seer Search Error]', error.message);
    return res.status(500).json({ error: 'Failed to search Jellyseer' });
  }
}));

router.get('/movie/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const details = await SeerService.getMovieDetails(id, SEER_API_KEY);
    return res.json(details);
  } catch (error) {
    console.error('[Seer Movie Details Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch movie details from Jellyseer' });
  }
}));

router.get('/tv/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const details = await SeerService.getTvDetails(id, SEER_API_KEY);
    return res.json(details);
  } catch (error) {
    console.error('[Seer TV Details Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch TV details from Jellyseer' });
  }
}));

router.post('/request', requireAuth, asyncHandler(async (req, res) => {
  const seerToken = req.session.seerToken;

  if (!seerToken) {
    return res.status(403).json({ error: 'Jellyseer authentication required' });
  }

  const { mediaType, mediaId, seasons } = req.body;

  if (!mediaType || !mediaId) {
    return res.status(400).json({ error: 'mediaType and mediaId are required' });
  }

  const data = {
    mediaType,
    mediaId
  };

  if (mediaType === 'tv' && seasons && Array.isArray(seasons)) {
    data.seasons = seasons;
  }

  try {
    const result = await SeerService.requestMedia(data, seerToken);
    return res.json(result);
  } catch (error) {
    console.error('[Seer Request Error]', error.message);
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Failed to create request' });
  }
}));

router.get('/requests', requireAuth, asyncHandler(async (req, res) => {
  const seerToken = req.session.seerToken;

  if (!seerToken) {
    return res.status(403).json({ error: 'Jellyseer authentication required' });
  }

  const { take, skip, filter } = req.query;
  const filterOptions = {};

  if (take) filterOptions.take = take;
  if (skip) filterOptions.skip = skip;
  if (filter) filterOptions.filter = filter;

  try {
    const result = await SeerService.getMyRequests(seerToken, filterOptions);
    return res.json(result);
  } catch (error) {
    console.error('[Seer Requests Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
}));

router.delete('/request/:id', requireAuth, asyncHandler(async (req, res) => {
  const seerToken = req.session.seerToken;

  if (!seerToken) {
    return res.status(403).json({ error: 'Jellyseer authentication required' });
  }

  const { id } = req.params;

  try {
    await SeerService.deleteRequest(id, seerToken);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Seer Delete Request Error]', error.message);
    return res.status(500).json({ error: 'Failed to delete request' });
  }
}));

export default router;