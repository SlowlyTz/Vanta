import { WatchPartyApi } from '../api/watch-party.api.js';
import { appStore } from './app.store.js';

class WatchPartyInvitationStore {
  constructor() {
    this.invitations = new Map();
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState() {
    return { invitations: [...this.invitations.values()] };
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  async loadPending() {
    try {
      const { invitations } = await WatchPartyApi.pendingInvitations();
      this.invitations = new Map((invitations || []).map(invitation => [invitation.id, invitation]));
      this.notify();
    } catch (error) {
      console.warn('[Watch Party Invitations] Failed to load pending invitations', error);
    }
  }

  clear() {
    if (this.invitations.size === 0) return;
    this.invitations = new Map();
    this.notify();
  }

  remove(invitationId) {
    if (!this.invitations.delete(invitationId)) return;
    this.notify();
  }

  handleRealtimeMessage(message) {
    if (!message?.type) return;

    if (message.type === 'WATCH_PARTY_INVITATION') {
      this.invitations.set(message.invitation.id, message.invitation);
      this.notify();
      return;
    }

    if (message.type === 'WATCH_PARTY_INVITATION_RESOLVED') {
      this.remove(message.invitationId);
      return;
    }

    if (message.type === 'WATCH_PARTY_INVITATION_RESPONSE') {
      appStore.showToast(message.message, message.status === 'accepted' ? 'success' : 'info');
    }
  }
}

export const watchPartyInvitationStore = new WatchPartyInvitationStore();
