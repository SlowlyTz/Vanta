import express from 'express';
import { TrailersService } from '../../services/jellyfin/trailers.service.js';
import { destroyInvalidSession, isUpstreamUnauthorized, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

router.get('/trailers', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { cursor, limit, refresh } = req.query;

  try {
    const result = await TrailersService.getTrailerPage(
      req,
      userId,
      accessToken,
      cursor,
      limit,
      refresh === '1' || refresh === 'true'
    );
    return res.json(result);
  } catch (error) {
    console.error('[Media Trailers Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to fetch trailers' });
  }
}));

router.post('/item/:id/favorite', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const result = await TrailersService.setFavorite(userId, accessToken, id, true);
    return res.json(result);
  } catch (error) {
    console.error('[Media Favorite Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to set favorite' });
  }
}));

router.delete('/item/:id/favorite', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const result = await TrailersService.setFavorite(userId, accessToken, id, false);
    return res.json(result);
  } catch (error) {
    console.error('[Media Unfavorite Error]', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
}));

export default router;
