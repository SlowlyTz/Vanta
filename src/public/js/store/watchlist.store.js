import { WatchlistApi } from '../api/watchlist.api.js';
import { Store } from './store.js';

// Which titles are on "Meine Liste", so a card, the detail button and the
// context menu show the right state at once. Loaded on login; changes are
// applied optimistically and put back when the server refuses them.
class WatchlistStore extends Store {
  constructor() {
    super();
    this.ids = new Set();
    this.loading = null;
    this.loaded = false;
  }

  // Whether the list came from the server (before that, "not on it" means nothing).
  isLoaded() {
    return this.loaded;
  }

  getState() {
    return { ids: new Set(this.ids) };
  }

  has(id) {
    return this.ids.has(id);
  }

  load() {
    if (this.loading) return this.loading;
    this.loading = WatchlistApi.ids()
      .then(({ ids }) => {
        this.ids = new Set(ids || []);
        this.loaded = true;
        this.notify();
      })
      .catch(() => {})
      .finally(() => { this.loading = null; });
    return this.loading;
  }

  async add(id) {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    this.notify();
    try {
      await WatchlistApi.add(id);
    } catch (error) {
      this.ids.delete(id);
      this.notify();
      throw error;
    }
  }

  async remove(id) {
    if (!this.ids.has(id)) return;
    this.ids.delete(id);
    this.notify();
    try {
      await WatchlistApi.remove(id);
    } catch (error) {
      this.ids.add(id);
      this.notify();
      throw error;
    }
  }

  // Returns whether the title is on the list afterwards.
  async toggle(id) {
    if (this.ids.has(id)) {
      await this.remove(id);
      return false;
    }
    await this.add(id);
    return true;
  }

  clear() {
    this.ids = new Set();
    this.loaded = false;
    this.notify();
  }
}

export const watchlistStore = new WatchlistStore();
