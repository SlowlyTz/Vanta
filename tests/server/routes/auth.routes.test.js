import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRoutes from '../../../src/server/routes/auth.routes.js';

vi.mock('../../../src/server/services/jellyfin/auth.service.js', () => ({
  AuthService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    isAdministrator: vi.fn((user) => Boolean(user?.Policy?.IsAdministrator)),
    changePassword: vi.fn()
  }
}));

vi.mock('../../../src/server/services/user-ban.service.js', () => ({
  UserBanService: {
    getBan: vi.fn()
  }
}));

vi.mock('../../../src/server/services/known-users.service.js', () => ({
  KnownUsersService: {
    remember: vi.fn()
  }
}));

import { AuthService } from '../../../src/server/services/jellyfin/auth.service.js';
import { UserBanService } from '../../../src/server/services/user-ban.service.js';
import { KnownUsersService } from '../../../src/server/services/known-users.service.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const store = {};
    req.session = {
      destroy: vi.fn((cb) => { Object.keys(store).forEach(k => delete req.session[k]); cb(null); })
    };
    next();
  });
  app.use('/', authRoutes);
  return app;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserBanService.getBan.mockReturnValue(null);
  });

  describe('POST /login', () => {
    it('logs in a valid, non-banned user and sets the session', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-1',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });

      const res = await request(createApp()).post('/login').send({ username: 'alice', password: 'pw' });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 'user-1', name: 'alice', isAdmin: false });
      expect(KnownUsersService.remember).toHaveBeenCalledWith({ userId: 'user-1', username: 'alice' });
    });

    it('returns a generic 401 for wrong credentials', async () => {
      AuthService.login.mockRejectedValue(new Error('Invalid'));

      const res = await request(createApp()).post('/login').send({ username: 'alice', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid username or password');
    });

    it('returns 403 with the ban reason for a banned user and does not set a session', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-1',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });
      UserBanService.getBan.mockReturnValue({ reason: 'Account geteilt' });

      const res = await request(createApp()).post('/login').send({ username: 'alice', password: 'pw' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.',
        reason: 'Account geteilt'
      });
      expect(KnownUsersService.remember).not.toHaveBeenCalled();
    });

    it('requires a username', async () => {
      const res = await request(createApp()).post('/login').send({ password: 'pw' });
      expect(res.status).toBe(400);
      expect(AuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('GET /me', () => {
    function appWithSession(session) {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.session = { destroy: vi.fn((cb) => cb(null)), ...session };
        next();
      });
      app.use('/', authRoutes);
      return app;
    }

    it('returns the current user when authenticated and not banned', async () => {
      AuthService.getCurrentUser.mockResolvedValue({ Name: 'alice', Policy: { IsAdministrator: false } });

      const res = await request(appWithSession({ accessToken: 'token-1', userId: 'user-1', username: 'alice' })).get('/me');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 'user-1', name: 'alice', isAdmin: false });
      expect(KnownUsersService.remember).toHaveBeenCalledWith({ userId: 'user-1', username: 'alice' });
    });

    it('destroys the session and rejects when the user has since been banned', async () => {
      UserBanService.getBan.mockReturnValue({ reason: 'Account geteilt' });

      const res = await request(appWithSession({ accessToken: 'token-1', userId: 'user-1', username: 'alice' })).get('/me');

      expect(res.status).toBe(401);
      expect(AuthService.getCurrentUser).not.toHaveBeenCalled();
      expect(KnownUsersService.remember).not.toHaveBeenCalled();
    });

    it('returns 401 when there is no session', async () => {
      const res = await request(appWithSession({})).get('/me');
      expect(res.status).toBe(401);
    });
  });
});
