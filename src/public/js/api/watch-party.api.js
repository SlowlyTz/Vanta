import { request } from './client.js';

export const WatchPartyApi = {
  create(itemId) {
    return request('/api/watch-parties', {
      method: 'POST',
      body: { itemId }
    });
  },

  get(partyId) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}`);
  },

  join(partyId) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/join`, {
      method: 'POST'
    });
  },

  setReady(partyId, ready) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/ready`, {
      method: 'POST',
      body: { ready }
    });
  },

  kick(partyId, userId) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/kick`, {
      method: 'POST',
      body: { userId }
    });
  },

  end(partyId, positionMs) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/end`, {
      method: 'POST',
      body: { positionMs }
    });
  },

  suggestions(limit = 18) {
    return request(`/api/watch-parties/suggestions?limit=${limit}`);
  },

  resumable() {
    return request('/api/watch-parties/resumable');
  },

  resume(originalPartyId) {
    return request('/api/watch-parties/resume', {
      method: 'POST',
      body: { originalPartyId }
    });
  },

  resolveInviteUser(partyId, username) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/invitations/resolve-user`, {
      method: 'POST',
      body: { username }
    });
  },

  sendInvitation(partyId, username) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}/invitations`, {
      method: 'POST',
      body: { username }
    });
  },

  pendingInvitations() {
    return request('/api/watch-party-invitations/pending');
  },

  acceptInvitation(invitationId) {
    return request(`/api/watch-party-invitations/${encodeURIComponent(invitationId)}/accept`, {
      method: 'POST'
    });
  },

  declineInvitation(invitationId) {
    return request(`/api/watch-party-invitations/${encodeURIComponent(invitationId)}/decline`, {
      method: 'POST'
    });
  }
};
