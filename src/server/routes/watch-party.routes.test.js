import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import watchPartyRoutes from './watch-party.routes.js';
import { errorHandler } from '../middleware/error.middleware.js';

vi.mock('../services/watch-party.service.js', () => ({
  WatchPartyService: {
    createParty: vi.fn(),
    getPartyOrThrow: vi.fn(),
    joinParty: vi.fn(),
    setReady: vi.fn(),
    kickMember: vi.fn(),
    endParty: vi.fn(),
    getSuggestions: vi.fn(),
    getResumableForOwner: vi.fn(),
    resumeEndedParty: vi.fn(),
    serializeParty: vi.fn(party => party)
  }
}));

vi.mock('../realtime/watch-party.socket.js', () => ({
  watchPartySocketHub: {
    broadcastParty: vi.fn(),
    sendToUser: vi.fn(),
    closeUserConnections: vi.fn(),
    cancelOwnerDisconnectTimer: vi.fn(),
    cancelCountdown: vi.fn()
  }
}));

vi.mock('../services/watch-party-invitation.service.js', () => ({
  WatchPartyInvitationService: {
    resolveInviteeByUsername: vi.fn(),
    createInvitation: vi.fn()
  }
}));

vi.mock('../realtime/app.socket.js', () => ({
  appSocketHub: {
    sendToUser: vi.fn()
  }
}));

import { WatchPartyService } from '../services/watch-party.service.js';
import { watchPartySocketHub } from '../realtime/watch-party.socket.js';
import { WatchPartyInvitationService } from '../services/watch-party-invitation.service.js';
import { appSocketHub } from '../realtime/app.socket.js';

function createApp({ authenticated = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = authenticated
      ? { userId: 'user-1', accessToken: 'token', username: 'alice' }
      : {};
    next();
  });
  app.use('/', watchPartyRoutes);
  app.use(errorHandler);
  return app;
}

describe('Watch party routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(createApp({ authenticated: false })).post('/').send({ itemId: 'movie-1' });
      expect(res.status).toBe(401);
    });

    it('creates a party for authenticated users', async () => {
      WatchPartyService.createParty.mockResolvedValue({ id: 'party-1', ownerUserId: 'user-1' });

      const res = await request(createApp()).post('/').send({ itemId: 'movie-1' });

      expect(res.status).toBe(201);
      expect(res.body.party.id).toBe('party-1');
      expect(res.body.inviteUrl).toBe('/#/watch-party/party-1');
      expect(WatchPartyService.createParty).toHaveBeenCalledWith({
        userId: 'user-1',
        username: 'alice',
        accessToken: 'token',
        itemId: 'movie-1'
      });
    });

    it('returns 400 without itemId', async () => {
      const res = await request(createApp()).post('/').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /suggestions', () => {
    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).get('/suggestions');
      expect(res.status).toBe(401);
    });

    it('liefert Vorschläge für den eingeloggten User', async () => {
      WatchPartyService.getSuggestions.mockResolvedValue([{ Id: 'm1', Type: 'Movie' }]);

      const res = await request(createApp()).get('/suggestions?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(WatchPartyService.getSuggestions).toHaveBeenCalledWith({
        userId: 'user-1',
        accessToken: 'token',
        limit: 5
      });
    });
  });

  describe('GET /resumable', () => {
    it('liefert die letzte beendete Party des Owners', async () => {
      WatchPartyService.getResumableForOwner.mockReturnValue({ originalPartyId: 'party-1', finalPositionMs: 1000 });

      const res = await request(createApp()).get('/resumable');

      expect(res.status).toBe(200);
      expect(res.body.party).toMatchObject({ originalPartyId: 'party-1' });
    });

    it('liefert null, wenn keine fortsetzbare Party existiert', async () => {
      WatchPartyService.getResumableForOwner.mockReturnValue(null);

      const res = await request(createApp()).get('/resumable');

      expect(res.status).toBe(200);
      expect(res.body.party).toBeNull();
    });
  });

  describe('POST /resume', () => {
    it('erzeugt eine neue Party aus dem Snapshot', async () => {
      WatchPartyService.resumeEndedParty.mockReturnValue({ id: 'party-2', ownerUserId: 'user-1' });

      const res = await request(createApp()).post('/resume').send({ originalPartyId: 'party-1' });

      expect(res.status).toBe(201);
      expect(res.body.party.id).toBe('party-2');
      expect(res.body.inviteUrl).toBe('/#/watch-party/party-2');
    });

    it('returns 400 ohne originalPartyId', async () => {
      const res = await request(createApp()).post('/resume').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /:partyId/join', () => {
    it('adds the user as a member and broadcasts the update', async () => {
      WatchPartyService.joinParty.mockResolvedValue({ id: 'party-1', members: [] });

      const res = await request(createApp()).post('/party-1/join');

      expect(res.status).toBe(200);
      expect(WatchPartyService.joinParty).toHaveBeenCalledWith({
        partyId: 'party-1',
        userId: 'user-1',
        username: 'alice',
        accessToken: 'token'
      });
      expect(watchPartySocketHub.broadcastParty).toHaveBeenCalledWith('party-1', {
        type: 'PARTY_UPDATED',
        party: { id: 'party-1', members: [] }
      });
    });

    it('schlägt fehl, wenn der Access-Check fehlschlägt', async () => {
      const error = new Error('Du hast keinen Zugriff auf diesen Inhalt');
      error.status = 403;
      WatchPartyService.joinParty.mockRejectedValue(error);

      const res = await request(createApp()).post('/party-1/join');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /:partyId/kick', () => {
    it('rejects kick attempts from non-owners with 403', async () => {
      const error = new Error('Only the party owner can perform this action');
      error.status = 403;
      WatchPartyService.kickMember.mockImplementation(() => { throw error; });

      const res = await request(createApp()).post('/party-1/kick').send({ userId: 'viewer-1' });

      expect(res.status).toBe(403);
    });

    it('allows the owner to kick and notifies the removed member', async () => {
      WatchPartyService.kickMember.mockReturnValue({ id: 'party-1', members: [] });

      const res = await request(createApp()).post('/party-1/kick').send({ userId: 'viewer-1' });

      expect(res.status).toBe(200);
      expect(watchPartySocketHub.sendToUser).toHaveBeenCalledWith('party-1', 'viewer-1', { type: 'KICKED' });
      expect(watchPartySocketHub.closeUserConnections).toHaveBeenCalledWith('party-1', 'viewer-1');
    });
  });

  describe('POST /:partyId/end', () => {
    it('beendet die Party und broadcastet PARTY_ENDED', async () => {
      WatchPartyService.endParty.mockReturnValue({ id: 'party-1', status: 'ended' });

      const res = await request(createApp()).post('/party-1/end').send({ positionMs: 5000 });

      expect(res.status).toBe(200);
      expect(WatchPartyService.endParty).toHaveBeenCalledWith({
        partyId: 'party-1',
        ownerUserId: 'user-1',
        positionMs: 5000,
        reason: 'owner-ended'
      });
      expect(watchPartySocketHub.broadcastParty).toHaveBeenCalledWith('party-1', expect.objectContaining({
        type: 'PARTY_ENDED',
        party: { id: 'party-1', status: 'ended' }
      }));
    });
  });

  describe('POST /:partyId/invitations/resolve-user', () => {
    it('liefert den gefundenen User', async () => {
      WatchPartyInvitationService.resolveInviteeByUsername.mockReturnValue({ userId: 'viewer-1', username: 'Bob' });

      const res = await request(createApp()).post('/party-1/invitations/resolve-user').send({ username: 'bob' });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 'viewer-1', username: 'Bob' });
      expect(WatchPartyInvitationService.resolveInviteeByUsername).toHaveBeenCalledWith('bob');
    });

    it('liefert null, wenn kein exakter Treffer existiert', async () => {
      WatchPartyInvitationService.resolveInviteeByUsername.mockReturnValue(null);

      const res = await request(createApp()).post('/party-1/invitations/resolve-user').send({ username: 'unknown' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
    });

    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).post('/party-1/invitations/resolve-user').send({ username: 'bob' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /:partyId/invitations', () => {
    it('erstellt eine Einladung und pusht sie an den eingeladenen User', async () => {
      WatchPartyInvitationService.createInvitation.mockReturnValue({
        id: 'inv-1', invitedUserId: 'viewer-1', partyId: 'party-1', status: 'pending'
      });

      const res = await request(createApp()).post('/party-1/invitations').send({ username: 'bob' });

      expect(res.status).toBe(201);
      expect(res.body.invitation.id).toBe('inv-1');
      expect(WatchPartyInvitationService.createInvitation).toHaveBeenCalledWith({
        partyId: 'party-1',
        inviterUserId: 'user-1',
        invitedUsername: 'bob'
      });
      expect(appSocketHub.sendToUser).toHaveBeenCalledWith('viewer-1', expect.objectContaining({
        type: 'WATCH_PARTY_INVITATION',
        invitation: expect.objectContaining({ id: 'inv-1' })
      }));
    });

    it('gibt den Service-Fehler weiter, z.B. 409 bei bereits vorhandenem Mitglied', async () => {
      const error = new Error('Dieser Nutzer ist bereits in der Watch Party.');
      error.status = 409;
      WatchPartyInvitationService.createInvitation.mockImplementation(() => { throw error; });

      const res = await request(createApp()).post('/party-1/invitations').send({ username: 'bob' });

      expect(res.status).toBe(409);
    });

    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).post('/party-1/invitations').send({ username: 'bob' });
      expect(res.status).toBe(401);
    });
  });
});
