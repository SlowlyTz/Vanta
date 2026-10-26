// Auth endpoints: login, logout, current user, password and TV pairing by phone.
import { request } from './client.js';

export const AuthApi = {
  login(username, password, rememberMe = false) {
    return request('/api/auth/login', {
      method: 'POST',
      body: { username, password, rememberMe: rememberMe === true }
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

  // TV: a code to sign in with a phone ({ code, expiresAt, url, qrSvg }),
  // then asked for until the phone confirmed ({ state, user }).
  startPairing() {
    return request('/api/auth/pairing', { method: 'POST' });
  },

  pairingStatus() {
    return request('/api/auth/pairing/status');
  },

  // Phone: which device waits behind a code, and confirming it.
  pairingInfo(code) {
    return request(`/api/auth/pairing/info?code=${encodeURIComponent(code)}`);
  },

  confirmPairing(code) {
    return request('/api/auth/pairing/confirm', { method: 'POST', body: { code } });
  },

  changePassword(currentPassword, newPassword) {
    return request('/api/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }
};
