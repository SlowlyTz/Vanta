// An account's access in VANTA: Jellyfin's parental control (FSK age and
// unrated titles) and VANTA's caches of what the account may see.
import { clearVisibilityCache } from './catalog/visibility.js';
import { UserDirectory } from './user-directory.service.js';
import { getImageAccess } from './images/image-access.js';

// The FSK ages an account can be limited to (Jellyfin's rating score for an
// FSK rating is the age); null is no limit.
export const AGE_LIMITS = [0, 6, 12, 16, 18];
// "Titel ohne Altersfreigabe sperren" covers what VANTA shows.
const UNRATED_KINDS = ['Movie', 'Series'];

export function ageLimitOfPolicy(policy) {
  const blocked = Array.isArray(policy.BlockUnratedItems) ? policy.BlockUnratedItems : [];
  return {
    maxAge: Number.isFinite(policy.MaxParentalRating) ? policy.MaxParentalRating : null,
    blockUnrated: UNRATED_KINDS.some(kind => blocked.includes(kind))
  };
}

// The policy change for an age limit; other kinds Jellyfin blocks stay blocked.
export function ageLimitPolicyPatch(currentPolicy, { maxAge, blockUnrated }) {
  const otherKinds = (currentPolicy?.BlockUnratedItems || []).filter(kind => !UNRATED_KINDS.includes(kind));
  return {
    MaxParentalRating: maxAge,
    MaxParentalSubRating: null,
    BlockUnratedItems: blockUnrated ? [...otherKinds, ...UNRATED_KINDS] : otherKinds
  };
}

// VANTA's caches of an account's access, dropped after a change so it shows at once.
export function invalidateUserAccess(userId) {
  clearVisibilityCache(userId);
  UserDirectory.invalidate();
  getImageAccess().clear();
}
