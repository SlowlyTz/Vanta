import express from 'express';
import { TrailersService } from '../../services/jellyfin/trailers.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';

const router = express.Router();

router.get('/trailers', requireAuth, jellyfinRoute('Media Trailers Error', 'Failed to fetch trailers', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { feedId, cursor, limit, target } = req.query;

  const result = await TrailersService.getTrailerPage(req, userId, accessToken, {
    feedId: typeof feedId === 'string' ? feedId : null,
    cursor: typeof cursor === 'string' ? cursor : null,
    limit,
    target: typeof target === 'string' ? target : null
  });
  return res.json(result);
}));

router.post('/item/:id/favorite', requireAuth, jellyfinRoute('Media Favorite Error', 'Failed to set favorite', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const result = await TrailersService.setFavorite(userId, accessToken, id, true);
  return res.json(result);
}));

router.delete('/item/:id/favorite', requireAuth, jellyfinRoute('Media Unfavorite Error', 'Failed to remove favorite', async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  const result = await TrailersService.setFavorite(userId, accessToken, id, false);
  return res.json(result);
}));

export default router;
