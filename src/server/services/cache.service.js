export class CacheService {
  constructor(defaultTtlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key, ttlMs = this.defaultTtlMs) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}
