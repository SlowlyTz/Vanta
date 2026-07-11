import crypto from 'crypto';
import { ItemsService } from './jellyfin/items.service.js';

const PARTY_TTL_MS = 6 * 60 * 60 * 1000;
const LOBBY_IDLE_TTL_MS = 30 * 60 * 1000;

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function assertOwner(party, userId) {
  if (party.ownerUserId !== userId) {
    throw forbidden('Only the party owner can perform this action');
  }
}

export class WatchPartyService {
  static parties = new Map();

  static getPartyOrThrow(partyId) {
    const party = this.parties.get(partyId);
    if (!party) throw notFound('Watch party not found');
    return party;
  }

  static async resolvePlayableItemId({ userId, accessToken, item }) {
    if (item.Type === 'Movie' || item.Type === 'Episode') {
      return item.Id;
    }

    if (item.Type === 'Series') {
      const seasons = await ItemsService.getSeasons(userId, accessToken, item.Id);
      if (!seasons?.length) throw badRequest('Keine Staffeln für diese Serie gefunden.');
      const episodes = await ItemsService.getEpisodes(userId, accessToken, item.Id, seasons[0].Id);
      if (!episodes?.length) throw badRequest('Keine Episoden in der ersten Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      return (nextEpisode || episodes[0]).Id;
    }

    if (item.Type === 'Season') {
      if (!item.SeriesId) throw badRequest('Hauptserien-ID konnte nicht ermittelt werden.');
      const episodes = await ItemsService.getEpisodes(userId, accessToken, item.SeriesId, item.Id);
      if (!episodes?.length) throw badRequest('Keine Episoden in dieser Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      return (nextEpisode || episodes[0]).Id;
    }

    throw badRequest(`Medientyp "${item.Type}" kann nicht in einer Watch Party abgespielt werden.`);
  }

  static async createParty({ userId, username, accessToken, itemId }) {
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
      itemSnapshot: {
        id: playableItem.Id,
        name: playableItem.Name || playableItem.SeriesName || item.Name,
        type: playableItem.Type,
        seriesName: playableItem.SeriesName || null,
        productionYear: playableItem.ProductionYear || null
      },
      ownerUserId: userId,
      ownerName: username,
      status: 'lobby',
      positionMs: 0,
      lastServerTimeMs: now,
      createdAt: now,
      expiresAt: now + PARTY_TTL_MS,
      members: new Map()
    };

    party.members.set(userId, {
      userId,
      username,
      role: 'owner',
      ready: true,
      connected: false,
      joinedAt: now,
      lastSeenAt: now
    });

    this.parties.set(id, party);
    return this.serializeParty(party, userId);
  }

  static joinParty({ partyId, userId, username }) {
    const party = this.getPartyOrThrow(partyId);
    const now = Date.now();

    const existing = party.members.get(userId);
    if (existing) {
      existing.lastSeenAt = now;
      existing.username = username;
    } else {
      party.members.set(userId, {
        userId,
        username,
        role: party.ownerUserId === userId ? 'owner' : 'viewer',
        ready: party.ownerUserId === userId,
        connected: false,
        joinedAt: now,
        lastSeenAt: now
      });
    }

    return this.serializeParty(party, userId);
  }

  static setReady({ partyId, userId, ready }) {
    const party = this.getPartyOrThrow(partyId);
    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.ready = Boolean(ready);
    member.lastSeenAt = Date.now();

    return this.serializeParty(party, userId);
  }

  static kickMember({ partyId, actorUserId, targetUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, actorUserId);

    if (targetUserId === party.ownerUserId) {
      throw badRequest('Der Owner kann sich nicht selbst entfernen');
    }

    if (!party.members.has(targetUserId)) {
      throw notFound('Mitglied nicht gefunden');
    }

    party.members.delete(targetUserId);
    return this.serializeParty(party, actorUserId);
  }

  static setConnected({ partyId, userId, connected }) {
    const party = this.parties.get(partyId);
    if (!party) return null;
    const member = party.members.get(userId);
    if (!member) return null;

    member.connected = connected;
    member.lastSeenAt = Date.now();
    return party;
  }

  static canStart(party) {
    return [...party.members.values()].every(member => member.ready || member.role === 'owner');
  }

  static startParty({ partyId, ownerUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    if (!this.canStart(party)) {
      const error = new Error('Not all members are ready');
      error.status = 409;
      throw error;
    }

    party.status = 'paused';
    party.positionMs = 0;
    party.lastServerTimeMs = Date.now();

    return party;
  }

  static deleteParty({ partyId, userId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, userId);
    this.parties.delete(partyId);
  }

  static cleanupExpired(now = Date.now()) {
    for (const [id, party] of this.parties) {
      const noConnections = [...party.members.values()].every(member => !member.connected);
      const lobbyExpired = noConnections && (now - party.createdAt) > LOBBY_IDLE_TTL_MS;

      if (party.expiresAt < now || lobbyExpired) {
        this.parties.delete(id);
      }
    }
  }

  static serializeParty(party, currentUserId = null) {
    const members = [...party.members.values()].map(member => ({
      userId: member.userId,
      username: member.username,
      role: member.role,
      ready: member.ready,
      connected: member.connected,
      joinedAt: member.joinedAt
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
      members,
      currentUserRole: currentUserId ? (party.members.get(currentUserId)?.role || null) : null
    };
  }
}

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
