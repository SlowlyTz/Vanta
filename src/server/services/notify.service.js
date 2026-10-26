// The one way to notify a user: per-kind preferences, the in-app feed, Web
// Push to their devices and a hint to their open apps.
import db from '../db/database.js';
import { NOTIFICATION_KINDS, NOTIFICATION_KIND_IDS, kindsFor } from '../../public/js/shared/notificationKinds.js';
import { PushService } from './push.service.js';
import { appSocketHub } from '../realtime/app.socket.js';

const FEED_LIMIT = 50;
const KEEP_DAYS = 90;
// The newest entries a user keeps; older ones go with each new one.
export const MAX_PER_USER = 200;
// Recipients handled at the same time (a message to everyone).
export const NOTIFY_BATCH = 25;
const MAIN_SWITCH = '*';

const statements = {
  prefs: db.prepare('SELECT kind, push, in_app FROM notification_preferences WHERE user_id = ?'),
  setPref: db.prepare(`
    INSERT INTO notification_preferences (user_id, kind, push, in_app) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, kind) DO UPDATE SET push = excluded.push, in_app = excluded.in_app
  `),
  insert: db.prepare('INSERT INTO notifications (user_id, kind, title, body, url, image_item_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  feed: db.prepare('SELECT id, kind, title, body, url, image_item_id, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'),
  unread: db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL'),
  readAll: db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL'),
  readOne: db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND id = ? AND read_at IS NULL'),
  trim: db.prepare(`
    DELETE FROM notifications WHERE user_id = ? AND id NOT IN (
      SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
    )
  `),
  prune: db.prepare('DELETE FROM notifications WHERE created_at < ?')
};

const DEFAULTS = new Map(NOTIFICATION_KINDS.map(entry => [entry.kind, entry.on]));

// Who wants what: per kind push and in-app (default from the kind), plus the
// push main switch (kind '*', on unless switched off).
export function readPreferences(userId, { isAdmin = false } = {}) {
  const stored = new Map(statements.prefs.all(userId).map(row => [row.kind, row]));
  const main = stored.get(MAIN_SWITCH);
  return {
    push: main ? main.push === 1 : true,
    kinds: kindsFor({ isAdmin }).map(entry => {
      const row = stored.get(entry.kind);
      return {
        kind: entry.kind,
        push: row ? row.push === 1 : DEFAULTS.get(entry.kind),
        inApp: row ? row.in_app === 1 : DEFAULTS.get(entry.kind)
      };
    })
  };
}

export function writePreferences(userId, patch = {}, { isAdmin = false } = {}) {
  if (typeof patch.push === 'boolean') statements.setPref.run(userId, MAIN_SWITCH, patch.push ? 1 : 0, 1);
  const allowed = new Set(kindsFor({ isAdmin }).map(entry => entry.kind));
  const current = new Map(readPreferences(userId, { isAdmin }).kinds.map(entry => [entry.kind, entry]));
  for (const change of Array.isArray(patch.kinds) ? patch.kinds : []) {
    if (!allowed.has(change?.kind)) continue;
    const before = current.get(change.kind);
    const push = typeof change.push === 'boolean' ? change.push : before.push;
    const inApp = typeof change.inApp === 'boolean' ? change.inApp : before.inApp;
    statements.setPref.run(userId, change.kind, push ? 1 : 0, inApp ? 1 : 0);
  }
  return readPreferences(userId, { isAdmin });
}

const unique = (values) => [...new Set((values || []).filter(Boolean).map(String))];

// Never throws into the action that caused it (a decision on a request must
// not fail on a push).
export function createNotifyService({ push = PushService, sockets = appSocketHub, now = () => Date.now(), log = console } = {}) {
  return {
    // The caller picks the recipients (admin kinds go to admins only).
    // Recipients go in batches, so a message to everyone does not open a
    // push request per device of every user at once.
    async notify({ userIds, kind, title, body, url = null, imageItemId = null }) {
      if (!NOTIFICATION_KIND_IDS.includes(kind)) throw new Error(`Unknown notification kind: ${kind}`);
      const deliver = async (userId) => {
        try {
          const prefs = readPreferences(userId, { isAdmin: true });
          const choice = prefs.kinds.find(entry => entry.kind === kind);
          if (!choice) return { userId, inApp: false, pushed: 0 };
          if (choice.inApp) {
            statements.insert.run(userId, kind, String(title).slice(0, 200), String(body).slice(0, 500), url, imageItemId, now());
            statements.trim.run(userId, userId, MAX_PER_USER);
            sockets.sendToUser?.(userId, { type: 'NOTIFICATIONS_CHANGED' });
          }
          let pushed = 0;
          if (prefs.push && choice.push) {
            const image = imageItemId ? `/api/media/image/${encodeURIComponent(imageItemId)}?type=Primary&maxWidth=400` : null;
            const notification = { title, body, url: url || '/#/home', image, tag: kind };
            // Browsers without a push service (Helium, ungoogled Chromium)
            // show it themselves while VANTA is open (pushSubscription.js).
            sockets.sendToUser?.(userId, { type: 'NOTIFICATION_PUSH', notification });
            ({ sent: pushed } = await push.sendToUser(userId, notification));
          }
          return { userId, inApp: choice.inApp, pushed };
        } catch (error) {
          log.warn?.(`[Notify] ${kind} to ${userId} failed: ${error.message}`);
          return { userId, inApp: false, pushed: 0, error: error.message };
        }
      };
      const recipients = unique(userIds);
      const results = [];
      for (let i = 0; i < recipients.length; i += NOTIFY_BATCH) {
        results.push(...await Promise.all(recipients.slice(i, i + NOTIFY_BATCH).map(deliver)));
      }
      return results;
    },

    feed(userId, limit = FEED_LIMIT) {
      return {
        items: statements.feed.all(userId, Math.min(FEED_LIMIT, limit)).map(row => ({
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          url: row.url,
          imageItemId: row.image_item_id,
          createdAt: row.created_at,
          read: row.read_at !== null
        })),
        unread: statements.unread.get(userId).n
      };
    },

    markRead(userId, id = null) {
      if (id === null) statements.readAll.run(now(), userId);
      else statements.readOne.run(now(), userId, Number(id));
      return statements.unread.get(userId).n;
    },

    // Daily, with the catalogue: entries older than 90 days go.
    prune() {
      return statements.prune.run(now() - KEEP_DAYS * 24 * 60 * 60 * 1000).changes;
    }
  };
}

export const NotifyService = createNotifyService();
