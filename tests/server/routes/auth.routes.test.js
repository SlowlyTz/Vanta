import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRoutes from '../../../src/server/routes/auth.routes.js';
import { REMEMBER_ME_MAX_AGE_MS } from '../../../src/server/services/session-login.js';

vi.mock('../../../src/server/services/jellyfin/auth.service.js', () => ({
  AuthService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(() => Promise.resolve()),
    isAdministrator: vi.fn((user) => Boolean(user?.Policy?.IsAdministrator)),
    changePassword: vi.fn()
  }
}));

vi.mock('../../../src/server/services/user-ban.service.js', async (importOriginal) => ({
  ...(await importOriginal()),
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
import { loginThrottle } from '../../../src/server/services/login-throttle.service.js';

const credentialError = (status = 401) => Object.assign(new Error('Unauthorized'), { status });

function createApp({ onSession = null } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const store = {};
    req.session = {
      cookie: {},
      destroy: vi.fn((cb) => { Object.keys(store).forEach(k => delete req.session[k]); cb(null); })
    };
    onSession?.(req.session);
    next();
  });
  app.use('/', authRoutes);
  return app;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginThrottle.clear();
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

    it('keeps the cookie a session cookie unless rememberMe is sent', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-1',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });
      let session;
      const app = createApp({ onSession: s => { session = s; } });

      await request(app).post('/login').send({ username: 'alice', password: 'pw' });
      expect(session.cookie.maxAge).toBeUndefined();

      await request(app).post('/login').send({ username: 'alice', password: 'pw', rememberMe: 'yes' });
      expect(session.cookie.maxAge).toBeUndefined();

      await request(app).post('/login').send({ username: 'alice', password: 'pw', rememberMe: true });
      expect(session.cookie.maxAge).toBe(REMEMBER_ME_MAX_AGE_MS);
    });

    it('gibt jedem Login eine eigene Geräte-ID für Jellyfin', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-1',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });
      let session;
      await request(createApp({ onSession: s => { session = s; } })).post('/login').send({ username: 'alice', password: 'pw' });

      expect(session.deviceId).toMatch(/^vanta-[0-9a-f-]{36}$/);
      expect(AuthService.login).toHaveBeenCalledWith('alice', 'pw', { deviceId: session.deviceId });
    });

    it('returns a generic 401 for wrong credentials', async () => {
      AuthService.login.mockRejectedValue(credentialError());

      const res = await request(createApp()).post('/login').send({ username: 'alice', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Benutzername oder Passwort ist falsch.');
    });

    it('answers 503 and counts nothing when Jellyfin cannot be reached', async () => {
      AuthService.login.mockRejectedValue(new Error('fetch failed'));
      const app = createApp();

      for (let i = 0; i < 4; i++) {
        const res = await request(app).post('/login').send({ username: 'alice', password: 'pw' });
        expect(res.status).toBe(503);
      }
      expect(AuthService.login).toHaveBeenCalledTimes(4);
    });

    it('locks a username after three wrong passwords without asking Jellyfin again', async () => {
      AuthService.login.mockRejectedValue(credentialError());
      const app = createApp();

      expect((await request(app).post('/login').send({ username: 'alice', password: '1' })).status).toBe(401);
      expect((await request(app).post('/login').send({ username: 'alice', password: '2' })).status).toBe(401);
      const third = await request(app).post('/login').send({ username: 'alice', password: '3' });
      expect(third.status).toBe(429);
      expect(third.body).toMatchObject({ code: 'LOGIN_LOCKED', retryAfterMs: 60000 });
      expect(third.body.error).toBe('Zu viele Fehlversuche. Bitte warte 1 Minute.');
      expect(third.headers['retry-after']).toBe('60');

      const locked = await request(app).post('/login').send({ username: 'Alice ', password: 'right' });
      expect(locked.status).toBe(429);
      expect(AuthService.login).toHaveBeenCalledTimes(3);

      // Another user from the same address is not affected.
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-2',
        User: { Id: 'user-2', Name: 'bob', Policy: { IsAdministrator: false } }
      });
      expect((await request(app).post('/login').send({ username: 'bob', password: 'pw' })).status).toBe(200);
    });

    it('gives a banned user a fresh session never and revokes the new token', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-9',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });
      UserBanService.getBan.mockReturnValue({ reason: 'x' });

      const res = await request(createApp()).post('/login').send({ username: 'alice', password: 'pw' });
      expect(res.body.code).toBe('BANNED');
      expect(AuthService.logout).toHaveBeenCalledWith('token-9');
    });

    it('starts a new session id on login', async () => {
      AuthService.login.mockResolvedValue({
        AccessToken: 'token-1',
        User: { Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } }
      });
      const regenerate = vi.fn(cb => cb(null));
      await request(createApp({ onSession: s => { s.regenerate = regenerate; } }))
        .post('/login').send({ username: 'alice', password: 'pw' });
      expect(regenerate).toHaveBeenCalledTimes(1);
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
        reason: 'Account geteilt',
        code: 'BANNED'
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
      expect(res.body).toEqual({ error: 'Dein Konto wurde gesperrt.', code: 'BANNED', reason: 'Account geteilt' });
      expect(AuthService.getCurrentUser).not.toHaveBeenCalled();
      expect(KnownUsersService.remember).not.toHaveBeenCalled();
    });

    it('returns 401 when there is no session', async () => {
      const res = await request(appWithSession({})).get('/me');
      expect(res.status).toBe(401);
    });
  });
});
