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

  end(partyId) {
    return request(`/api/watch-parties/${encodeURIComponent(partyId)}`, {
      method: 'DELETE'
    });
  }
};
