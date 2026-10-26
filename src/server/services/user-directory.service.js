// Every Jellyfin user with admin flag, visible libraries (null = all) and
// parental limit, read with the server API key and cached ten minutes.
import env from '../config/env.js';
import { jellyfinJson } from './jellyfin/client.js';

const TTL_MS = 10 * 60 * 1000;

// Jellyfin's parental limit as an age: its rating scores for the German
// FSK ratings are the age itself; null means no limit.
const maxAgeOf = (policy) => (Number.isFinite(policy?.MaxParentalRating) ? policy.MaxParentalRating : null);

// `all` leaves disabled users out; `allIds` names every account that still exists.
export function createUserDirectory({ fetchJson = jellyfinJson, apiKey = env.JELLYFIN_API_KEY, now = () => Date.now() } = {}) {
  let cached = null;

  // `fresh`: past the cache, for decisions that delete data (housekeeping);
  // a user created within the last ten minutes is not yet in the cache.
  const load = async ({ fresh = false } = {}) => {
    if (!fresh && cached && now() - cached.at < TTL_MS) return cached.users;
    const users = (await fetchJson('/Users', { token: apiKey }) || []).map(user => ({
      id: user.Id,
      name: user.Name,
      isAdmin: user.Policy?.IsAdministrator === true,
      disabled: user.Policy?.IsDisabled === true,
      libraryIds: user.Policy?.EnableAllFolders === false ? (user.Policy.EnabledFolders || []) : null,
      maxAge: maxAgeOf(user.Policy),
      blockUnrated: Array.isArray(user.Policy?.BlockUnratedItems) ? user.Policy.BlockUnratedItems : []
    })).filter(user => user.id);
    cached = { at: now(), users };
    return users;
  };

  const enabled = async () => (await load()).filter(user => !user.disabled);

  return {
    all: enabled,
    admins: async () => (await enabled()).filter(user => user.isAdmin),
    allIds: async ({ fresh = false } = {}) => new Set((await load({ fresh })).map(user => user.id)),
    // After a change to an account (age limit), the next read asks Jellyfin.
    invalidate: () => { cached = null; }
  };
}

export const UserDirectory = createUserDirectory();
