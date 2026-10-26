// The party's shared playback timeline and the sync rules around it.

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
