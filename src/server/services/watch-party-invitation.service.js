import crypto from 'crypto';
import { WatchPartyService, MAX_PARTY_MEMBERS } from './watch-party.service.js';
import { KnownUsersService } from './known-users.service.js';

const INVITATION_TTL_MS = 15 * 60 * 1000;

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

function gone(message) {
  const error = new Error(message);
  error.status = 410;
  return error;
}

export class WatchPartyInvitationService {
  static invitations = new Map();

  static isExpired(invitation, now = Date.now()) {
    return invitation.expiresAt <= now;
  }

  static resolveInviteeByUsername(username) {
    return KnownUsersService.findByExactUsername(username);
  }

  static findPending({ partyId, invitedUserId }, now = Date.now()) {
    for (const invitation of this.invitations.values()) {
      if (
        invitation.partyId === partyId &&
        invitation.invitedUserId === invitedUserId &&
        invitation.status === 'pending' &&
        !this.isExpired(invitation, now)
      ) {
        return invitation;
      }
    }
    return null;
  }

  static createInvitation({ partyId, inviterUserId, invitedUsername }) {
    const party = WatchPartyService.getPartyOrThrow(partyId);
    if (party.status === 'ended') throw badRequest('Diese Watch Party wurde bereits beendet.');
    if (party.ownerUserId !== inviterUserId) throw forbidden('Nur der Owner kann einladen.');

    const invitee = this.resolveInviteeByUsername(invitedUsername);
    if (!invitee) throw notFound('Nutzer nicht gefunden.');
    if (invitee.userId === inviterUserId) throw badRequest('Du kannst dich nicht selbst einladen.');
    if (party.members.has(invitee.userId)) throw conflict('Dieser Nutzer ist bereits in der Watch Party.');

    const existing = this.findPending({ partyId, invitedUserId: invitee.userId });
    if (existing) return existing;

    const now = Date.now();
    const invitation = {
      id: crypto.randomUUID(),
      partyId,
      inviterUserId,
      inviterUsername: party.members.get(inviterUserId)?.username || party.ownerName,
      invitedUserId: invitee.userId,
      invitedUsername: invitee.username,
      itemName: party.itemSnapshot?.name || 'Watch Party',
      status: 'pending',
      createdAt: now,
      expiresAt: now + INVITATION_TTL_MS
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  static getPendingForUser(userId, now = Date.now()) {
    return [...this.invitations.values()]
      .filter(invitation => invitation.invitedUserId === userId)
      .filter(invitation => invitation.status === 'pending')
      .filter(invitation => !this.isExpired(invitation, now));
  }

  static getInvitationOrThrow(invitationId) {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) throw notFound('Einladung nicht gefunden.');
    return invitation;
  }

  static getPendingForDecision(invitationId, userId) {
    const invitation = this.getInvitationOrThrow(invitationId);
    if (invitation.invitedUserId !== userId) throw forbidden('Diese Einladung gehört nicht dir.');

    if (this.isExpired(invitation)) {
      if (invitation.status === 'pending') {
        invitation.status = 'expired';
        invitation.resolvedAt = Date.now();
      }
      throw gone('Diese Einladung ist abgelaufen.');
    }

    if (invitation.status !== 'pending') {
      throw conflict('Über diese Einladung wurde bereits entschieden.');
    }

    return invitation;
  }

  static acceptInvitation({ invitationId, userId }) {
    const invitation = this.getPendingForDecision(invitationId, userId);
    const party = WatchPartyService.getPartyOrThrow(invitation.partyId);

    if (party.status === 'ended') throw conflict('Diese Watch Party wurde bereits beendet.');

    if (!party.members.has(userId) && party.members.size >= MAX_PARTY_MEMBERS) {
      throw conflict('Diese Watch Party ist voll.');
    }

    invitation.status = 'accepted';
    invitation.resolvedAt = Date.now();
    return { invitation, party };
  }

  static declineInvitation({ invitationId, userId }) {
    const invitation = this.getPendingForDecision(invitationId, userId);
    invitation.status = 'declined';
    invitation.resolvedAt = Date.now();
    return { invitation };
  }

  static cleanupExpired(now = Date.now()) {
    for (const [id, invitation] of this.invitations) {
      const resolvedStale = invitation.status !== 'pending' && invitation.resolvedAt && (now - invitation.resolvedAt) > INVITATION_TTL_MS;
      const pendingStale = invitation.status === 'pending' && this.isExpired(invitation, now);
      if (resolvedStale || pendingStale) {
        this.invitations.delete(id);
      }
    }
  }
}
