import { jellyfinJson } from '../jellyfin/client.js';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

// Which libraries a user may see: null for all of them, otherwise their ids.
// It is read from the user's access policy (GET /Users/{id}, which a user may
// ask about themselves), not from /Users/{id}/Views: the views follow the
// user's display settings, so libraries hidden from "My media" were missing
// and grouped libraries came back under ids no catalogue item carries (a
// library page then counted 0 titles). An admin's change to a user's access
// shows up here within the TTL.
export async function getVisibleLibraryIds(userId, token, { fetchJson = jellyfinJson, now = Date.now } = {}) {
  const cached = cache.get(userId);
  if (cached && now() - cached.timestamp < TTL_MS) return cached.ids;

  let user;
  try {
    user = await fetchJson(`/Users/${userId}`, { token });
  } catch (error) {
    // A stale answer beats no answer: the catalogue can still be served while
    // Jellyfin is unreachable, just with the last known library access.
    if (cached) return cached.ids;
    throw error;
  }

  const policy = user?.Policy || {};
  const ids = policy.EnableAllFolders === false
    ? (policy.EnabledFolders || []).filter(Boolean)
    : null;
  cache.set(userId, { ids, timestamp: now() });
  return ids;
}

export const clearVisibilityCache = () => cache.clear();
