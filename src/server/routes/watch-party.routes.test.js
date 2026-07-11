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
    deleteParty: vi.fn(),
    serializeParty: vi.fn(party => party)
  }
}));

vi.mock('../realtime/watch-party.socket.js', () => ({
  watchPartySocketHub: {
    broadcastParty: vi.fn(),
    sendToUser: vi.fn(),
    closeUserConnections: vi.fn()
  }
}));

import { WatchPartyService } from '../services/watch-party.service.js';
import { watchPartySocketHub } from '../realtime/watch-party.socket.js';

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

  describe('POST /:partyId/join', () => {
    it('adds the user as a member and broadcasts the update', async () => {
      WatchPartyService.joinParty.mockReturnValue({ id: 'party-1', members: [] });

      const res = await request(createApp()).post('/party-1/join');

      expect(res.status).toBe(200);
      expect(watchPartySocketHub.broadcastParty).toHaveBeenCalledWith('party-1', {
        type: 'PARTY_UPDATED',
        party: { id: 'party-1', members: [] }
      });
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
});
