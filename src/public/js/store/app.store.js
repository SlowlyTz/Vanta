class AppStore {
  constructor() {
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
      loading: this.loading
    };
  }

  setLoading(isLoading) {
    this.loading = isLoading;
    const loaderEl = document.getElementById('global-loader');
    if (loaderEl) {
      if (isLoading) {
        loaderEl.classList.remove('hidden');
      } else {
        loaderEl.classList.add('hidden');
      }
    }
    this.notify();
  }

  async showToast(message, type = 'info') {
    const { Toast } = await import('../components/toast.js');
    Toast.show(message, type);
  }
}

export const appStore = new AppStore();
