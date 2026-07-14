import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/server/services/watch-party.service.js', () => ({
  WatchPartyService: {
    getPartyOrThrow: vi.fn()
  },
  MAX_PARTY_MEMBERS: 4
}));

vi.mock('../../../src/server/services/known-users.service.js', () => ({
  KnownUsersService: {
    findByExactUsername: vi.fn()
  }
}));

import { WatchPartyService } from '../../../src/server/services/watch-party.service.js';
import { KnownUsersService } from '../../../src/server/services/known-users.service.js';
import { WatchPartyInvitationService } from '../../../src/server/services/watch-party-invitation.service.js';

function makeParty(overrides = {}) {
  return {
    id: 'party-1',
    ownerUserId: 'owner-1',
    ownerName: 'Alice',
    status: 'lobby',
    itemSnapshot: { name: 'Blade Runner' },
    members: new Map([
      ['owner-1', { userId: 'owner-1', username: 'Alice' }]
    ]),
    ...overrides
  };
}

describe('WatchPartyInvitationService', () => {
  beforeEach(() => {
    WatchPartyInvitationService.invitations.clear();
    vi.clearAllMocks();
  });

  describe('resolveInviteeByUsername', () => {
    it('delegiert an KnownUsersService', () => {
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      const result = WatchPartyInvitationService.resolveInviteeByUsername('bob');

      expect(KnownUsersService.findByExactUsername).toHaveBeenCalledWith('bob');
      expect(result).toEqual({ userId: 'viewer-1', username: 'Bob' });
    });
  });

  describe('createInvitation', () => {
    it('erstellt eine pending Einladung für einen exakt gefundenen Nutzer', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      const invitation = WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'bob'
      });

      expect(invitation).toMatchObject({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        inviterUsername: 'Alice',
        invitedUserId: 'viewer-1',
        invitedUsername: 'Bob',
        itemName: 'Blade Runner',
        status: 'pending'
      });
      expect(invitation.expiresAt).toBeGreaterThan(invitation.createdAt);
    });

    it('lehnt Einladen durch Nicht-Owner ab', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      expect(() => WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'viewer-2',
        invitedUsername: 'bob'
      })).toThrow(expect.objectContaining({ status: 403 }));
    });

    it('lehnt Einladen für beendete Party ab', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty({ status: 'ended' }));

      expect(() => WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'bob'
      })).toThrow(expect.objectContaining({ status: 400 }));
    });

    it('liefert 404, wenn kein exakter Nutzer gefunden wird', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());
      KnownUsersService.findByExactUsername.mockReturnValue(null);

      expect(() => WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'unknown'
      })).toThrow(expect.objectContaining({ status: 404 }));
    });

    it('verbietet Selbst-Einladung', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'owner-1', username: 'Alice' });

      expect(() => WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'alice'
      })).toThrow(expect.objectContaining({ status: 400 }));
    });

    it('lehnt Einladung ab, wenn der Nutzer bereits Mitglied ist', () => {
      const party = makeParty();
      party.members.set('viewer-1', { userId: 'viewer-1', username: 'Bob' });
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      expect(() => WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'bob'
      })).toThrow(expect.objectContaining({ status: 409 }));
    });

    it('dedupliziert: eine zweite Einladung für denselben User+Party liefert dieselbe pending Einladung', () => {
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());
      KnownUsersService.findByExactUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      const first = WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'bob'
      });
      const second = WatchPartyInvitationService.createInvitation({
        partyId: 'party-1',
        inviterUserId: 'owner-1',
        invitedUsername: 'bob'
      });

      expect(second.id).toBe(first.id);
      expect(WatchPartyInvitationService.invitations.size).toBe(1);
    });
  });

  describe('getPendingForUser', () => {
    it('liefert nur pending, nicht abgelaufene Einladungen für den Nutzer', () => {
      const now = Date.now();
      WatchPartyInvitationService.invitations.set('inv-1', {
        id: 'inv-1', invitedUserId: 'viewer-1', status: 'pending', expiresAt: now + 10_000
      });
      WatchPartyInvitationService.invitations.set('inv-2', {
        id: 'inv-2', invitedUserId: 'viewer-1', status: 'accepted', expiresAt: now + 10_000
      });
      WatchPartyInvitationService.invitations.set('inv-3', {
        id: 'inv-3', invitedUserId: 'viewer-1', status: 'pending', expiresAt: now - 1_000
      });
      WatchPartyInvitationService.invitations.set('inv-4', {
        id: 'inv-4', invitedUserId: 'viewer-2', status: 'pending', expiresAt: now + 10_000
      });

      const pending = WatchPartyInvitationService.getPendingForUser('viewer-1', now);

      expect(pending.map(i => i.id)).toEqual(['inv-1']);
    });
  });

  describe('acceptInvitation / declineInvitation', () => {
    function pendingInvitation(overrides = {}) {
      const now = Date.now();
      const invitation = {
        id: 'inv-1',
        partyId: 'party-1',
        invitedUserId: 'viewer-1',
        status: 'pending',
        createdAt: now,
        expiresAt: now + 10_000,
        ...overrides
      };
      WatchPartyInvitationService.invitations.set(invitation.id, invitation);
      return invitation;
    }

    it('nimmt eine gültige Einladung an', () => {
      pendingInvitation();
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty());

      const { invitation, party } = WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' });

      expect(invitation.status).toBe('accepted');
      expect(party.id).toBe('party-1');
    });

    it('lehnt eine gültige Einladung ab', () => {
      pendingInvitation();

      const { invitation } = WatchPartyInvitationService.declineInvitation({ invitationId: 'inv-1', userId: 'viewer-1' });

      expect(invitation.status).toBe('declined');
    });

    it('liefert 404 für unbekannte Einladungs-ID', () => {
      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'unknown', userId: 'viewer-1' }))
        .toThrow(expect.objectContaining({ status: 404 }));
    });

    it('liefert 403, wenn ein anderer User als der Eingeladene entscheidet', () => {
      pendingInvitation();

      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'someone-else' }))
        .toThrow(expect.objectContaining({ status: 403 }));
    });

    it('liefert 410 für eine abgelaufene Einladung und markiert sie als expired', () => {
      const invitation = pendingInvitation({ expiresAt: Date.now() - 1_000 });

      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' }))
        .toThrow(expect.objectContaining({ status: 410 }));
      expect(invitation.status).toBe('expired');
    });

    it('liefert 409, wenn bereits über die Einladung entschieden wurde', () => {
      pendingInvitation({ status: 'declined', resolvedAt: Date.now() });

      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' }))
        .toThrow(expect.objectContaining({ status: 409 }));
    });

    it('lehnt Accept ab, wenn die Party bereits beendet wurde', () => {
      pendingInvitation();
      WatchPartyService.getPartyOrThrow.mockReturnValue(makeParty({ status: 'ended' }));

      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' }))
        .toThrow(expect.objectContaining({ status: 409 }));
    });

    it('lehnt Accept ab, wenn die Party voll ist', () => {
      pendingInvitation();
      const party = makeParty();
      party.members.set('viewer-2', { userId: 'viewer-2' });
      party.members.set('viewer-3', { userId: 'viewer-3' });
      party.members.set('viewer-4', { userId: 'viewer-4' });
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);

      expect(() => WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' }))
        .toThrow(expect.objectContaining({ status: 409 }));
    });

    it('erlaubt Accept trotz voller Party, wenn der Nutzer bereits Mitglied ist', () => {
      pendingInvitation();
      const party = makeParty();
      party.members.set('viewer-1', { userId: 'viewer-1' });
      party.members.set('viewer-2', { userId: 'viewer-2' });
      party.members.set('viewer-3', { userId: 'viewer-3' });
      WatchPartyService.getPartyOrThrow.mockReturnValue(party);

      const { invitation } = WatchPartyInvitationService.acceptInvitation({ invitationId: 'inv-1', userId: 'viewer-1' });
      expect(invitation.status).toBe('accepted');
    });
  });

  describe('cleanupExpired', () => {
    it('entfernt abgelaufene pending Einladungen und lange zurückliegende resolved Einladungen', () => {
      const now = Date.now();
      WatchPartyInvitationService.invitations.set('inv-1', {
        id: 'inv-1', status: 'pending', createdAt: now - 20_000, expiresAt: now - 1_000
      });
      WatchPartyInvitationService.invitations.set('inv-2', {
        id: 'inv-2', status: 'accepted', createdAt: now - 20_000, expiresAt: now + 10_000, resolvedAt: now - (16 * 60 * 1000)
      });
      WatchPartyInvitationService.invitations.set('inv-3', {
        id: 'inv-3', status: 'pending', createdAt: now, expiresAt: now + 10_000
      });

      WatchPartyInvitationService.cleanupExpired(now);

      expect([...WatchPartyInvitationService.invitations.keys()]).toEqual(['inv-3']);
    });
  });
});
