import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import catalogRoutes from '../../../../src/server/routes/admin/catalog.routes.js';

vi.mock('../../../../src/server/services/jellyfin/auth.service.js', () => ({
  AuthService: { isUserAdmin: vi.fn() }
}));

const catalog = vi.hoisted(() => ({
  sync: {
    getStatus: vi.fn(),
    isRunning: vi.fn(() => false),
    runUpdate: vi.fn(() => Promise.resolve({ type: 'update' })),
    runFull: vi.fn(() => Promise.resolve({ type: 'full' }))
  },
  scheduler: {
    getPlan: vi.fn(),
    reload: vi.fn()
  },
  settings: {
    update: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/catalog/index.js', () => ({
  getCatalog: vi.fn(async () => catalog)
}));

import { AuthService } from '../../../../src/server/services/jellyfin/auth.service.js';

function createApp({ authenticated = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = authenticated ? { userId: 'admin-1', accessToken: 'token' } : {};
    next();
  });
  app.use('/', catalogRoutes);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

const STATUS = { running: false, itemCount: 462, libraryCount: 6, lastRun: { type: 'full' }, lastSuccess: { type: 'full' } };
const PLAN = { started: true, updateIntervalMinutes: 10, fullSyncTime: '03:00', nextUpdateAt: 1, nextFullAt: 2 };

describe('Admin catalog routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.isUserAdmin.mockResolvedValue(true);
    catalog.sync.getStatus.mockReturnValue(STATUS);
    catalog.sync.isRunning.mockReturnValue(false);
    catalog.scheduler.getPlan.mockReturnValue(PLAN);
  });

  it('rejects unauthenticated and non-admin callers', async () => {
    expect((await request(createApp({ authenticated: false })).get('/')).status).toBe(401);

    AuthService.isUserAdmin.mockResolvedValue(false);
    expect((await request(createApp()).get('/')).status).toBe(403);
  });

  it('returns the sync status together with the schedule', async () => {
    const res = await request(createApp()).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...STATUS, plan: PLAN });
  });

  it('stores valid settings and re-arms the scheduler', async () => {
    catalog.settings.update.mockReturnValue({ value: { updateIntervalMinutes: 15, fullSyncTime: '04:00' } });

    const res = await request(createApp()).put('/settings').send({ updateIntervalMinutes: 15, fullSyncTime: '04:00' });

    expect(res.status).toBe(200);
    expect(catalog.settings.update).toHaveBeenCalledWith({ updateIntervalMinutes: 15, fullSyncTime: '04:00' });
    expect(catalog.scheduler.reload).toHaveBeenCalledTimes(1);
    expect(res.body.plan).toEqual(PLAN);
  });

  it('answers 400 with the validation message and leaves the scheduler alone', async () => {
    catalog.settings.update.mockReturnValue({ error: 'Das Intervall muss zwischen 1 und 60 Minuten liegen' });

    const res = await request(createApp()).put('/settings').send({ updateIntervalMinutes: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/zwischen 1 und 60/);
    expect(catalog.scheduler.reload).not.toHaveBeenCalled();
  });

  it('starts an update run in the background and answers 202', async () => {
    const res = await request(createApp()).post('/sync/update');

    expect(res.status).toBe(202);
    expect(res.body.started).toBe(true);
    expect(catalog.sync.runUpdate).toHaveBeenCalledTimes(1);
  });

  it('starts a full run in the background and answers 202', async () => {
    const res = await request(createApp()).post('/sync/full');

    expect(res.status).toBe(202);
    expect(catalog.sync.runFull).toHaveBeenCalledTimes(1);
  });

  it('reports started=false when a run is already in progress', async () => {
    catalog.sync.isRunning.mockReturnValue(true);

    const res = await request(createApp()).post('/sync/full');

    expect(res.status).toBe(202);
    expect(res.body.started).toBe(false);
  });
});
