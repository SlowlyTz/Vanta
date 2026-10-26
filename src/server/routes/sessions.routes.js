// "Geräte" in the settings: where the user is signed in, and signing one of
// those devices out.
import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sessionStore } from '../config/session.js';
import { publicSessionId } from '../db/session-store.js';
import { AuthService } from '../services/jellyfin/auth.service.js';
import { forgetTokenDevice } from '../services/jellyfin/client.js';
import { appSocketHub } from '../realtime/app.socket.js';

const SIGNED_OUT = { error: 'Dieses Gerät wurde abgemeldet.', code: 'SIGNED_OUT' };

export function createSessionsRouter({
  store = sessionStore,
  auth = AuthService,
  appSockets = appSocketHub,
  // Loaded on demand: the push service brings the database with it.
  loadPush = () => import('../services/push.service.js').then(module => module.PushService),
  log = console
} = {}) {
  const router = express.Router();

  // A signed-out device loses its Jellyfin token, its open app (which goes
  // to the login) and its pushes. Nothing here fails the sign-out itself.
  const endDevice = async (userId, { id, session }) => {
    if (session?.accessToken) {
      auth.logout(session.accessToken).catch(error => log.warn?.('[Sessions] Jellyfin session not ended:', error.message));
      forgetTokenDevice(session.accessToken);
    }
    try {
      appSockets.endSession(userId, id, SIGNED_OUT);
    } catch (error) {
      log.warn?.('[Sessions] app socket not closed:', error.message);
    }
    try {
      (await loadPush()).removeForSession(userId, id);
    } catch (error) {
      log.warn?.('[Sessions] push subscription not removed:', error.message);
    }
  };

  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const current = publicSessionId(req.sessionID);
    const sessions = (await store.listByUserId(req.session.userId))
      .map(({ sid, ...entry }) => ({ ...entry, current: entry.id === current }))
      .sort((a, b) => Number(b.current) - Number(a.current) || (b.loginAt || 0) - (a.loginAt || 0));
    res.json({ sessions });
  }));

  // "Alle anderen abmelden", in one pass over the store.
  router.delete('/', requireAuth, asyncHandler(async (req, res) => {
    const { userId } = req.session;
    const ended = await store.destroyOthers(userId, { keep: publicSessionId(req.sessionID) });
    await Promise.all(ended.map(entry => endDevice(userId, entry)));
    res.json({ ended: ended.length });
  }));

  router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { userId } = req.session;
    if (req.params.id === publicSessionId(req.sessionID)) {
      return res.status(400).json({ error: 'Dieses Gerät meldest du über „Abmelden“ ab.' });
    }
    const session = await store.destroyOne(userId, req.params.id);
    if (!session) return res.status(404).json({ error: 'Gerät nicht gefunden' });
    await endDevice(userId, { id: req.params.id, session });
    return res.json({ ended: true });
  }));

  return router;
}

export default createSessionsRouter();
