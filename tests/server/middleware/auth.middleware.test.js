import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/services/user-ban.service.js', async (importOriginal) => ({
  ...(await importOriginal()),
  UserBanService: { getBan: vi.fn() }
}));

import { requireAuth } from '../../../src/server/middleware/auth.middleware.js';
import { UserBanService } from '../../../src/server/services/user-ban.service.js';

function createApp(session) {
  const app = express();
  let destroyed = false;
  app.use((req, res, next) => {
    req.session = { ...session, destroy: (cb) => { destroyed = true; cb(null); } };
    next();
  });
  app.get('/private', requireAuth, (req, res) => res.json({ ok: true }));
  return { app, wasDestroyed: () => destroyed };
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserBanService.getBan.mockReturnValue(null);
  });

  it('lets a valid session through', async () => {
    const { app } = createApp({ userId: 'u1', accessToken: 't' });
    expect((await request(app).get('/private')).status).toBe(200);
  });

  it('refuses a request without a session', async () => {
    const { app } = createApp({});
    expect((await request(app).get('/private')).status).toBe(401);
  });

  it('ends the session of a banned user on the spot and names the reason', async () => {
    UserBanService.getBan.mockReturnValue({ reason: 'Account geteilt' });
    const { app, wasDestroyed } = createApp({ userId: 'u1', accessToken: 't' });

    const res = await request(app).get('/private');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Dein Konto wurde gesperrt.', code: 'BANNED', reason: 'Account geteilt' });
    expect(wasDestroyed()).toBe(true);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^connect\.sid=;/);
  });
});
