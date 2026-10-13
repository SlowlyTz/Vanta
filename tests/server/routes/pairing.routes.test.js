import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));
vi.mock('../../../src/server/services/user-ban.service.js', () => ({ UserBanService: { getBan: () => null } }));
vi.mock('../../../src/server/services/known-users.service.js', () => ({ KnownUsersService: { remember: vi.fn() } }));

const { createPairingRouter } = await import('../../../src/server/routes/pairing.routes.js');
const { createPairingService } = await import('../../../src/server/services/pairing.service.js');
const { createLoginThrottle } = await import('../../../src/server/services/login-throttle.service.js');

const setup = ({ banned = false, throttle = createLoginThrottle({ attemptsPerLock: 3, ipAttemptsPerLock: 100 }) } = {}) => {
  const auth = {
    quickConnectInitiate: vi.fn(async () => ({ Secret: 's', Code: '777777' })),
    quickConnectAuthorize: vi.fn(async () => true),
    quickConnectLogin: vi.fn(async () => ({ AccessToken: 'tv-token', User: { Id: 'u1', Name: 'alice', Policy: { IsAdministrator: false } } })),
    isAdministrator: user => user?.Policy?.IsAdministrator === true,
    logout: vi.fn(async () => {})
  };
  const pairing = createPairingService({ auth, randomCode: () => '123456' });
  const bans = { getBan: () => (banned ? { reason: 'x' } : null), isBanned: () => banned };
  const sessions = { tv: { cookie: {} }, phone: { cookie: {}, userId: 'u1', username: 'alice', accessToken: 'phone-token' } };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.session = sessions[req.headers['x-who']]; req.get = name => req.headers[name.toLowerCase()]; next(); });
  app.use('/api/auth/pairing', createPairingRouter({ pairing, bans, auth, throttle }));
  return { app, auth, sessions };
};

describe('/api/auth/pairing', () => {
  it('signs the TV in after the phone confirmed', async () => {
    const { app, auth, sessions } = setup();
    const start = await request(app).post('/api/auth/pairing').set('x-who', 'tv').set('user-agent', 'Tizen TV');
    expect(start.body.code).toBe('123456');
    expect(start.body.url).toMatch(/\/#\/connect\?code=123456$/);
    expect(start.body.qrSvg).toContain('<svg');
    expect((await request(app).get('/api/auth/pairing/status').set('x-who', 'tv')).body).toEqual({ state: 'waiting' });

    const info = await request(app).get('/api/auth/pairing/info?code=123456').set('x-who', 'phone');
    expect(info.body).toMatchObject({ userAgent: 'Tizen TV', sameNetwork: true });
    expect(info.body.createdAt).toBeGreaterThan(0);
    expect((await request(app).post('/api/auth/pairing/confirm').set('x-who', 'phone').send({ code: '123456' })).body).toEqual({ confirmed: true });
    expect(auth.quickConnectAuthorize).toHaveBeenCalledWith('777777', { token: 'phone-token', userId: 'u1' });

    const done = await request(app).get('/api/auth/pairing/status').set('x-who', 'tv');
    expect(done.body).toEqual({ state: 'done', user: { id: 'u1', name: 'alice', isAdmin: false } });
    expect(sessions.tv.accessToken).toBe('tv-token');
    expect(sessions.tv.userId).toBe('u1');
    expect(sessions.phone.accessToken).toBe('phone-token');
  });

  it('counts wrong codes like wrong passwords', async () => {
    const { app } = setup();
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/auth/pairing/confirm').set('x-who', 'phone').send({ code: '000000' })).status).toBe(404);
    }
    expect((await request(app).get('/api/auth/pairing/info?code=000000').set('x-who', 'phone')).status).toBe(429);
  });

  it('keeps wrong codes apart from the password login', async () => {
    const { pairingThrottle } = await import('../../../src/server/routes/pairing.routes.js');
    const { loginThrottle } = await import('../../../src/server/services/login-throttle.service.js');
    expect(pairingThrottle).not.toBe(loginThrottle);
  });

  it('answers a Jellyfin that does not respond like other Jellyfin routes', async () => {
    const { app, auth } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).post('/api/auth/pairing').set('x-who', 'tv');
    auth.quickConnectAuthorize.mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 504 }));
    const res = await request(app).post('/api/auth/pairing/confirm').set('x-who', 'phone').send({ code: '123456' });
    expect(res.status).toBe(504);
    expect(res.body.error).toBe('Bestätigung fehlgeschlagen.');
  });

  it('does not let a banned user confirm or sign in', async () => {
    const { app } = setup({ banned: true });
    await request(app).post('/api/auth/pairing').set('x-who', 'tv');
    expect((await request(app).post('/api/auth/pairing/confirm').set('x-who', 'phone').send({ code: '123456' })).status).toBe(403);
  });

  it('needs a signed-in phone to confirm', async () => {
    const { app, sessions } = setup();
    sessions.phone = { cookie: {} };
    expect((await request(app).post('/api/auth/pairing/confirm').set('x-who', 'phone').send({ code: '123456' })).status).toBe(401);
  });
});
