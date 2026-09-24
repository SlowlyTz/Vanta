// Node 25+ ships its own global localStorage/sessionStorage, which is
// undefined without --localstorage-file and hides jsdom's. Tests then get an
// in-memory Storage instead, fresh for every test file.
class MemoryStorage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(index) { return [...this.#items.keys()][index] ?? null; }
  getItem(key) { return this.#items.has(String(key)) ? this.#items.get(String(key)) : null; }
  setItem(key, value) { this.#items.set(String(key), String(value)); }
  removeItem(key) { this.#items.delete(String(key)); }
  clear() { this.#items.clear(); }
}

const usable = name => {
  try {
    return typeof globalThis[name]?.getItem === 'function';
  } catch {
    return false;
  }
};

for (const name of ['localStorage', 'sessionStorage']) {
  if (usable(name)) continue;
  const storage = new MemoryStorage();
  for (const target of new Set([globalThis, globalThis.window].filter(Boolean))) {
    Object.defineProperty(target, name, { configurable: true, get: () => storage });
  }
}
