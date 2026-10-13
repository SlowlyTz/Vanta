import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { jellyfinRoute } from '../utils/jellyfinRoute.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { WatchlistService } from '../services/watchlist.service.js';
import { requireValidId } from '../utils/ids.js';

// "Meine Liste". The ids are what the cards and menus need to show the
// state; the full list is for the home row and the profile tab.
export function createWatchlistRouter({ service = WatchlistService } = {}) {
  const router = express.Router();

  router.get('/', requireAuth, jellyfinRoute('Watchlist Error', 'Meine Liste konnte nicht geladen werden', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ items: await service.list(req.session.userId, req.session.accessToken) });
  }));

  router.get('/ids', requireAuth, asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ids: service.ids(req.session.userId) });
  }));

  router.put('/:id', requireAuth, requireValidId, jellyfinRoute('Watchlist Add Error', 'Konnte nicht zur Liste hinzugefügt werden', async (req, res) => {
    try {
      res.json(await service.add(req.session.userId, req.session.accessToken, req.params.id));
    } catch (error) {
      if (error.status === 400 || error.status === 409) return res.status(error.status).json({ error: error.message });
      throw error;
    }
  }));

  router.delete('/:id', requireAuth, requireValidId, asyncHandler(async (req, res) => {
    res.json({ removed: service.remove(req.session.userId, req.params.id) });
  }));

  return router;
}

export default createWatchlistRouter();
