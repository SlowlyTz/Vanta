import { AuthApi } from '../api/auth.api.js';
import { Store } from './store.js';

class AuthStore extends Store {
  constructor() {
    super({ emitOnSubscribe: false });
    this.user = null;
    this.loading = false;

    window.addEventListener('vanta:auth-unauthorized', () => {
      this.clearSession();
    });
  }

  getState() {
    return {
      user: this.user,
      isAuthenticated: !!this.user,
      loading: this.loading
    };
  }

  async login(username, password, rememberMe = false) {
    this.loading = true;
    this.notify();
    try {
      const data = await AuthApi.login(username, password, rememberMe);
      this.user = data.user;
      this.notify();
      return data.user;
    } catch (error) {
      this.user = null;
      this.notify();
      throw error;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async logout() {
    try {
      await AuthApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
      this.notify();
      window.location.hash = '#/login';
    }
  }

  clearSession() {
    const changed = this.user !== null || this.loading;
    this.user = null;
    this.loading = false;

    if (changed) {
      this.notify();
    }
  }

  async changePassword(currentPassword, newPassword) {
    await AuthApi.changePassword(currentPassword, newPassword);
    return true;
  }

  async checkAuth() {
    this.loading = true;
    this.notify();
    try {
      const data = await AuthApi.getCurrentUser();
      this.user = data.user;
      this.notify();
      return true;
    } catch (error) {
      this.user = null;
      this.notify();
      return false;
    } finally {
      this.loading = false;
      this.notify();
    }
  }
}

export const authStore = new AuthStore();
