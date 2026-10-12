import { PreferencesApi } from '../api/preferences.api.js';
import { DEFAULT_PREFERENCES, sanitizePreferences, withDefaults } from '../shared/preferences.js';
import { Store } from './store.js';

// The last answer is kept on the device, so the first page after a start
// already uses the user's settings while the server is still being asked.
const CACHE_KEY = 'vanta.preferences';

const readCache = () => {
  try {
    return withDefaults(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
};

const writeCache = (values) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(values));
  } catch {
    // Private mode or full storage: the server still has them.
  }
};

// The signed-in user's settings that follow them to every device (see
// shared/preferences.js). Loaded on login, changed optimistically.
class PreferencesStore extends Store {
  constructor() {
    super();
    this.values = readCache();
    this.loading = null;
  }

  getState() {
    return { ...this.values };
  }

  get(key) {
    return this.values[key];
  }

  load() {
    if (this.loading) return this.loading;
    this.loading = PreferencesApi.get()
      .then(values => this.apply(values))
      .catch(() => {})
      .finally(() => { this.loading = null; });
    return this.loading;
  }

  apply(values) {
    this.values = withDefaults(values);
    writeCache(this.values);
    this.notify();
  }

  // Shows the change at once; a refused save puts the old values back and
  // rethrows, so the caller can say so.
  async update(patch) {
    const clean = sanitizePreferences(patch);
    const previous = this.values;
    this.apply({ ...this.values, ...clean });
    try {
      this.apply(await PreferencesApi.update(clean));
    } catch (error) {
      this.apply(previous);
      throw error;
    }
    return this.getState();
  }

  clear() {
    this.values = { ...DEFAULT_PREFERENCES };
    try { localStorage.removeItem(CACHE_KEY); } catch { /* nothing kept */ }
    this.notify();
  }
}

export const preferencesStore = new PreferencesStore();
