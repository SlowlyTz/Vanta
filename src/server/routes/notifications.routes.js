import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotificationsService } from '../services/notifications.service.js';
import { NotifyService, readPreferences, writePreferences } from '../services/notify.service.js';
import { PushService } from '../services/push.service.js';
import { publicSessionId } from '../db/session-store.js';

// One test push per user in this time; each one wakes every device.
export const TEST_PUSH_INTERVAL_MS = 30 * 1000;

export function createNotificationsRouter({ notify = NotifyService, push = PushService, now = () => Date.now() } = {}) {
  const router = express.Router();
  const isAdmin = (req) => req.session.isAdmin === true;
  const lastTestAt = new Map(); // userId -> time of the last test push
  const failedTests = new Set(); // users whose last test no device took

  // Counts behind the dots in the menu. The admin part follows the role the
  // session learned at login; the lists themselves still check it fresh.
  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(NotificationsService.getSummary(req.session.userId, { isAdmin: isAdmin(req) }));
  }));

  // The user opened "Meine Anfragen" / "Meine Meldungen". Answers with the time
  // they last looked, so the list can mark what is new since then.
  router.post('/seen', requireAuth, asyncHandler(async (req, res) => {
    try {
      const previousSeenAt = NotificationsService.markSeen(req.session.userId, req.body?.kind);
      res.json({ previousSeenAt });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      throw error;
    }
  }));

  // The bell: the last 50 notifications and how many are unread.
  router.get('/feed', requireAuth, asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(notify.feed(req.session.userId));
  }));

  // { id } marks one as read, without an id all of them.
  router.post('/read', requireAuth, asyncHandler(async (req, res) => {
    const id = req.body?.id ?? null;
    res.json({ unread: notify.markRead(req.session.userId, id === null ? null : Number(id)) });
  }));

  router.get('/preferences', requireAuth, asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...readPreferences(req.session.userId, { isAdmin: isAdmin(req) }), devices: push.deviceCount(req.session.userId) });
  }));

  router.put('/preferences', requireAuth, asyncHandler(async (req, res) => {
    res.json(writePreferences(req.session.userId, req.body || {}, { isAdmin: isAdmin(req) }));
  }));

  // The public VAPID key a browser subscribes with.
  router.get('/push-key', requireAuth, asyncHandler(async (req, res) => {
    res.json({ publicKey: push.publicKey() });
  }));

  // This device subscribes; the session remembers it, so logging out
  // unsubscribes it again, and the subscription names the session, so
  // signing it out from another device does too.
  router.post('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
    try {
      push.subscribe(req.session.userId, req.body?.subscription, req.get('user-agent'), publicSessionId(req.sessionID));
      req.session.pushEndpoint = req.body.subscription.endpoint;
      res.status(201).json({ subscribed: true });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      throw error;
    }
  }));

  router.delete('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
    const endpoint = req.body?.endpoint || req.session.pushEndpoint;
    const removed = push.unsubscribe(req.session.userId, endpoint);
    if (endpoint === req.session.pushEndpoint) delete req.session.pushEndpoint;
    res.json({ removed });
  }));

  // "Testbenachrichtigung senden": straight to this user's devices.
  router.post('/test', requireAuth, asyncHandler(async (req, res) => {
    const { userId } = req.session;
    const waitMs = (lastTestAt.get(userId) ?? -Infinity) + TEST_PUSH_INTERVAL_MS - now();
    // One retry right after a refused test (the client renewed its
    // subscription in between); never two in a row.
    const retry = req.query.retry === '1' && failedTests.has(userId);
    failedTests.delete(userId);
    if (waitMs > 0 && !retry) {
      res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
      return res.status(429).json({ error: 'Bitte warte kurz vor der nächsten Testbenachrichtigung.' });
    }
    if (lastTestAt.size >= 1000) lastTestAt.clear();
    lastTestAt.set(userId, now());
    const result = await push.sendToUser(req.session.userId, {
      title: 'VANTA',
      body: 'Benachrichtigungen funktionieren auf diesem Gerät.',
      url: '/#/home',
      tag: 'test'
    });
    if (result.sent === 0) {
      if (!retry) failedTests.add(userId);
      const reasons = (result.errors || []).map(error => `${error.host || 'Push-Dienst'}: ${error.status || 'keine Antwort'}`);
      const error = result.failed === 0
        ? 'Für dieses Konto ist kein Gerät für Push angemeldet.'
        : `Der Push-Dienst hat die Testbenachrichtigung abgelehnt (${reasons.join(', ')}).`;
      return res.status(409).json({ error, ...result });
    }
    return res.json(result);
  }));

  return router;
}

export default createNotificationsRouter();
