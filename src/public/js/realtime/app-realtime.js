import { authStore } from '../store/auth.store.js';
import { createAppSocket } from './app.socket.js';
import { watchPartyInvitationStore } from '../store/watch-party-invitations.store.js';

let socket = null;

export function initAppRealtime() {
  authStore.subscribe(({ isAuthenticated }) => {
    if (isAuthenticated && !socket) {
      socket = createAppSocket({
        onMessage: message => watchPartyInvitationStore.handleRealtimeMessage(message)
      });
      watchPartyInvitationStore.loadPending();
      return;
    }

    if (!isAuthenticated && socket) {
      socket.close();
      socket = null;
      watchPartyInvitationStore.clear();
    }
  });
}
