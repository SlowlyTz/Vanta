import { jellyfinJson, jellyfinFetch } from './client.js';

export class JellyfinAdminUsersService {
  static async listUsers(adminToken) {
    const users = await jellyfinJson('/Users', { token: adminToken });
    return Array.isArray(users) ? users : [];
  }

  static async listLibraries(adminToken) {
    const libraries = await jellyfinJson('/Library/VirtualFolders', { token: adminToken });
    return Array.isArray(libraries) ? libraries : [];
  }

  static async getUser(userId, adminToken) {
    return jellyfinJson(`/Users/${userId}`, { token: adminToken });
  }

  static async updateUserName(userId, adminToken, name) {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      const error = new Error('Name is required');
      error.status = 400;
      throw error;
    }

    const user = await this.getUser(userId, adminToken);
    const nextUser = { ...user, Name: trimmedName };

    await jellyfinFetch(`/Users/${userId}`, {
      token: adminToken,
      method: 'POST',
      body: nextUser
    });

    return nextUser;
  }

  static async deleteUser(userId, adminToken) {
    await jellyfinFetch(`/Users/${userId}`, {
      token: adminToken,
      method: 'DELETE'
    });
    return true;
  }

  static async setPassword(userId, adminToken, newPassword) {
    const password = typeof newPassword === 'string' ? newPassword : '';
    if (!password) {
      const error = new Error('New password is required');
      error.status = 400;
      throw error;
    }

    const body = { CurrentPw: '', NewPw: password };

    try {
      await jellyfinFetch('/Users/Password', {
        token: adminToken,
        method: 'POST',
        query: { userId },
        body
      });
    } catch (error) {
      if (![404, 405].includes(error.status)) throw error;

      await jellyfinFetch(`/Users/${encodeURIComponent(userId)}/Password`, {
        token: adminToken,
        method: 'POST',
        body
      });
    }

    return true;
  }

  static async updatePolicy(userId, adminToken, policyPatch) {
    const user = await this.getUser(userId, adminToken);
    const currentPolicy = user.Policy || {};
    const nextPolicy = { ...currentPolicy, ...policyPatch };

    await jellyfinFetch(`/Users/${userId}/Policy`, {
      token: adminToken,
      method: 'POST',
      body: nextPolicy
    });

    return nextPolicy;
  }
}
