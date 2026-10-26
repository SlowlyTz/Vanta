// Timings, limits and statuses of a watch party.
import { PLAYBACK_STATES as SHARED_PLAYBACK_STATES } from '../../../public/js/shared/partyStatus.js';

// A party lives as long as someone is in it. Nobody connected for this long
// (time enough to reload or get the Wi-Fi back) and it is over.
export const EMPTY_PARTY_TTL_MS = 5 * 60 * 1000;
export const ENDED_PARTY_RETENTION_MS = 5 * 60 * 1000;
export const COUNTDOWN_MS = 5000;
// Head start before the five counted seconds: covers the message's trip to
// every client and lets the countdown scene fade in, so all five digits get a
// full second everywhere.
export const COUNTDOWN_LEAD_MS = 400;
export { MAX_PARTY_MEMBERS } from '../../../public/js/shared/watchParty.js';
export const READY_ROOM_STATUS = 'ready-room';
// Loading the next episode; everyone starts together once all are ready.
export const SWITCHING_STATUS = 'switching';
export const PLAYBACK_STATES = new Set(SHARED_PLAYBACK_STATES);
