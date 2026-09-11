import { jellyfinJson } from '../jellyfin/client.js';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

// Which libraries a user may see. Jellyfin answers that through /Users/{id}/Views,
// which already applies the user's folder policy — so an admin's change to a
// user's access shows up here within the TTL without any extra bookkeeping.
export async function getVisibleLibraryIds(userId, token, { fetchJson = jellyfinJson, now = Date.now } = {}) {
  const cached = cache.get(userId);
  if (cached && now() - cached.timestamp < TTL_MS) return cached.ids;

  let data;
  try {
    data = await fetchJson(`/Users/${userId}/Views`, { token });
  } catch (error) {
    // A stale answer beats no answer: the catalogue can still be served while
    // Jellyfin is unreachable, just with the last known library access.
    if (cached) return cached.ids;
    throw error;
  }

  const ids = (data.Items || []).map(view => view.Id).filter(Boolean);
  cache.set(userId, { ids, timestamp: now() });
  return ids;
}

export const clearVisibilityCache = () => cache.clear();
