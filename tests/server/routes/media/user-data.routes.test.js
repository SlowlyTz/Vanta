import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../../src/server/services/user-data.service.js', () => ({ UserDataService: {} }));
const { createUserDataRouter } = await import('../../../../src/server/routes/media/user-data.routes.js');

const appWith = (service) => {
  const app = express();
  app.use((req, res, next) => { req.session = { userId: 'u1', accessToken: 't' }; next(); });
  app.use('/api/media', createUserDataRouter({ service }));
  return app;
};

describe('GET /api/media/userdata', () => {
  it('passes only well-formed ids on', async () => {
    const service = { forItems: vi.fn(async () => ({ a1: { played: true } })) };
    const res = await request(appWith(service)).get('/api/media/userdata?ids=a1,../x,,b-2');
    expect(res.body).toEqual({ a1: { played: true } });
    expect(service.forItems).toHaveBeenCalledWith('u1', 't', ['a1', 'b-2']);
  });

  it('answers an empty object without ids', async () => {
    const service = { forItems: vi.fn() };
    expect((await request(appWith(service)).get('/api/media/userdata')).body).toEqual({});
    expect(service.forItems).not.toHaveBeenCalled();
  });

  it('forgets the cache on refresh', async () => {
    const service = { forget: vi.fn() };
    await request(appWith(service)).post('/api/media/userdata/refresh');
    expect(service.forget).toHaveBeenCalledWith('u1');
  });
});
