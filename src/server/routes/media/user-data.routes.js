import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { UserDataService } from '../../services/user-data.service.js';
import { ID_PATTERN } from '../../utils/ids.js';

// Progress, "gesehen" and the next episode for the cards on screen:
// GET /api/media/userdata?ids=a,b,c → { a: { played, progress, next, seriesProgress } }.
export function createUserDataRouter({ service = UserDataService } = {}) {
  const router = express.Router();

  router.get('/userdata', requireAuth, jellyfinRoute('User Data Error', 'Fortschritt konnte nicht geladen werden', async (req, res) => {
    const ids = String(req.query.ids || '').split(',').map(id => id.trim()).filter(id => ID_PATTERN.test(id));
    res.setHeader('Cache-Control', 'no-store');
    if (ids.length === 0) return res.json({});
    return res.json(await service.forItems(req.session.userId, req.session.accessToken, ids));
  }));

  // The player was left: the next answers are fetched fresh.
  router.post('/userdata/refresh', requireAuth, asyncHandler(async (req, res) => {
    service.forget(req.session.userId);
    res.json({ ok: true });
  }));

  return router;
}

export default createUserDataRouter();
