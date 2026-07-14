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
  return party.positionMs + (now - party.lastServerTimeMs);
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
