import express from 'express';
import { ProfileService } from '../../services/jellyfin/profile.service.js';
import { destroyInvalidSession, isUpstreamUnauthorized, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 24));
  return { page, limit };
}

function buildProfileHandler(loadPage, errorLabel) {
  return asyncHandler(async (req, res) => {
    const { userId, accessToken } = req.session;
    const { page, limit } = parsePagination(req.query);

    try {
      const result = await loadPage(userId, accessToken, { page, limit });
      return res.json({
        items: result.items,
        page,
        limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / limit)
      });
    } catch (error) {
      console.error(`[${errorLabel}]`, error.message);
      if (isUpstreamUnauthorized(error)) {
        return destroyInvalidSession(req, res);
      }
      return res.status(500).json({ error: `Failed to fetch ${errorLabel.toLowerCase()}` });
    }
  });
}

router.get('/continue-watching', requireAuth, buildProfileHandler(
  (userId, accessToken, options) => ProfileService.getContinueWatching(userId, accessToken, options),
  'Profile Continue Watching Error'
));

router.get('/history', requireAuth, buildProfileHandler(
  (userId, accessToken, options) => ProfileService.getHistory(userId, accessToken, options),
  'Profile History Error'
));

router.get('/favorites', requireAuth, buildProfileHandler(
  (userId, accessToken, options) => ProfileService.getFavorites(userId, accessToken, options),
  'Profile Favorites Error'
));

export default router;
