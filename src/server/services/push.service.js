// Web Push: VAPID keys, the subscriptions of each user's devices and
// delivery to them.
import webpush from 'web-push';
import env from '../config/env.js';
import db from '../db/database.js';
import { AppSettingsService } from './app-settings.service.js';
import { httpError } from '../utils/httpError.js';

const KEYS_SETTING = 'vapid_keys';
const MAX_FAILURES = 5;
const PARALLEL = 10;
// Devices per user; a new one beyond that replaces the one heard of longest ago.
export const MAX_SUBSCRIPTIONS_PER_USER = 10;
// A notification that could not be delivered within a day is no news anymore.
const TTL_SECONDS = 24 * 60 * 60;

const statements = {
  forUser: db.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'),
  countForUser: db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?'),
  ownsEndpoint: db.prepare('SELECT 1 AS found FROM push_subscriptions WHERE endpoint = ? AND user_id = ?'),
  oldestForUser: db.prepare(`
    SELECT id FROM push_subscriptions WHERE user_id = ?
    ORDER BY COALESCE(last_success_at, created_at) ASC, id ASC LIMIT ?
  `),
  upsert: db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      user_agent = excluded.user_agent, session_id = excluded.session_id, failure_count = 0
  `),
  deleteOwnEndpoint: db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?'),
  deleteForUser: db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?'),
  deleteForSession: db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND session_id = ?'),
  boundSessions: db.prepare('SELECT DISTINCT session_id FROM push_subscriptions WHERE session_id IS NOT NULL'),
  deleteSession: db.prepare('DELETE FROM push_subscriptions WHERE session_id = ?'),
  rebind: db.prepare('UPDATE push_subscriptions SET session_id = ? WHERE endpoint = ? AND user_id = ?'),
  deleteById: db.prepare('DELETE FROM push_subscriptions WHERE id = ?'),
  success: db.prepare('UPDATE push_subscriptions SET last_success_at = ?, failure_count = 0 WHERE id = ?'),
  failure: db.prepare('UPDATE push_subscriptions SET failure_count = failure_count + 1 WHERE id = ?'),
  failures: db.prepare('SELECT failure_count FROM push_subscriptions WHERE id = ?')
};

// The VAPID pair: from .env, else made once and kept in app_settings. No
// account anywhere; the browsers' push services take any key pair.
export function loadVapidKeys({ settings = AppSettingsService, generate = () => webpush.generateVAPIDKeys(), config = env } = {}) {
  if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
    return { publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY };
  }
  try {
    const stored = JSON.parse(settings.get(KEYS_SETTING) || 'null');
    if (stored?.publicKey && stored?.privateKey) return stored;
  } catch {
    // Unreadable: a new pair below (old subscriptions then renew themselves).
  }
  const keys = generate();
  settings.set(KEYS_SETTING, JSON.stringify({ publicKey: keys.publicKey, privateKey: keys.privateKey }));
  return keys;
}

// The push services of the browsers VANTA runs in: Chrome/Edge-Chromium
// (FCM, which now hands out endpoints such as jmt17.google.com/fcm/send/…),
// Firefox (Mozilla autopush), Safari (Apple) and Edge/Windows (WNS).
// Any other endpoint would make the server post to an address a client chose.
const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'google.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

export const isKnownPushEndpoint = (endpoint) => {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
  return PUSH_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
};

export const isValidSubscription = (subscription) =>
  typeof subscription?.endpoint === 'string'
  && subscription.endpoint.length < 2048
  && isKnownPushEndpoint(subscription.endpoint)
  && typeof subscription.keys?.p256dh === 'string' && subscription.keys.p256dh.length < 256
  && typeof subscription.keys?.auth === 'string' && subscription.keys.auth.length < 256;

// The push service says this subscription is broken for good: a 4xx other
// than "too many requests". 404/410 mean it is gone at once; 429, a 5xx, a
// timeout or no answer at all are the push service's trouble, not the device's.
const isGone = (statusCode) => statusCode === 404 || statusCode === 410;
const isRejected = (statusCode) => Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500 && statusCode !== 429;

async function inBatches(items, size, run) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(run));
  }
}

// A subscription the push service no longer knows (404/410), or that it
// refused five times in a row, is dropped. Each belongs to the session
// (public id) that made it, so signing that session out ends its pushes too.
export function createPushService({ sender = webpush, now = () => Date.now(), log = console, keys = null } = {}) {
  let vapid = keys;
  const ensureKeys = () => {
    if (!vapid) vapid = loadVapidKeys();
    return vapid;
  };

  return {
    publicKey: () => ensureKeys().publicKey,

    subscribe(userId, subscription, userAgent = '', sessionId = null) {
      if (!isValidSubscription(subscription)) {
        throw httpError(400, 'Ungültiges Push-Abo');
      }
      if (!statements.ownsEndpoint.get(subscription.endpoint, userId)) {
        const excess = statements.countForUser.get(userId).n - MAX_SUBSCRIPTIONS_PER_USER + 1;
        if (excess > 0) statements.oldestForUser.all(userId, excess).forEach(row => statements.deleteById.run(row.id));
      }
      statements.upsert.run(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth,
        String(userAgent || '').slice(0, 300), now(), sessionId ? String(sessionId) : null);
    },

    unsubscribe(userId, endpoint) {
      if (typeof endpoint !== 'string') return false;
      return statements.deleteOwnEndpoint.run(endpoint, userId).changes > 0;
    },

    removeAllFor(userId) {
      statements.deleteForUser.run(userId);
    },

    // The same device signed in again: its subscription moves to the new
    // session. Answers whether there was one.
    rebind(userId, endpoint, sessionId) {
      if (typeof endpoint !== 'string' || !sessionId) return false;
      return statements.rebind.run(String(sessionId), endpoint, userId).changes > 0;
    },

    // A session was signed out from another device.
    removeForSession(userId, sessionId) {
      if (!sessionId) return 0;
      return statements.deleteForSession.run(userId, String(sessionId)).changes;
    },

    // Subscriptions of sessions that ended (expired, replaced by another
    // login) go; `liveSessionIds` are the public ids of all sessions left.
    // Subscriptions from before sessions were recorded stay.
    pruneEndedSessions(liveSessionIds) {
      let removed = 0;
      for (const { session_id: sessionId } of statements.boundSessions.all()) {
        if (!liveSessionIds.has(sessionId)) removed += statements.deleteSession.run(sessionId).changes;
      }
      return removed;
    },

    deviceCount: (userId) => statements.countForUser.get(userId).n,

    // `payload`: { title, body, url, image, tag }; never a token, only what
    // the notification shows.
    async sendToUser(userId, payload) {
      const subscriptions = statements.forUser.all(userId);
      if (subscriptions.length === 0) return { sent: 0, failed: 0 };
      const { publicKey, privateKey } = ensureKeys();
      const body = JSON.stringify(payload);
      let sent = 0;
      let failed = 0;
      // Why each failed device failed: the push service's status and host.
      const errors = [];
      await inBatches(subscriptions, PARALLEL, async (subscription) => {
        try {
          await sender.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            body,
            { TTL: TTL_SECONDS, vapidDetails: { subject: env.VAPID_SUBJECT, publicKey, privateKey } }
          );
          statements.success.run(now(), subscription.id);
          sent += 1;
        } catch (error) {
          failed += 1;
          let host = '';
          try { host = new URL(subscription.endpoint).hostname; } catch { /* stored ones are valid */ }
          errors.push({ status: error.statusCode || null, host });
          if (isGone(error.statusCode)) {
            log.warn?.(`[Push] subscription at ${host} no longer valid (${error.statusCode}), removed`);
            statements.deleteById.run(subscription.id);
            return;
          }
          if (isRejected(error.statusCode)) {
            statements.failure.run(subscription.id);
            if ((statements.failures.get(subscription.id)?.failure_count || 0) >= MAX_FAILURES) statements.deleteById.run(subscription.id);
          }
          log.warn?.(`[Push] delivery to ${host} failed (${error.statusCode || error.message}${error.body ? `: ${String(error.body).slice(0, 200)}` : ''})`);
        }
      });
      return { sent, failed, errors };
    }
  };
}

export const PushService = createPushService();
