// Profile page data: watch stats and the paged continue-watching, history and
// favourites lists.
import express from 'express';
import { ProfileService } from '../../services/browse/profile.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';

const router = express.Router();

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 24));
  return { page, limit };
}

function buildProfileHandler(loadPage, errorLabel) {
  return jellyfinRoute(errorLabel, 'Liste konnte nicht geladen werden', async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const result = await loadPage(req.session.userId, req.session.accessToken, { page, limit });
    res.json({
      items: result.items,
      page,
      limit,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / limit)
    });
  });
}

// What one has watched: counts, time and favourite genres for the profile.
router.get('/stats', requireAuth, jellyfinRoute('Profile Stats Error', 'Statistik konnte nicht geladen werden', async (req, res) => {
  res.json(await ProfileService.getStats(req.session.userId, req.session.accessToken));
}));

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
