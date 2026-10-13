import { jellyfinFetch, jellyfinJson } from './client.js';

export class AuthService {
  static async login(username, password, { deviceId } = {}) {
    return jellyfinJson('/Users/AuthenticateByName', {
      method: 'POST',
      deviceId,
      body: {
        Username: username,
        Pw: password
      }
    });
  }

  // Quick Connect (Jellyfin's sign-in by code): a device asks for a code,
  // a signed-in user approves it, the device then signs in without a password.
  static async quickConnectInitiate(deviceId) {
    return jellyfinJson('/QuickConnect/Initiate', { method: 'POST', deviceId });
  }

  static async quickConnectAuthorize(code, { token, userId }) {
    return jellyfinJson('/QuickConnect/Authorize', { method: 'POST', token, query: { code, userId } });
  }

  static async quickConnectLogin(secret, { deviceId }) {
    return jellyfinJson('/Users/AuthenticateWithQuickConnect', { method: 'POST', deviceId, body: { Secret: secret } });
  }

  // Ends the Jellyfin session behind a token, so it is useless afterwards.
  static async logout(token) {
    await jellyfinFetch('/Sessions/Logout', { token, method: 'POST' });
  }

  static async getCurrentUser(userId, token) {
    return jellyfinJson(`/Users/${userId}`, { token });
  }

  static isAdministrator(user) {
    return Boolean(user?.Policy?.IsAdministrator);
  }

  static async isUserAdmin(userId, token) {
    const user = await this.getCurrentUser(userId, token);
    return this.isAdministrator(user);
  }

  static async changePassword(userId, token, currentPassword, newPassword) {
    await jellyfinJson(`/Users/${userId}/Password`, {
      token,
      method: 'POST',
      body: {
        CurrentPw: currentPassword,
        NewPw: newPassword
      }
    });
    return true;
  }
}
