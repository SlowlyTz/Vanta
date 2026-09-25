import { authStore } from '../store/auth.store.js';
import { createAppSocket } from './app.socket.js';
import { watchPartyInvitationStore } from '../store/watch-party-invitations.store.js';
import { reportServerBuild } from '../utils/appVersion.js';
import { notificationsStore } from '../store/notifications.store.js';

let socket = null;

export function initAppRealtime() {
  authStore.subscribe(({ isAuthenticated }) => {
    if (isAuthenticated && !socket) {
      socket = createAppSocket({
        onMessage: message => {
          // Sent on every (re)connect, so an open tab hears about a deploy as
          // soon as the restarted server takes the socket back.
          if (message?.type === 'APP_SOCKET_READY') {
            reportServerBuild(message.build);
            // A reconnect may have missed changes.
            notificationsStore.refresh();
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
      return;
    }

    if (!isAuthenticated && socket) {
      socket.close();
      socket = null;
      watchPartyInvitationStore.clear();
      notificationsStore.stop();
    }
  });
}
