// The signed-in user's settings that follow them to every device (see
// shared/preferences.js). Loaded on login, changed optimistically.
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

class PreferencesStore extends Store {
  constructor() {
    super();
    this.values = readCache();
    // What the server last confirmed; a failed save falls back to it.
    this.confirmed = this.values;
    // Key -> number of the newest update still waiting for the server.
    this.pending = new Map();
    this.seq = 0;
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
    const generation = this.generation;
    this.loading = PreferencesApi.get()
      .then(values => { if (this.isCurrent(generation)) this.apply(values); })
      .catch(() => {})
      .finally(() => { if (this.isCurrent(generation)) this.loading = null; });
    return this.loading;
  }

  // Values from the server. Keys with a save still on its way keep what
  // the user just chose.
  apply(values) {
    this.confirmed = withDefaults(values);
    const shown = { ...this.confirmed };
    for (const key of this.pending.keys()) shown[key] = this.values[key];
    this.show(shown);
  }

  show(values) {
    this.values = withDefaults(values);
    writeCache(this.values);
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('reduce-motion', this.values.reducedMotion === true);
    this.notify();
  }

  // Shows the change at once; a refused save puts back the confirmed values
  // of its own keys (unless a newer change of them is on its way) and
  // rethrows, so the caller can say so.
  async update(patch) {
    const clean = sanitizePreferences(patch);
    const seq = ++this.seq;
    const keys = Object.keys(clean);
    const settle = () => keys.filter(key => this.pending.get(key) === seq).map(key => {
      this.pending.delete(key);
      return key;
    });
    keys.forEach(key => this.pending.set(key, seq));
    this.show({ ...this.values, ...clean });
    let answer;
    try {
      answer = await PreferencesApi.update(clean);
    } catch (error) {
      const restore = {};
      for (const key of settle()) restore[key] = this.confirmed[key];
      this.show({ ...this.values, ...restore });
      throw error;
    }
    settle();
    this.apply(answer);
    return this.getState();
  }

  clear() {
    this.nextGeneration();
    this.values = { ...DEFAULT_PREFERENCES };
    this.confirmed = this.values;
    this.pending.clear();
    try { localStorage.removeItem(CACHE_KEY); } catch { /* nothing kept */ }
    if (typeof document !== 'undefined') document.documentElement.classList.remove('reduce-motion');
    this.notify();
  }
}

export const preferencesStore = new PreferencesStore();
