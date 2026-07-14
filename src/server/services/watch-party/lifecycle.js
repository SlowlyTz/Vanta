import crypto from 'crypto';
import { ItemsService } from '../jellyfin/items.service.js';
import { notFound, forbidden, badRequest, conflict } from './errors.js';
import { PARTY_TTL_MS, LOBBY_IDLE_TTL_MS, ENDED_PARTY_RETENTION_MS, RESUME_TTL_MS, MAX_PARTY_MEMBERS, assertOwner, getEffectivePosition, createItemSnapshot } from './helpers.js';

export const lifecycleMethods = {
  getPartyOrThrow(partyId) {
    const party = this.parties.get(partyId);
    if (!party) throw notFound('Watch party not found');
    return party;
  },

  async createParty({ userId, username, accessToken, itemId }) {
    const item = await ItemsService.getItemDetails(userId, accessToken, itemId);
    const playableItemId = await this.resolvePlayableItemId({ userId, accessToken, item });
    const playableItem = playableItemId === item.Id
      ? item
      : await ItemsService.getItemDetails(userId, accessToken, playableItemId);

    const id = crypto.randomUUID();
    const now = Date.now();

    const party = {
      id,
      itemId: item.Id,
      playableItemId,
      itemSnapshot: createItemSnapshot(playableItem, item),
      ownerUserId: userId,
      ownerName: username,
      status: 'lobby',
      positionMs: 0,
      lastServerTimeMs: now,
      createdAt: now,
      expiresAt: now + PARTY_TTL_MS,
      endedAt: null,
      endedByUserId: null,
      resumeExpiresAt: null,
      finalPositionMs: 0,
      resumeFrom: null,
      members: new Map(),
      bannedUserIds: new Set()
    };

    party.members.set(userId, {
      userId,
      username,
      role: 'owner',
      ready: false,
      connected: false,
      hasConnectedOnce: false,
      joinedAt: now,
      lastSeenAt: now,
      preloadState: 'waiting',
      preloadMessage: ''
    });

    this.parties.set(id, party);
    return this.serializeParty(party, userId);
  },

  async joinParty({ partyId, userId, username, accessToken }) {
    const party = this.getPartyOrThrow(partyId);

    if (party.bannedUserIds?.has(userId)) {
      throw forbidden('Du wurdest aus dieser Watch Party ausgeschlossen.');
    }

    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet');

    await this.assertCanAccessItem({ userId, accessToken, itemId: party.playableItemId });

    const now = Date.now();
    const existing = party.members.get(userId);
    if (existing) {
      existing.lastSeenAt = now;
      existing.username = username;
    } else {
      if (party.members.size >= MAX_PARTY_MEMBERS) {
        throw conflict('Diese Watch Party ist voll.');
      }
      party.members.set(userId, {
        userId,
        username,
        role: party.ownerUserId === userId ? 'owner' : 'viewer',
        ready: false,
        connected: false,
        hasConnectedOnce: false,
        joinedAt: now,
        lastSeenAt: now,
        preloadState: 'waiting',
        preloadMessage: ''
      });
    }

    return this.serializeParty(party, userId);
  },

  storeEndedSnapshot(party) {
    this.endedPartiesByOwner.set(party.ownerUserId, {
      originalPartyId: party.id,
      ownerUserId: party.ownerUserId,
      itemId: party.itemId,
      playableItemId: party.playableItemId,
      itemSnapshot: party.itemSnapshot,
      finalPositionMs: party.finalPositionMs,
      endedAt: party.endedAt,
      resumeExpiresAt: party.resumeExpiresAt
    });
  },

  endParty({ partyId, ownerUserId, positionMs = null, reason = 'owner-ended' }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    const now = Date.now();
    const finalPositionMs = Number.isFinite(positionMs) ? positionMs : getEffectivePosition(party, now);

    party.status = 'ended';
    party.finalPositionMs = finalPositionMs;
    party.endedAt = now;
    party.endedByUserId = ownerUserId;
    party.resumeExpiresAt = now + RESUME_TTL_MS;
    party.endReason = reason;

    this.storeEndedSnapshot(party);
    return this.serializeParty(party, ownerUserId);
  },

  getResumableForOwner(userId) {
    const snapshot = this.endedPartiesByOwner.get(userId);
    if (!snapshot) return null;
    if (snapshot.resumeExpiresAt < Date.now()) {
      this.endedPartiesByOwner.delete(userId);
      return null;
    }
    return snapshot;
  },

  resumeEndedParty({ userId, username, originalPartyId }) {
    const snapshot = this.getResumableForOwner(userId);
    if (!snapshot || snapshot.originalPartyId !== originalPartyId) {
      throw notFound('Keine fortsetzbare Watch Party gefunden');
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    const party = {
      id,
      itemId: snapshot.itemId,
      playableItemId: snapshot.playableItemId,
      itemSnapshot: snapshot.itemSnapshot,
      ownerUserId: userId,
      ownerName: username,
      status: 'lobby',
      positionMs: snapshot.finalPositionMs,
      lastServerTimeMs: now,
      createdAt: now,
      expiresAt: now + PARTY_TTL_MS,
      endedAt: null,
      endedByUserId: null,
      resumeExpiresAt: null,
      finalPositionMs: 0,
      resumeFrom: {
        originalPartyId,
        positionMs: snapshot.finalPositionMs
      },
      members: new Map(),
      bannedUserIds: new Set()
    };

    party.members.set(userId, {
      userId,
      username,
      role: 'owner',
      ready: false,
      connected: false,
      hasConnectedOnce: false,
      joinedAt: now,
      lastSeenAt: now,
      preloadState: 'waiting',
      preloadMessage: ''
    });

    this.endedPartiesByOwner.delete(userId);
    this.parties.set(id, party);
    return this.serializeParty(party, userId);
  },

  cleanupExpired(now = Date.now()) {
    for (const [id, party] of this.parties) {
      const noConnections = [...party.members.values()].every(member => !member.connected);
      const lobbyExpired = noConnections && (now - party.createdAt) > LOBBY_IDLE_TTL_MS;
      const endedExpired = party.status === 'ended' && party.endedAt && (now - party.endedAt) > ENDED_PARTY_RETENTION_MS;

      if (party.expiresAt < now || lobbyExpired || endedExpired) {
        this.parties.delete(id);
      }
    }

    for (const [ownerId, snapshot] of this.endedPartiesByOwner) {
      if (snapshot.resumeExpiresAt < now) this.endedPartiesByOwner.delete(ownerId);
    }
  }
};
