import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/services/watchlist.service.js', () => ({ WatchlistService: {} }));
const { createWatchlistRouter } = await import('../../../src/server/routes/watchlist.routes.js');

const appWith = (service, userId = 'u1') => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.session = userId ? { userId, accessToken: 't' } : {}; next(); });
  app.use('/api/watchlist', createWatchlistRouter({ service }));
  return app;
};

describe('/api/watchlist', () => {
  it('lists the items and the ids', async () => {
    const service = { list: vi.fn(async () => [{ Id: 'm1' }]), ids: vi.fn(() => ['m1']) };
    expect((await request(appWith(service)).get('/api/watchlist')).body).toEqual({ items: [{ Id: 'm1' }] });
    expect((await request(appWith(service)).get('/api/watchlist/ids')).body).toEqual({ ids: ['m1'] });
    expect(service.list).toHaveBeenCalledWith('u1', 't');
  });

  it('adds and removes, with 404 for unknown and 400 for wrong types', async () => {
    const service = {
      add: vi.fn(async (u, t, id) => {
        if (id === 'gone') throw Object.assign(new Error('x'), { status: 404 });
        if (id === 'ep') throw Object.assign(new Error('Nur Filme und Serien passen auf die Liste'), { status: 400 });
        return { id, type: 'Movie' };
      }),
      remove: vi.fn(() => true)
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await request(appWith(service)).put('/api/watchlist/m1')).body).toEqual({ id: 'm1', type: 'Movie' });
    expect((await request(appWith(service)).put('/api/watchlist/gone')).status).toBe(404);
    const wrong = await request(appWith(service)).put('/api/watchlist/ep');
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toContain('Filme und Serien');
    expect((await request(appWith(service)).delete('/api/watchlist/m1')).body).toEqual({ removed: true });
  });

  it('refuses ids that are no Jellyfin ids', async () => {
    const service = { add: vi.fn(), remove: vi.fn() };
    expect((await request(appWith(service)).put('/api/watchlist/a%2Fb')).status).toBe(400);
    expect((await request(appWith(service)).delete(`/api/watchlist/${'x'.repeat(65)}`)).status).toBe(400);
    expect(service.add).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('needs a session', async () => {
    expect((await request(appWith({}, null)).get('/api/watchlist/ids')).status).toBe(401);
  });
});
