import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import watchPartyInvitationsRoutes from '../../../src/server/routes/watch-party-invitations.routes.js';
import { errorHandler } from '../../../src/server/middleware/error.middleware.js';

vi.mock('../../../src/server/services/watch-party-invitation.service.js', () => ({
  WatchPartyInvitationService: {
    getPendingForUser: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn()
  }
}));

vi.mock('../../../src/server/realtime/app.socket.js', () => ({
  appSocketHub: {
    sendToUser: vi.fn()
  }
}));

import { WatchPartyInvitationService } from '../../../src/server/services/watch-party-invitation.service.js';
import { appSocketHub } from '../../../src/server/realtime/app.socket.js';

function createApp({ authenticated = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = authenticated
      ? { userId: 'viewer-1', accessToken: 'token', username: 'bob' }
      : {};
    next();
  });
  app.use('/', watchPartyInvitationsRoutes);
  app.use(errorHandler);
  return app;
}

describe('Watch party invitation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /pending', () => {
    it('liefert pending Invitations für den eingeloggten User', async () => {
      WatchPartyInvitationService.getPendingForUser.mockReturnValue([{ id: 'inv-1' }]);

      const res = await request(createApp()).get('/pending');

      expect(res.status).toBe(200);
      expect(res.body.invitations).toEqual([{ id: 'inv-1' }]);
      expect(WatchPartyInvitationService.getPendingForUser).toHaveBeenCalledWith('viewer-1');
    });

    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).get('/pending');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /:invitationId/accept', () => {
    it('nimmt an, benachrichtigt den Eingeladenen (alle Tabs) und den Einladenden, und liefert navigateTo', async () => {
      WatchPartyInvitationService.acceptInvitation.mockReturnValue({
        invitation: {
          id: 'inv-1',
          partyId: 'party-1',
          invitedUserId: 'viewer-1',
          invitedUsername: 'Bob',
          inviterUserId: 'owner-1',
          status: 'accepted'
        },
        party: { id: 'party-1' }
      });

      const res = await request(createApp()).post('/inv-1/accept');

      expect(res.status).toBe(200);
      expect(res.body.navigateTo).toBe('#/watch-party/party-1');
      expect(WatchPartyInvitationService.acceptInvitation).toHaveBeenCalledWith({ invitationId: 'inv-1', userId: 'viewer-1' });

      expect(appSocketHub.sendToUser).toHaveBeenCalledWith('viewer-1', {
        type: 'WATCH_PARTY_INVITATION_RESOLVED',
        invitationId: 'inv-1',
        status: 'accepted'
      });
      expect(appSocketHub.sendToUser).toHaveBeenCalledWith('owner-1', expect.objectContaining({
        type: 'WATCH_PARTY_INVITATION_RESPONSE',
        status: 'accepted',
        message: 'Bob hat deine Einladung angenommen.'
      }));
    });

    it('gibt Service-Fehler weiter, z.B. 410 bei abgelaufener Einladung', async () => {
      const error = new Error('Diese Einladung ist abgelaufen.');
      error.status = 410;
      WatchPartyInvitationService.acceptInvitation.mockImplementation(() => { throw error; });

      const res = await request(createApp()).post('/inv-1/accept');

      expect(res.status).toBe(410);
    });

    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).post('/inv-1/accept');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /:invitationId/decline', () => {
    it('lehnt ab und benachrichtigt beide Seiten', async () => {
      WatchPartyInvitationService.declineInvitation.mockReturnValue({
        invitation: {
          id: 'inv-1',
          partyId: 'party-1',
          invitedUserId: 'viewer-1',
          invitedUsername: 'Bob',
          inviterUserId: 'owner-1',
          status: 'declined'
        }
      });

      const res = await request(createApp()).post('/inv-1/decline');

      expect(res.status).toBe(200);
      expect(WatchPartyInvitationService.declineInvitation).toHaveBeenCalledWith({ invitationId: 'inv-1', userId: 'viewer-1' });

      expect(appSocketHub.sendToUser).toHaveBeenCalledWith('viewer-1', {
        type: 'WATCH_PARTY_INVITATION_RESOLVED',
        invitationId: 'inv-1',
        status: 'declined'
      });
      expect(appSocketHub.sendToUser).toHaveBeenCalledWith('owner-1', expect.objectContaining({
        type: 'WATCH_PARTY_INVITATION_RESPONSE',
        status: 'declined',
        message: 'Bob hat deine Einladung abgelehnt.'
      }));
    });

    it('erfordert Auth', async () => {
      const res = await request(createApp({ authenticated: false })).post('/inv-1/decline');
      expect(res.status).toBe(401);
    });
  });
});
