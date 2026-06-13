import { AuthApi } from '../api/auth.api.js';

class AuthStore {
  constructor() {
    this.user = null;
    this.loading = false;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getState() {
    return {
      user: this.user,
      isAuthenticated: !!this.user,
      loading: this.loading
    };
  }

  async login(username, password) {
    this.loading = true;
    this.notify();
    try {
      const data = await AuthApi.login(username, password);
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
