// Per-user catalogue access (visible libraries and age limit), cached from the Jellyfin policy.
import { jellyfinJson } from '../jellyfin/client.js';
import { ageLimitOf } from './age-limit.js';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

// `libraryIds` (null = all) and `ageLimit` (null = none) come from the user's policy, not
// /Users/{id}/Views, whose display settings hide libraries and regroup them under unknown ids.
// Jellyfin-side changes show up within the TTL; changes made in VANTA clear the entry at once.
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

// One user (after a change to their account) or everyone.
export const clearVisibilityCache = (userId = null) => {
  if (userId === null) cache.clear();
  else cache.delete(userId);
};
