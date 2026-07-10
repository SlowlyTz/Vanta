import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import usersRoutes from './users.routes.js';

vi.mock('../../services/jellyfin/auth.service.js', () => ({
  AuthService: { isUserAdmin: vi.fn() }
}));

vi.mock('../../services/jellyfin/admin-users.service.js', () => ({
  JellyfinAdminUsersService: {
    listUsers: vi.fn(),
    listLibraries: vi.fn(),
    updateUserName: vi.fn(),
    deleteUser: vi.fn(),
    setPassword: vi.fn(),
    updatePolicy: vi.fn()
  }
}));

vi.mock('../../services/user-ban.service.js', () => ({
  UserBanService: {
    getBan: vi.fn(),
    ban: vi.fn(),
    unban: vi.fn()
  }
}));

vi.mock('../../services/user-settings.service.js', () => ({
  UserSettingsService: {
    getMaxConcurrentStreams: vi.fn(),
    setMaxConcurrentStreams: vi.fn()
  }
}));

vi.mock('../../services/stream-session.service.js', () => ({
  streamSessionService: {
    getActiveCount: vi.fn()
  }
}));

import { AuthService } from '../../services/jellyfin/auth.service.js';
import { JellyfinAdminUsersService } from '../../services/jellyfin/admin-users.service.js';
import { UserBanService } from '../../services/user-ban.service.js';
import { UserSettingsService } from '../../services/user-settings.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';

function createApp({ authenticated = true, session = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (authenticated) {
      req.session = {
        userId: 'admin-1',
        accessToken: 'admin-token',
        username: 'admin',
        ...session
      };
    } else {
      req.session = {};
    }
    next();
  });
  app.use('/', usersRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

describe('Admin Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.isUserAdmin.mockResolvedValue(true);
    UserBanService.getBan.mockReturnValue(null);
    UserSettingsService.getMaxConcurrentStreams.mockReturnValue(1);
    streamSessionService.getActiveCount.mockReturnValue(0);
  });

  describe('auth protection', () => {
    it('rejects requests without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users', async () => {
      AuthService.isUserAdmin.mockResolvedValue(false);
      const res = await request(createApp()).get('/');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /', () => {
    it('merges Jellyfin users with local ban, settings and stream data', async () => {
      JellyfinAdminUsersService.listUsers.mockResolvedValue([
        { Id: 'u1', Name: 'alice', Policy: { IsAdministrator: false, EnableAllFolders: true, EnabledFolders: [] } }
      ]);
      UserBanService.getBan.mockReturnValue({ reason: 'Account geteilt' });
      UserSettingsService.getMaxConcurrentStreams.mockReturnValue(2);
      streamSessionService.getActiveCount.mockReturnValue(1);

      const res = await request(createApp()).get('/');

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([{
        id: 'u1',
        name: 'alice',
        isAdmin: false,
        isDisabled: false,
        isBanned: true,
        banReason: 'Account geteilt',
        maxConcurrentStreams: 2,
        activeStreams: 1,
        enableAllFolders: true,
        enabledFolders: []
      }]);
    });
  });

  describe('GET /libraries', () => {
    it('normalizes VirtualFolders into id/name/collectionType', async () => {
      JellyfinAdminUsersService.listLibraries.mockResolvedValue([
        { ItemId: 'lib-1', Name: 'Movies', CollectionType: 'movies' }
      ]);

      const res = await request(createApp()).get('/libraries');

      expect(res.status).toBe(200);
      expect(res.body.libraries).toEqual([{ id: 'lib-1', name: 'Movies', collectionType: 'movies' }]);
    });
  });

  describe('PATCH /:userId (rename)', () => {
    it('rejects an empty name', async () => {
      const res = await request(createApp()).patch('/u1').send({ name: '  ' });
      expect(res.status).toBe(400);
      expect(JellyfinAdminUsersService.updateUserName).not.toHaveBeenCalled();
    });

    it('renames the user', async () => {
      JellyfinAdminUsersService.updateUserName.mockResolvedValue({ Id: 'u1', Name: 'bob' });

      const res = await request(createApp()).patch('/u1').send({ name: 'bob' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'u1', name: 'bob' });
      expect(JellyfinAdminUsersService.updateUserName).toHaveBeenCalledWith('u1', 'admin-token', 'bob');
    });

    it('translates a Jellyfin failure into a safe error response', async () => {
      const upstreamError = new Error('Users/u1 failed');
      upstreamError.status = 404;
      JellyfinAdminUsersService.updateUserName.mockRejectedValue(upstreamError);

      const res = await request(createApp()).patch('/u1').send({ name: 'bob' });

      expect(res.status).toBe(404);
      expect(res.body.error).not.toMatch(/Users\/u1 failed/);
    });
  });

  describe('POST /:userId/password', () => {
    it('rejects a missing password', async () => {
      const res = await request(createApp()).post('/u1/password').send({});
      expect(res.status).toBe(400);
    });

    it('sets the new password', async () => {
      JellyfinAdminUsersService.setPassword.mockResolvedValue(true);

      const res = await request(createApp()).post('/u1/password').send({ newPassword: 'new-secret' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(JellyfinAdminUsersService.setPassword).toHaveBeenCalledWith('u1', 'admin-token', 'new-secret');
    });
  });

  describe('DELETE /:userId', () => {
    it('prevents an admin from deleting their own account', async () => {
      const res = await request(createApp()).delete('/admin-1');

      expect(res.status).toBe(400);
      expect(JellyfinAdminUsersService.deleteUser).not.toHaveBeenCalled();
    });

    it('deletes another user and clears any local ban', async () => {
      JellyfinAdminUsersService.deleteUser.mockResolvedValue(true);

      const res = await request(createApp()).delete('/u1');

      expect(res.status).toBe(200);
      expect(JellyfinAdminUsersService.deleteUser).toHaveBeenCalledWith('u1', 'admin-token');
      expect(UserBanService.unban).toHaveBeenCalledWith('u1');
    });
  });

  describe('POST /:userId/ban', () => {
    it('prevents an admin from banning themselves', async () => {
      const res = await request(createApp()).post('/admin-1/ban').send({ reason: 'test' });
      expect(res.status).toBe(400);
      expect(UserBanService.ban).not.toHaveBeenCalled();
    });

    it('requires a non-empty reason', async () => {
      const res = await request(createApp()).post('/u1/ban').send({ reason: '   ' });
      expect(res.status).toBe(400);
      expect(UserBanService.ban).not.toHaveBeenCalled();
    });

    it('bans the user with the given reason and records the acting admin', async () => {
      UserBanService.ban.mockReturnValue({ userId: 'u1', reason: 'Account geteilt' });

      const res = await request(createApp()).post('/u1/ban').send({ reason: 'Account geteilt', username: 'alice' });

      expect(res.status).toBe(200);
      expect(UserBanService.ban).toHaveBeenCalledWith('u1', 'alice', 'Account geteilt', {
        userId: 'admin-1',
        username: 'admin'
      });
    });
  });

  describe('DELETE /:userId/ban', () => {
    it('unbans the user', async () => {
      UserBanService.unban.mockReturnValue(true);

      const res = await request(createApp()).delete('/u1/ban');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, wasBanned: true });
      expect(UserBanService.unban).toHaveBeenCalledWith('u1');
    });
  });

  describe('PATCH /:userId/libraries', () => {
    it('rejects a non-boolean enableAllFolders', async () => {
      const res = await request(createApp()).patch('/u1/libraries').send({ enabledFolders: [] });
      expect(res.status).toBe(400);
      expect(JellyfinAdminUsersService.updatePolicy).not.toHaveBeenCalled();
    });

    it('rejects a missing enabledFolders array when access is restricted', async () => {
      const res = await request(createApp()).patch('/u1/libraries').send({ enableAllFolders: false });
      expect(res.status).toBe(400);
    });

    it('grants access to all folders', async () => {
      JellyfinAdminUsersService.updatePolicy.mockResolvedValue({ EnableAllFolders: true, EnabledFolders: [] });

      const res = await request(createApp()).patch('/u1/libraries').send({ enableAllFolders: true });

      expect(res.status).toBe(200);
      expect(JellyfinAdminUsersService.updatePolicy).toHaveBeenCalledWith('u1', 'admin-token', {
        EnableAllFolders: true,
        EnabledFolders: []
      });
    });

    it('grants access to specific folders', async () => {
      JellyfinAdminUsersService.updatePolicy.mockResolvedValue({
        EnableAllFolders: false,
        EnabledFolders: ['lib-1', 'lib-2']
      });

      const res = await request(createApp()).patch('/u1/libraries').send({
        enableAllFolders: false,
        enabledFolders: ['lib-1', 'lib-2']
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ enableAllFolders: false, enabledFolders: ['lib-1', 'lib-2'] });
    });
  });

  describe('PATCH /:userId/stream-limit', () => {
    it('sets a valid stream limit', async () => {
      UserSettingsService.setMaxConcurrentStreams.mockReturnValue({ maxConcurrentStreams: 2 });

      const res = await request(createApp()).patch('/u1/stream-limit').send({ maxConcurrentStreams: 2 });

      expect(res.status).toBe(200);
      expect(UserSettingsService.setMaxConcurrentStreams).toHaveBeenCalledWith('u1', 2, {
        userId: 'admin-1',
        username: 'admin'
      });
    });

    it('returns 400 when the service rejects an invalid limit', async () => {
      const validationError = new Error('maxConcurrentStreams must be an integer between 0 and 20');
      validationError.status = 400;
      UserSettingsService.setMaxConcurrentStreams.mockImplementation(() => { throw validationError; });

      const res = await request(createApp()).patch('/u1/stream-limit').send({ maxConcurrentStreams: -1 });

      expect(res.status).toBe(400);
    });
  });
});
