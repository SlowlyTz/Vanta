import express from 'express';
import { requireAuth, requireFreshAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { RequestsService } from '../services/requests.service.js';
import { TmdbService } from '../services/tmdb.service.js';

const router = express.Router();

// Search TMDB
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const results = await TmdbService.search(q);
  res.json(results);
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
    requested: await RequestsService.exists(parseInt(tmdbId), tmdbType)
  });
}));

// Cross-check with Jellyfin library
router.post('/cross-check', requireAuth, asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType } = req.body;
  if (!tmdbId || !tmdbType) return res.status(400).json({ error: 'tmdbId and tmdbType required' });

  const { userId, accessToken } = req.session;
  const result = await RequestsService.crossCheck(userId, accessToken, parseInt(tmdbId), tmdbType);
  res.json(result);
}));

// Create request (requires auth)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { tmdbId, tmdbType, note } = req.body;
  if (!tmdbId || !tmdbType) return res.status(400).json({ error: 'tmdbId and tmdbType required' });

  const { userId, username } = req.session;
  const result = await RequestsService.create(userId, username, parseInt(tmdbId), tmdbType, note);
  res.status(201).json(result);
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

// Approve request (admin only)
router.post('/:id/approve', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const request = await RequestsService.approve(req.params.id);
  res.json(request);
}));

// Reject request and ban future requests for that medium (admin only)
router.post('/:id/reject', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const request = await RequestsService.reject(req.params.id);
  res.json(request);
}));

// Get single request
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const request = await RequestsService.getById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  res.json(request);
}));

// Delete request
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await RequestsService.delete(req.params.id);
  res.json({ success: true });
}));

// Update request status (admin only)
router.patch('/:id', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });
  if (!['pending', 'approved', 'imported', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await RequestsService.updateStatus(req.params.id, status);
  res.json({ success: true });
}));

export default router;
