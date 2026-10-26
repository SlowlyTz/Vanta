// The last searches on this device, newest first, each once.
const KEY = 'vanta.search.recent';
export const MAX_RECENT_SEARCHES = 10;

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter(entry => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode: nothing is kept.
  }
};

export const recentSearches = {
  list: read,
  add(query) {
    const text = String(query || '').trim();
    if (!text) return read();
    const list = [text, ...read().filter(entry => entry.toLowerCase() !== text.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
    write(list);
    return list;
  },
  remove(query) {
    const list = read().filter(entry => entry !== query);
    write(list);
    return list;
  },
  clear() {
    write([]);
    return [];
  }
};
