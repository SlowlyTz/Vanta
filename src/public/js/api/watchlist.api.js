// "Meine Liste" endpoints.
import { request } from './client.js';

export const WatchlistApi = {
  list: (options = {}) => request('/api/watchlist', { signal: options.signal }),
  ids: () => request('/api/watchlist/ids'),
  add: id => request(`/api/watchlist/${encodeURIComponent(id)}`, { method: 'PUT' }),
  remove: id => request(`/api/watchlist/${encodeURIComponent(id)}`, { method: 'DELETE' })
};
