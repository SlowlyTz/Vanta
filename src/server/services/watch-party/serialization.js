import { serializeTimeline, getSyncLeaderUserId } from './helpers.js';

export function serializeParty(party, currentUserId = null) {
  const members = [...party.members.values()].map(member => ({
    userId: member.userId,
    username: member.username,
    role: member.role,
    ready: member.ready,
    connected: member.connected,
    joinedAt: member.joinedAt,
    preloadState: member.preloadState || 'waiting',
    preloadMessage: member.preloadMessage || '',
    preloadProgress: Number(member.preloadProgress) || 0
  }));

  return {
    id: party.id,
    itemId: party.itemId,
    playableItemId: party.playableItemId,
    itemSnapshot: party.itemSnapshot,
    ownerUserId: party.ownerUserId,
    ownerName: party.ownerName,
    status: party.status,
    positionMs: party.positionMs,
    lastServerTimeMs: party.lastServerTimeMs,
    createdAt: party.createdAt,
    expiresAt: party.expiresAt,
    endedAt: party.endedAt,
    endedByUserId: party.endedByUserId,
    resumeExpiresAt: party.resumeExpiresAt,
    finalPositionMs: party.finalPositionMs,
    resumeFrom: party.resumeFrom || null,
    timeline: serializeTimeline(party),
    syncLeaderUserId: getSyncLeaderUserId(party),
    members,
    currentUserRole: currentUserId ? (party.members.get(currentUserId)?.role || null) : null
  };
}
