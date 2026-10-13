import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'k' }
}));

import { createHealthRouter } from '../../../src/server/routes/health.routes.js';
import { APP_VERSION } from '../../../src/public/js/shared/version.js';

const appWith = (options) => {
  const app = express();
  app.use('/api/health', createHealthRouter(options));
  return app;
};

describe('GET /api/health', () => {
  it('reports ok with the version when Jellyfin answers', async () => {
    const ping = vi.fn(async () => ({ ok: true }));
    const res = await request(appWith({ ping, getReader: () => ({}) })).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({ status: 'ok', version: APP_VERSION, checks: { jellyfin: { ok: true }, catalog: { ready: true } } });
  });

  it('answers 503 when Jellyfin is down and pings it at most every few seconds', async () => {
    let time = 0;
    const ping = vi.fn(async () => { throw new Error('down'); });
    const app = appWith({ ping, getReader: () => null, now: () => time });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { jellyfin: { ok: false }, catalog: { ready: false } } });

    await request(app).get('/api/health');
    expect(ping).toHaveBeenCalledTimes(1);
    time += 10_000;
    await request(app).get('/api/health');
    expect(ping).toHaveBeenCalledTimes(2);
  });
});
