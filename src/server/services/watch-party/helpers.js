import { forbidden } from './errors.js';

export const PARTY_TTL_MS = 6 * 60 * 60 * 1000;
export const LOBBY_IDLE_TTL_MS = 30 * 60 * 1000;
export const ENDED_PARTY_RETENTION_MS = 5 * 60 * 1000;
export const RESUME_TTL_MS = 48 * 60 * 60 * 1000;
export const COUNTDOWN_MS = 5000;
export const READY_PRELOAD_STATES = new Set(['ready']);
export const MAX_PARTY_MEMBERS = 4;
export const READY_ROOM_STATUS = 'ready-room';

export function assertOwner(party, userId) {
  if (party.ownerUserId !== userId) {
    throw forbidden('Only the party owner can perform this action');
  }
}

export function isPartyAdmin(party, userId) {
  const member = party.members.get(userId);
  return member?.role === 'owner' || member?.role === 'admin';
}

export function assertPartyAdmin(party, userId) {
  if (!isPartyAdmin(party, userId)) {
    throw forbidden('Nur Admins können diese Aktion ausführen');
  }
}

export function assertPartyMember(party, userId) {
  const member = party.members.get(userId);
  if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');
  return member;
}

export function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getEffectivePosition(party, now = Date.now()) {
  if (party.status !== 'playing') return party.positionMs;
  return party.positionMs + Math.max(0, now - party.lastServerTimeMs);
}

// The one playback timeline every client follows: at `anchorServerTimeMs`
// the media stood at `positionMs` and, when `playing`, advances in real time
// from there. `seq` grows with every change so late packets can be dropped.
export function serializeTimeline(party) {
  return {
    positionMs: party.positionMs,
    playing: party.status === 'playing',
    anchorServerTimeMs: party.lastServerTimeMs,
    seq: party.seq || 0
  };
}

export function setTimeline(party, { positionMs, playing, anchorServerTimeMs = Date.now() }) {
  party.positionMs = Math.max(0, Number(positionMs) || 0);
  if (typeof playing === 'boolean') party.status = playing ? 'playing' : 'paused';
  party.lastServerTimeMs = anchorServerTimeMs;
  party.seq = (party.seq || 0) + 1;
  return party;
}

// Clients stamp commands with their estimate of the server time at which the
// position was read; that removes the one-way latency from the anchor. Stamps
// from the future or far past (a broken clock) fall back to the arrival time.
export function resolveAnchorTime(clientServerTimeMs, now = Date.now()) {
  const stamp = Number(clientServerTimeMs);
  if (!Number.isFinite(stamp) || stamp > now + 250 || stamp < now - 5_000) return now;
  return Math.min(stamp, now);
}

export function createItemSnapshot(playableItem, fallbackItem) {
  return {
    id: playableItem.Id,
    name: playableItem.Name || playableItem.SeriesName || fallbackItem.Name,
    type: playableItem.Type,
    seriesName: playableItem.SeriesName || null,
    productionYear: playableItem.ProductionYear || fallbackItem.ProductionYear || null,
    officialRating: playableItem.OfficialRating || fallbackItem.OfficialRating || null,
    communityRating: playableItem.CommunityRating || fallbackItem.CommunityRating || null,
    criticRating: playableItem.CriticRating || fallbackItem.CriticRating || null,
    runtimeTicks: playableItem.RunTimeTicks || fallbackItem.RunTimeTicks || null
  };
}
