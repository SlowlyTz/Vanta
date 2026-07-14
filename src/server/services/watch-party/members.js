import { notFound, forbidden, badRequest, conflict } from './errors.js';
import { assertOwner, assertPartyAdmin, assertPartyMember, READY_PRELOAD_STATES, READY_ROOM_STATUS } from './helpers.js';

export const memberMethods = {
  setPreloadState({ partyId, userId, state, message }) {
    const party = this.getPartyOrThrow(partyId);
    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.preloadState = state;
    member.preloadMessage = message || '';
    member.ready = READY_PRELOAD_STATES.has(state);
    member.lastSeenAt = Date.now();

    return this.serializeParty(party);
  },

  openReadyRoom({ partyId, ownerUserId }) {
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
  },

  setPlayerReady({ partyId, userId, ready, state = null, message = '' }) {
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
  },

  setReady({ partyId, userId, ready }) {
    const party = this.getPartyOrThrow(partyId);
    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.ready = Boolean(ready);
    member.lastSeenAt = Date.now();

    return this.serializeParty(party, userId);
  },

  kickMember({ partyId, actorUserId, targetUserId }) {
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
  },

  promoteMember({ partyId, actorUserId, targetUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertPartyAdmin(party, actorUserId);

    if (targetUserId === actorUserId) {
      throw badRequest('Du bist bereits Admin dieser Watch Party.');
    }

    const target = assertPartyMember(party, targetUserId);
    if (target.role === 'owner' || target.role === 'admin') {
      return this.serializeParty(party, actorUserId);
    }

    target.role = 'admin';
    target.lastSeenAt = Date.now();

    return this.serializeParty(party, actorUserId);
  },

  banMember({ partyId, actorUserId, targetUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertPartyAdmin(party, actorUserId);

    if (targetUserId === actorUserId) {
      throw badRequest('Du kannst dich nicht selbst bannen.');
    }

    const target = assertPartyMember(party, targetUserId);
    if (target.role === 'owner') {
      throw forbidden('Der Owner kann nicht gebannt werden.');
    }
    if (target.role === 'admin' && party.ownerUserId !== actorUserId) {
      throw forbidden('Nur der Owner kann Admins bannen.');
    }

    party.bannedUserIds ??= new Set();
    party.bannedUserIds.add(targetUserId);
    party.members.delete(targetUserId);

    return {
      party: this.serializeParty(party, actorUserId),
      bannedUser: {
        userId: target.userId,
        username: target.username
      }
    };
  },

  setConnected({ partyId, userId, connected }) {
    const party = this.parties.get(partyId);
    if (!party) return null;
    const member = party.members.get(userId);
    if (!member) return null;

    member.connected = connected;
    member.lastSeenAt = Date.now();
    return party;
  }
};
