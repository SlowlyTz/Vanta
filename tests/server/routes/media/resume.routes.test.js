import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../../src/server/services/resume.service.js', () => ({ ResumeService: {} }));
vi.mock('../../../../src/server/services/user-data.service.js', () => ({ UserDataService: {} }));
const { createResumeRouter } = await import('../../../../src/server/routes/media/resume.routes.js');

const userData = { forget: vi.fn() };
const appWith = (service) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.session = { userId: 'u1', accessToken: 't' }; next(); });
  app.use('/api/media', createResumeRouter({ service, userData }));
  return app;
};

describe('resume routes', () => {
  it('answers the next episode', async () => {
    const service = { nextUp: vi.fn(async () => ({ Id: 'e2' })) };
    const res = await request(appWith(service)).get('/api/media/item/s1/next-up');
    expect(res.body).toEqual({ episode: { Id: 'e2' } });
    expect(service.nextUp).toHaveBeenCalledWith('u1', 't', 's1');
  });

  it('removes with undo information and restores', async () => {
    const service = { remove: vi.fn(async () => ({ kind: 'series', seriesId: 's1' })), restore: vi.fn(async () => {}) };
    const removed = await request(appWith(service)).delete('/api/media/resume/e1');
    expect(removed.body).toEqual({ undo: { kind: 'series', seriesId: 's1' } });
    const restored = await request(appWith(service)).post('/api/media/resume/restore').send({ undo: removed.body.undo });
    expect(restored.body).toEqual({ restored: true });
    expect(service.restore).toHaveBeenCalledWith('u1', 't', { kind: 'series', seriesId: 's1' });
    // The cards must not show the minute-old progress afterwards.
    expect(userData.forget).toHaveBeenCalledTimes(2);
    expect(userData.forget).toHaveBeenCalledWith('u1');
  });

  it('refuses ids that are no Jellyfin ids', async () => {
    const service = { nextUp: vi.fn(), remove: vi.fn(), restore: vi.fn() };
    expect((await request(appWith(service)).get('/api/media/item/a%2Fb/next-up')).status).toBe(400);
    expect((await request(appWith(service)).delete('/api/media/resume/a%3Fb')).status).toBe(400);
    expect((await request(appWith(service)).post('/api/media/resume/restore').send({ undo: { kind: 'position', itemId: '../x', positionTicks: 5 } })).status).toBe(400);
    expect(service.nextUp).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.restore).not.toHaveBeenCalled();
  });

  it('answers 400 for nothing to undo', async () => {
    const service = { restore: vi.fn(async () => { throw Object.assign(new Error('Nichts rückgängig zu machen'), { status: 400 }); }) };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appWith(service)).post('/api/media/resume/restore').send({});
    expect(res.status).toBe(400);
  });
});
