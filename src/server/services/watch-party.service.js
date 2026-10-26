// The in-memory watch parties: WatchPartyService assembled from the
// watch-party/ modules, plus the periodic cleanup started from main.js.
import { suggestionMethods } from './watch-party/suggestions.js';
import { lifecycleMethods } from './watch-party/lifecycle.js';
import { memberMethods } from './watch-party/members.js';
import { playbackMethods } from './watch-party/playback.js';
import { recentPartyMethods } from './watch-party/recent.js';
import { serializeParty, serializePresence } from './watch-party/serialization.js';
import { isPartyAdmin } from './watch-party/permissions.js';
import { MAX_PARTY_MEMBERS } from './watch-party/constants.js';

export { isPartyAdmin, MAX_PARTY_MEMBERS };

export class WatchPartyService {
  static parties = new Map();
  static recentPartiesByUser = new Map(); // userId -> Map<partyId, lastSeenAt>
}

Object.assign(
  WatchPartyService,
  suggestionMethods,
  lifecycleMethods,
  memberMethods,
  playbackMethods,
  recentPartyMethods,
  { serializeParty, serializePresence }
);

let cleanupInterval = null;

// `onRemoved(partyId)`: the socket hub drops what it kept for the party.
export function startWatchPartyCleanup({ intervalMs = 60_000, onRemoved = () => {} } = {}) {
  if (cleanupInterval) return cleanupInterval;
  cleanupInterval = setInterval(() => {
    WatchPartyService.cleanupExpired().forEach(partyId => onRemoved(partyId));
    // Answered and expired invitations go as well. Loaded here: the
    // invitation service imports this module.
    import('./watch-party-invitation.service.js')
      .then(module => module.WatchPartyInvitationService.cleanupExpired())
      .catch(() => {});
  }, intervalMs);
  cleanupInterval.unref?.();
  return cleanupInterval;
}

