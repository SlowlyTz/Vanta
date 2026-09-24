import { publicApiMethods } from './watch-party/publicApi.js';
import { lifecycleMethods } from './watch-party/lifecycle.js';
import { memberMethods } from './watch-party/members.js';
import { playbackMethods } from './watch-party/playback.js';
import { recentPartyMethods } from './watch-party/recent.js';
import { serializeParty, serializePresence } from './watch-party/serialization.js';
import { isPartyAdmin, MAX_PARTY_MEMBERS } from './watch-party/helpers.js';

export { isPartyAdmin, MAX_PARTY_MEMBERS };

export class WatchPartyService {
  static parties = new Map();
  static endedPartiesByOwner = new Map(); // ownerUserId -> resumable snapshot
  static recentPartiesByUser = new Map(); // userId -> Map<partyId, lastSeenAt>
}

Object.assign(
  WatchPartyService,
  publicApiMethods,
  lifecycleMethods,
  memberMethods,
  playbackMethods,
  recentPartyMethods,
  { serializeParty, serializePresence }
);

let cleanupInterval = null;

export function startWatchPartyCleanup(intervalMs = 60_000) {
  if (cleanupInterval) return cleanupInterval;
  cleanupInterval = setInterval(() => WatchPartyService.cleanupExpired(), intervalMs);
  cleanupInterval.unref?.();
  return cleanupInterval;
}

export function stopWatchPartyCleanup() {
  if (!cleanupInterval) return;
  clearInterval(cleanupInterval);
  cleanupInterval = null;
}
