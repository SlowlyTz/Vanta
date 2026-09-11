import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_API_KEY: 'server-key', JELLYFIN_BASE_URL: 'http://jellyfin.test' }
}));

const sync = vi.hoisted(() => ({
  runUpdate: vi.fn(),
  runFull: vi.fn()
}));

vi.mock('../../../src/server/services/catalog/index.js', () => ({
  getCatalog: vi.fn(async () => ({ sync }))
}));

import internalRoutes from '../../../src/server/routes/internal.routes.js';

function createApp({ remoteAddress = '127.0.0.1' } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    Object.defineProperty(req.socket, 'remoteAddress', { value: remoteAddress, configurable: true });
    next();
  });
  app.use('/', internalRoutes);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

const RECORD = { type: 'update', added: 2, updated: 0, removed: 0, durationMs: 400, error: null, library: { movies: 1, series: 1, episodes: 3 } };

describe('Internal catalog refresh route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sync.runUpdate.mockResolvedValue(RECORD);
    sync.runFull.mockResolvedValue({ ...RECORD, type: 'full' });
  });

  it('refuses callers that are not on this machine, even with the right key', async () => {
    const res = await request(createApp({ remoteAddress: '10.0.0.5' }))
      .post('/catalog/refresh').set('X-Vanta-Key', 'server-key').send({});

    expect(res.status).toBe(403);
    expect(sync.runUpdate).not.toHaveBeenCalled();
  });

  it('refuses a wrong or missing key', async () => {
    expect((await request(createApp()).post('/catalog/refresh').send({})).status).toBe(401);
    expect((await request(createApp()).post('/catalog/refresh').set('X-Vanta-Key', 'nope').send({})).status).toBe(401);
    expect(sync.runUpdate).not.toHaveBeenCalled();
  });

  it('runs an update by default and returns the finished record', async () => {
    const res = await request(createApp()).post('/catalog/refresh').set('X-Vanta-Key', 'server-key').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(RECORD);
    expect(sync.runUpdate).toHaveBeenCalledTimes(1);
    expect(sync.runFull).not.toHaveBeenCalled();
  });

  it('runs a full sync when asked', async () => {
    const res = await request(createApp()).post('/catalog/refresh').set('X-Vanta-Key', 'server-key').send({ full: true });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('full');
    expect(sync.runFull).toHaveBeenCalledTimes(1);
  });

  it('accepts the IPv6 loopback and the mapped IPv4 form', async () => {
    for (const address of ['::1', '::ffff:127.0.0.1']) {
      const res = await request(createApp({ remoteAddress: address })).post('/catalog/refresh').set('X-Vanta-Key', 'server-key').send({});
      expect(res.status).toBe(200);
    }
  });

  it('answers 502 when the run itself failed', async () => {
    sync.runUpdate.mockResolvedValue({ ...RECORD, error: 'jellyfin down' });

    const res = await request(createApp()).post('/catalog/refresh').set('X-Vanta-Key', 'server-key').send({});

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('jellyfin down');
  });
});
