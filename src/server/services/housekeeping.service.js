import db from '../db/database.js';
import { UserDirectory } from './user-directory.service.js';
import { NotifyService } from './notify.service.js';
import { PushService } from './push.service.js';

// The per-user tables of requests.db that only make sense while the
// Jellyfin account exists.
export const PER_USER_TABLES = ['user_preferences', 'watchlist', 'resume_hidden', 'push_subscriptions', 'notification_preferences', 'notifications', 'notification_seen'];

// Runs after every catalogue run: old notifications go, rows of Jellyfin
// accounts that were deleted go, and so do push subscriptions of sessions
// that ended (expired or replaced by another login). Each step on its own;
// none of them fails the others.
export function createHousekeeping({
  database = db,
  directory = UserDirectory,
  notify = NotifyService,
  push = PushService,
  // Loaded on demand: the session store opens sessions.db.
  loadSessions = () => import('../config/session.js').then(module => module.sessionStore),
  // Loaded on demand like the sessions: it brings the sockets along.
  signOutDeleted = userId => import('./session-revocation.service.js')
    .then(module => module.revokeUserAccess(userId, null, { payload: module.accountDeletedPayload() })),
  log = console
} = {}) {
  const statements = Object.fromEntries(PER_USER_TABLES.map(table => [table, {
    users: database.prepare(`SELECT DISTINCT user_id FROM ${table}`),
    remove: database.prepare(`DELETE FROM ${table} WHERE user_id = ?`)
  }]));

  // Rows of users Jellyfin no longer knows. Without an answer, or with an
  // empty one, nothing is removed. Asked fresh: a list from the cache would
  // not yet name a user created minutes ago and delete their first rows.
  const removeDeletedUsers = async () => {
    const known = await directory.allIds({ fresh: true });
    if (!known?.size) return 0;
    let removed = 0;
    // Deleted in Jellyfin itself: their VANTA sessions end as well.
    for (const userId of await (await loadSessions()).liveUserIds()) {
      if (!known.has(String(userId))) await signOutDeleted(userId);
    }
    for (const { users, remove } of Object.values(statements)) {
      for (const { user_id: userId } of users.all()) {
        if (!known.has(String(userId))) removed += remove.run(userId).changes;
      }
    }
    return removed;
  };

  const step = async (label, run) => {
    try {
      return await run();
    } catch (error) {
      log.warn?.(`[Housekeeping] ${label}: ${error.message}`);
      return null;
    }
  };

  return {
    async run() {
      const pruned = await step('notifications', () => notify.prune());
      const deletedUsers = await step('deleted users', removeDeletedUsers);
      const endedSessions = await step('push of ended sessions', async () => push.pruneEndedSessions(await (await loadSessions()).livePublicIds()));
      return { pruned, deletedUsers, endedSessions };
    }
  };
}

export const Housekeeping = createHousekeeping();
