import { request } from './client.js';

export const AdminUsersApi = {
  listUsers() {
    return request('/api/admin/users');
  },

  listLibraries() {
    return request('/api/admin/users/libraries');
  },

  renameUser(userId, name) {
    return request(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: { name }
    });
  },

  setPassword(userId, newPassword) {
    return request(`/api/admin/users/${userId}/password`, {
      method: 'POST',
      body: { newPassword }
    });
  },

  deleteUser(userId) {
    return request(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  banUser(userId, reason, username = null) {
    return request(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: { reason, username }
    });
  },

  unbanUser(userId) {
    return request(`/api/admin/users/${userId}/ban`, {
      method: 'DELETE'
    });
  },

  setLibraryAccess(userId, enableAllFolders, enabledFolders = []) {
    return request(`/api/admin/users/${userId}/libraries`, {
      method: 'PATCH',
      body: { enableAllFolders, enabledFolders }
    });
  },

  setStreamLimit(userId, maxConcurrentStreams) {
    return request(`/api/admin/users/${userId}/stream-limit`, {
      method: 'PATCH',
      body: { maxConcurrentStreams }
    });
  }
};
