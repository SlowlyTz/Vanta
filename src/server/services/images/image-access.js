// Per-user check whether an item's images may be served from the shared rendition cache.
import { getActiveCatalogReader } from '../catalog/reader.js';
import { getCatalogAccess } from '../catalog/visibility.js';
import { withinAgeLimit } from '../catalog/age-limit.js';
import { jellyfinRawFetch } from '../jellyfin/client.js';

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 20000;

// Movies and series are checked against the catalogue; anything else is asked of Jellyfin with
// the user's token and remembered. Only a clear "no" denies, so an unreachable Jellyfin does not
// turn every picture into a placeholder.
export function createImageAccess({
  getReader = getActiveCatalogReader,
  catalogAccess = getCatalogAccess,
  fetchItem = (userId, token, itemId) => jellyfinRawFetch(`/Users/${userId}/Items/${itemId}`, { token, timeoutMs: 10 * 1000 }),
  ttlMs = TTL_MS,
  maxEntries = MAX_ENTRIES,
  now = () => Date.now(),
  log = console
} = {}) {
  const answers = new Map(); // `${userId}:${itemId}` -> { allowed, at }

  const remember = (key, allowed) => {
    if (answers.size >= maxEntries) answers.delete(answers.keys().next().value);
    answers.set(key, { allowed, at: now() });
    return allowed;
  };

  const askJellyfin = async (userId, token, itemId) => {
    const key = `${userId}:${itemId}`;
    const cached = answers.get(key);
    if (cached && now() - cached.at < ttlMs) return cached.allowed;

    try {
      const response = await fetchItem(userId, token, itemId);
      if (response.ok) return remember(key, true);
      if ([400, 403, 404].includes(response.status)) return remember(key, false);
      return true;
    } catch (error) {
      log.warn?.(`[Images] access to ${itemId} could not be checked: ${error.message}`);
      return true;
    }
  };

  return {
    async canSee({ userId, token, itemId }) {
      if (!userId || !itemId) return false;

      const item = getReader()?.accessOf?.(itemId);
      if (item?.libraryId) {
        try {
          const { libraryIds, ageLimit } = await catalogAccess(userId, token);
          return (libraryIds === null || libraryIds.includes(item.libraryId)) && withinAgeLimit(ageLimit, item);
        } catch {
          // No library list (Jellyfin down, nothing cached): ask per item.
        }
      }
      return askJellyfin(userId, token, itemId);
    },

    clear: () => answers.clear()
  };
}

let instance = null;

export function getImageAccess() {
  if (!instance) instance = createImageAccess();
  return instance;
}
