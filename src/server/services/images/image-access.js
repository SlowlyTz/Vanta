import { getActiveCatalogReader } from '../catalog/reader.js';
import { getCatalogAccess } from '../catalog/visibility.js';
import { withinAgeLimit } from '../catalog/age-limit.js';
import { jellyfinRawFetch } from '../jellyfin/client.js';

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 20000;

// Whether a user may see an item's images. The rendition cache is shared by
// everyone, so without this a user could load posters of libraries (or age
// ratings) they have no access to. Movies and series are answered from the
// catalogue, the user's libraries and age limit; anything else (seasons, episodes, people) is asked of
// Jellyfin with the user's own token once and remembered for a while.
// Only a clear "no" from Jellyfin denies: a Jellyfin that cannot be reached
// must not turn every picture into a placeholder.
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
      log.warn?.(`[Bilder] Zugriff auf ${itemId} nicht prüfbar: ${error.message}`);
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
