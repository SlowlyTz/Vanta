import { notFound, forbidden, badRequest, conflict } from './errors.js';
import { assertOwner, assertPartyAdmin, assertPartyMember, PLAYBACK_STATES, READY_ROOM_STATUS, SWITCHING_STATUS } from './helpers.js';

export const memberMethods = {
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
      member.preloadProgress = 0;
      member.lastSeenAt = Date.now();
    }

    return party;
  },

  setPlayerReady({ partyId, userId, ready, state = null, message = '', progress = null }) {
    const party = this.getPartyOrThrow(partyId);
    if (![READY_ROOM_STATUS, 'countdown', SWITCHING_STATUS].includes(party.status)) {
      throw conflict('Die Watch Party ist nicht im Bereit-Modus.');
    }

    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');

    member.ready = Boolean(ready);
    member.preloadState = state || (ready ? 'ready' : 'idle');
    member.preloadMessage = message || '';
    if (ready) member.preloadProgress = 1;
    else if (Number.isFinite(Number(progress))) member.preloadProgress = Math.min(1, Math.max(0, Number(progress)));
    member.lastSeenAt = Date.now();

    return party;
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

  // Only the host takes admin rights away again.
  demoteMember({ partyId, actorUserId, targetUserId }) {
    const party = this.getPartyOrThrow(partyId);
    assertOwner(party, actorUserId);

    const target = assertPartyMember(party, targetUserId);
    if (target.role === 'owner') throw badRequest('Der Gastgeber bleibt Admin.');
    if (target.role !== 'admin') return this.serializeParty(party, actorUserId);

    target.role = 'viewer';
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
    this.forgetRecentParty(targetUserId, partyId);

    return {
      party: this.serializeParty(party, actorUserId),
      bannedUser: {
        userId: target.userId,
        username: target.username
      }
    };
  },

  // What each member's player reports about itself (from its drift loop).
  setPlaybackStatus({ partyId, userId, state, driftMs }) {
    const party = this.getPartyOrThrow(partyId);
    const member = party.members.get(userId);
    if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');
    member.playbackState = PLAYBACK_STATES.has(state) ? state : null;
    const drift = Number(driftMs);
    member.driftMs = Number.isFinite(drift) ? Math.max(-600_000, Math.min(600_000, Math.round(drift))) : null;
    member.statusAt = Date.now();
    return party;
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
