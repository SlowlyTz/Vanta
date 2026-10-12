import { authStore } from '../store/auth.store.js';
import { createAppSocket } from './app.socket.js';
import { watchPartyInvitationStore } from '../store/watch-party-invitations.store.js';
import { reportServerBuild } from '../utils/appVersion.js';
import { notificationsStore } from '../store/notifications.store.js';
import { preferencesStore } from '../store/preferences.store.js';
import { watchlistStore } from '../store/watchlist.store.js';
import { endClientSession } from '../utils/sessionNotice.js';
import { resetScreensaverCache } from '../components/screensaver.js';
import { recentSearches } from '../utils/recentSearches.js';
import { resetSettingsStatsCache } from '../components/settings/settingsStats.js';

let socket = null;

export function initAppRealtime() {
  authStore.subscribe(({ isAuthenticated }) => {
    if (isAuthenticated && !socket) {
      socket = createAppSocket({
        onMessage: message => {
          // Sent on every (re)connect, so an open tab hears about a deploy as
          // soon as the restarted server takes the socket back.
          if (message?.type === 'APP_SOCKET_READY') {
            reportServerBuild(message.build, message.version);
            // A reconnect may have missed changes.
            notificationsStore.refresh();
            return;
          }
          // The server ended this session (a ban): out to the login at once,
          // even mid-stream.
          if (message?.type === 'SESSION_ENDED') {
            endClientSession({ message: message.error, reason: message.reason });
            return;
          }
          if (message?.type === 'NOTIFICATIONS_CHANGED') {
            notificationsStore.refresh();
            return;
          }
          watchPartyInvitationStore.handleRealtimeMessage(message);
        }
      });
      watchPartyInvitationStore.loadPending();
      notificationsStore.start();
      preferencesStore.load();
      watchlistStore.load();
      return;
    }

    if (!isAuthenticated && socket) {
      socket.close();
      socket = null;
      watchPartyInvitationStore.clear();
      notificationsStore.stop();
      preferencesStore.clear();
      watchlistStore.clear();
      // What the next person on this device must not see.
      resetScreensaverCache();
      recentSearches.clear();
      resetSettingsStatsCache();
    }
  });
}
