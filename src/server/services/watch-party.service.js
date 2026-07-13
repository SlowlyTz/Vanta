import crypto from 'crypto';
import { ItemsService } from './jellyfin/items.service.js';
import { LibraryService } from './jellyfin/library.service.js';

const PARTY_TTL_MS = 6 * 60 * 60 * 1000;
const LOBBY_IDLE_TTL_MS = 30 * 60 * 1000;
const ENDED_PARTY_RETENTION_MS = 5 * 60 * 1000;
const RESUME_TTL_MS = 48 * 60 * 60 * 1000;
const COUNTDOWN_MS = 5000;
const READY_PRELOAD_STATES = new Set(['ready']);
export const MAX_PARTY_MEMBERS = 4;
const READY_ROOM_STATUS = 'ready-room';

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

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function assertOwner(party, userId) {
  if (party.ownerUserId !== userId) {
    throw forbidden('Only the party owner can perform this action');
  }
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getEffectivePosition(party, now = Date.now()) {
  if (party.status !== 'playing') return party.positionMs;
  return party.positionMs + (now - party.lastServerTimeMs);
}

function createItemSnapshot(playableItem, fallbackItem) {
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

export class WatchPartyService {
  static parties = new Map();
  static endedPartiesByOwner = new Map(); // ownerUserId -> resumable snapshot

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

  static async assertCanAccessItem({ userId, accessToken, itemId }) {
    try {
      await ItemsService.getItemDetails(userId, accessToken, itemId);
    } catch (error) {
      const wrapped = new Error('Du hast keinen Zugriff auf diesen Inhalt');
      wrapped.status = 403;
      wrapped.cause = error;
      throw wrapped;
    }
  }

  static serializeSelectableItem(item) {
    return {
      Id: item.Id,
      Name: item.Name,
      Type: item.Type,
      ProductionYear: item.ProductionYear || null,
      ImageTags: item.ImageTags || {},
      PrimaryImageTag: item.ImageTags?.Primary || null
    };
  }

  static async getSuggestions({ userId, accessToken, limit = 18 }) {
    const [movies, series] = await Promise.all([
      LibraryService.getMovies(userId, accessToken),
      LibraryService.getSeries(userId, accessToken)
    ]);

    return shuffle([...(movies || []), ...(series || [])])
      .slice(0, limit)
      .map(item => this.serializeSelectableItem(item));
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
      members: new Map()
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
  }

  static async joinParty({ partyId, userId, username, accessToken }) {
    const party = this.getPartyOrThrow(partyId);
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
  }

  static setPreloadState({ partyId, userId, state, message }) {
    const party = this.getPartyOrThrow(partyId);
    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.preloadState = state;
    member.preloadMessage = message || '';
    member.ready = READY_PRELOAD_STATES.has(state);
    member.lastSeenAt = Date.now();

    return this.serializeParty(party);
  }

  static openReadyRoom({ partyId, ownerUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet');
    if (party.status !== 'lobby') {
      throw conflict('Diese Watch Party kann nicht mehr vorbereitet werden.');
    }

    party.status = READY_ROOM_STATUS;
    party.lastServerTimeMs = Date.now();

    for (const member of party.members.values()) {
      member.ready = false;
      member.preloadState = 'idle';
      member.preloadMessage = '';
      member.lastSeenAt = Date.now();
    }

    return party;
  }

  static setPlayerReady({ partyId, userId, ready, state = null, message = '' }) {
    const party = this.getPartyOrThrow(partyId);
    if (![READY_ROOM_STATUS, 'countdown'].includes(party.status)) {
      throw conflict('Die Watch Party ist nicht im Bereit-Modus.');
    }

    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.ready = Boolean(ready);
    member.preloadState = state || (ready ? 'ready' : 'idle');
    member.preloadMessage = message || '';
    member.lastSeenAt = Date.now();

    return party;
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
    return party.status === READY_ROOM_STATUS
      && [...party.members.values()].length > 0
      && [...party.members.values()].every(member => member.ready === true);
  }

  static startParty({ partyId, ownerUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet');
    if (!this.canStart(party)) throw conflict('Not all members are ready');

    return this.beginCountdownIfReady({ partyId });
  }

  static beginCountdownIfReady({ partyId }) {
    const party = this.getPartyOrThrow(partyId);
    if (!this.canStart(party)) return null;

    const now = Date.now();
    party.status = 'countdown';
    party.lastServerTimeMs = now;

    return {
      party,
      startsAtServerTimeMs: now + COUNTDOWN_MS,
      positionMs: party.positionMs || 0
    };
  }

  static beginPlayback({ partyId, positionMs }) {
    const party = this.parties.get(partyId);
    if (!party || party.status !== 'countdown') return null;

    party.status = 'playing';
    party.positionMs = Number.isFinite(positionMs) ? positionMs : party.positionMs;
    party.lastServerTimeMs = Date.now();
    return party;
  }

  static async changeEpisode({ partyId, ownerUserId, accessToken, itemId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, ownerUserId);

    const item = await ItemsService.getItemDetails(ownerUserId, accessToken, itemId);
    if (item.Type !== 'Episode') {
      throw badRequest('Nur Episoden können direkt gewechselt werden');
    }

    party.itemId = item.Id;
    party.playableItemId = item.Id;
    party.itemSnapshot = createItemSnapshot(item, item);
    party.positionMs = 0;
    party.status = 'paused';
    party.lastServerTimeMs = Date.now();

    for (const member of party.members.values()) {
      member.preloadState = 'waiting';
      member.preloadMessage = '';
      member.ready = false;
    }

    return party;
  }

  static storeEndedSnapshot(party) {
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
  }

  static endParty({ partyId, ownerUserId, positionMs = null, reason = 'owner-ended' }) {
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
  }

  static getResumableForOwner(userId) {
    const snapshot = this.endedPartiesByOwner.get(userId);
    if (!snapshot) return null;
    if (snapshot.resumeExpiresAt < Date.now()) {
      this.endedPartiesByOwner.delete(userId);
      return null;
    }
    return snapshot;
  }

  static resumeEndedParty({ userId, username, originalPartyId }) {
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
      members: new Map()
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
  }

  static cleanupExpired(now = Date.now()) {
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

  static serializeParty(party, currentUserId = null) {
    const members = [...party.members.values()].map(member => ({
      userId: member.userId,
      username: member.username,
      role: member.role,
      ready: member.ready,
      connected: member.connected,
      joinedAt: member.joinedAt,
      preloadState: member.preloadState || 'waiting',
      preloadMessage: member.preloadMessage || ''
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
      members,
      currentUserRole: currentUserId ? (party.members.get(currentUserId)?.role || null) : null
    };
  }
}

export function getPartyEffectivePosition(party, now = Date.now()) {
  return getEffectivePosition(party, now);
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
