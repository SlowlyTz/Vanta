import { jellyfinJson } from './client.js';

export class AuthService {
  static async login(username, password) {
    return jellyfinJson('/Users/AuthenticateByName', {
      method: 'POST',
      body: {
        Username: username,
        Pw: password
      }
    });
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
