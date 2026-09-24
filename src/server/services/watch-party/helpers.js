import { PLAYBACK_STATES as SHARED_PLAYBACK_STATES } from '../../../public/js/shared/partyStatus.js';
import { forbidden } from './errors.js';

export const PARTY_TTL_MS = 6 * 60 * 60 * 1000;
export const LOBBY_IDLE_TTL_MS = 30 * 60 * 1000;
export const ENDED_PARTY_RETENTION_MS = 5 * 60 * 1000;
export const RESUME_TTL_MS = 48 * 60 * 60 * 1000;
export const COUNTDOWN_MS = 5000;
// Head start before the five counted seconds: covers the message's trip to
// every client and lets the countdown scene fade in, so all five digits get a
// full second everywhere.
export const COUNTDOWN_LEAD_MS = 400;
export const READY_PRELOAD_STATES = new Set(['ready']);
export const MAX_PARTY_MEMBERS = 4;
export const READY_ROOM_STATUS = 'ready-room';
// Loading the next episode; everyone starts together once all are ready.
export const SWITCHING_STATUS = 'switching';
export const PLAYBACK_STATES = new Set(SHARED_PLAYBACK_STATES);

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
    // During the countdown the timeline already runs, anchored at the start.
    playing: party.status === 'playing' || party.status === 'countdown',
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

export const MAX_SEEK_STEP_SECONDS = 600;

// A button/key/double-tap jump in whole seconds (±10, or a quick run of
// them); anything else is not a step and is dropped.
export function sanitizeSeekStep(value) {
  const step = Number(value);
  if (!Number.isInteger(step) || step === 0 || Math.abs(step) > MAX_SEEK_STEP_SECONDS) return null;
  return step;
}

export const SYNC_CORRECTION_THRESHOLD_MS = 1_000;
export const SYNC_STABLE_MIN_MS = 10_000;

// Exactly one member reports heartbeats: the owner while connected, otherwise
// the connected admin who joined first. Everyone else only follows.
export function getSyncLeaderUserId(party) {
  const members = [...(party.members?.values?.() || [])];
  const owner = members.find(member => member.userId === party.ownerUserId);
  if (owner?.connected) return owner.userId;
  const admin = members
    .filter(member => member.role === 'admin' && member.connected)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))[0];
  return admin?.userId || null;
}

// Clients stamp commands with their estimate of the server time at which the
// position was read; that removes the one-way latency from the anchor. Stamps
// from the future or far past (a broken clock) fall back to the arrival time.
export function resolveAnchorTime(clientServerTimeMs, now = Date.now()) {
  const stamp = Number(clientServerTimeMs);
  if (!Number.isFinite(stamp) || stamp > now + 250 || stamp < now - 5_000) return now;
  return Math.min(stamp, now);
}

// The wide artwork for the lobby: the item's own backdrop, else the one it
// inherits (an episode shows its series' backdrop), else the selected item's.
function resolveBackdrop(playableItem, fallbackItem) {
  if (playableItem.BackdropImageTags?.length) return { id: playableItem.Id, tag: playableItem.BackdropImageTags[0] };
  if (playableItem.ParentBackdropItemId && playableItem.ParentBackdropImageTags?.length) {
    return { id: playableItem.ParentBackdropItemId, tag: playableItem.ParentBackdropImageTags[0] };
  }
  if (fallbackItem?.BackdropImageTags?.length) return { id: fallbackItem.Id, tag: fallbackItem.BackdropImageTags[0] };
  return null;
}

function resolveLogo(playableItem, fallbackItem) {
  if (playableItem.ImageTags?.Logo) return { id: playableItem.Id, tag: playableItem.ImageTags.Logo };
  if (playableItem.ParentLogoItemId && playableItem.ParentLogoImageTag) {
    return { id: playableItem.ParentLogoItemId, tag: playableItem.ParentLogoImageTag };
  }
  if (fallbackItem?.ImageTags?.Logo) return { id: fallbackItem.Id, tag: fallbackItem.ImageTags.Logo };
  return null;
}

export function createItemSnapshot(playableItem, fallbackItem) {
  const isEpisode = playableItem.Type === 'Episode';
  return {
    id: playableItem.Id,
    name: playableItem.Name || playableItem.SeriesName || fallbackItem.Name,
    type: playableItem.Type,
    seriesName: playableItem.SeriesName || null,
    seasonNumber: isEpisode ? playableItem.ParentIndexNumber ?? null : null,
    episodeNumber: isEpisode ? playableItem.IndexNumber ?? null : null,
    productionYear: playableItem.ProductionYear || fallbackItem.ProductionYear || null,
    officialRating: playableItem.OfficialRating || fallbackItem.OfficialRating || null,
    communityRating: playableItem.CommunityRating || fallbackItem.CommunityRating || null,
    criticRating: playableItem.CriticRating || fallbackItem.CriticRating || null,
    runtimeTicks: playableItem.RunTimeTicks || fallbackItem.RunTimeTicks || null,
    backdrop: resolveBackdrop(playableItem, fallbackItem),
    logo: resolveLogo(playableItem, fallbackItem)
  };
}
