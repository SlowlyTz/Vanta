import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMemoryDb } from '../helpers/memoryDb.js';
import { DEFAULT_PREFERENCES } from '../../../src/public/js/shared/preferences.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));

const { default: router } = await import('../../../src/server/routes/preferences.routes.js');

const appAs = (userId) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.session = userId ? { userId, accessToken: 't' } : {}; next(); });
  app.use('/api/preferences', router);
  return app;
};

describe('/api/preferences', () => {
  beforeEach(() => memory.exec('DELETE FROM user_preferences;'));

  it('answers the defaults for a user who never changed anything', async () => {
    const res = await request(appAs('u1')).get('/api/preferences');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual(DEFAULT_PREFERENCES);
  });

  it('stores valid changes per user and ignores the rest', async () => {
    const res = await request(appAs('u1')).put('/api/preferences').send({ stillWatchingHours: 2, screensaverMinutes: 99, isAdmin: true });
    expect(res.body).toEqual({ ...DEFAULT_PREFERENCES, stillWatchingHours: 2 });

    await request(appAs('u1')).put('/api/preferences').send({ screensaverEnabled: false });
    expect((await request(appAs('u1')).get('/api/preferences')).body)
      .toEqual({ ...DEFAULT_PREFERENCES, stillWatchingHours: 2, screensaverEnabled: false });
    expect((await request(appAs('u2')).get('/api/preferences')).body).toEqual(DEFAULT_PREFERENCES);
  });

  it('refuses a body that is no object', async () => {
    const res = await request(appAs('u1')).put('/api/preferences').send([1, 2]);
    expect(res.status).toBe(400);
  });

  it('needs a session', async () => {
    const res = await request(appAs(null)).get('/api/preferences');
    expect(res.status).toBe(401);
  });
});
