import { sessionStore } from '../config/session.js';
import { AuthService } from './jellyfin/auth.service.js';
import { forgetTokenDevice } from './jellyfin/client.js';
import { appSocketHub } from '../realtime/app.socket.js';
import { watchPartySocketHub } from '../realtime/watch-party.socket.js';
import { bannedPayload } from './user-ban.service.js';

// What a user whose account was deleted is told on the login page.
export const ACCOUNT_DELETED_MESSAGE = 'Dein Konto wurde gelöscht.';
export const accountDeletedPayload = () => ({ error: ACCOUNT_DELETED_MESSAGE, code: 'ACCOUNT_DELETED', reason: null });

// Cuts a user off everywhere at once: every session in the store, the
// Jellyfin tokens behind them, open app sockets (which carry the reason to the
// client) and watch-party connections. Nothing here may stop the ban itself.
// `payload`: what the client shows (a ban by default, or accountDeletedPayload).
export async function revokeUserAccess(userId, ban, {
  payload = bannedPayload(ban),
  store = sessionStore,
  auth = AuthService,
  appSockets = appSocketHub,
  partySockets = watchPartySocketHub,
  // Loaded on demand: the push service brings the database with it.
  loadPush = () => import('./push.service.js').then(module => module.PushService),
  log = console
} = {}) {
  let sessions = [];
  try {
    sessions = await store.destroyByUserId(userId);
  } catch (error) {
    log.error?.('[Ban] could not end the sessions:', error.message);
  }

  await Promise.all(sessions.map(async (sess) => {
    if (!sess?.accessToken) return;
    try {
      await auth.logout(sess.accessToken);
    } catch (error) {
      log.warn?.('[Ban] Jellyfin session not ended:', error.message);
    } finally {
      forgetTokenDevice(sess.accessToken);
    }
  }));

  try {
    appSockets.endUserSessions(userId, payload);
    partySockets.closeAllUserConnections(userId);
  } catch (error) {
    log.error?.('[Ban] could not close the sockets:', error.message);
  }

  // No more pushes to any of their devices.
  try {
    (await loadPush()).removeAllFor(userId);
  } catch (error) {
    log.warn?.('[Ban] push subscriptions not removed:', error.message);
  }

  return { sessions: sessions.length };
}
