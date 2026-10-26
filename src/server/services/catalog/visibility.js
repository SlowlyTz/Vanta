import { jellyfinJson } from '../jellyfin/client.js';
import { ageLimitOf } from './age-limit.js';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

// What a user may see of the catalogue: `libraryIds` (null for all of them)
// and `ageLimit` (null for none, see age-limit.js). It is read from the
// user's access policy (GET /Users/{id}, which a user may ask about
// themselves), not from /Users/{id}/Views: the views follow the user's
// display settings, so libraries hidden from "My media" were missing and
// grouped libraries came back under ids no catalogue item carries (a library
// page then counted 0 titles). An admin's change in Jellyfin shows up here
// within the TTL; one made in VANTA clears the user's entry at once.
export async function getCatalogAccess(userId, token, { fetchJson = jellyfinJson, now = Date.now } = {}) {
  const cached = cache.get(userId);
  if (cached && now() - cached.timestamp < TTL_MS) return cached.access;

  let user;
  try {
    user = await fetchJson(`/Users/${userId}`, { token });
  } catch (error) {
    // A stale answer beats no answer while Jellyfin is unreachable; a refused
    // token (401/403) ends the session instead.
    if (cached && error?.status !== 401 && error?.status !== 403) return cached.access;
    throw error;
  }

  const policy = user?.Policy || {};
  const access = {
    libraryIds: policy.EnableAllFolders === false ? (policy.EnabledFolders || []).filter(Boolean) : null,
    ageLimit: ageLimitOf(policy)
  };
  cache.set(userId, { access, timestamp: now() });
  return access;
}

// Which libraries a user may see: null for all of them, otherwise their ids.
export async function getVisibleLibraryIds(userId, token, options) {
  return (await getCatalogAccess(userId, token, options)).libraryIds;
}

// One user (after a change to their account) or everyone.
export const clearVisibilityCache = (userId = null) => {
  if (userId === null) cache.clear();
  else cache.delete(userId);
};
