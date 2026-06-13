import { request } from './client.js';

export const AuthApi = {
  login(username, password) {
    return request('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  },

  logout() {
    return request('/api/auth/logout', {
      method: 'POST'
    });
  },

  getCurrentUser() {
    return request('/api/auth/me', {
      method: 'GET'
    });
  },

  changePassword(currentPassword, newPassword) {
    return request('/api/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }
};
