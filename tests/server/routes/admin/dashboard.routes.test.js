import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../../src/server/services/admin-dashboard.service.js', () => ({ AdminDashboard: {} }));
vi.mock('../../../../src/server/services/notify.service.js', () => ({ NotifyService: {} }));
vi.mock('../../../../src/server/services/user-directory.service.js', () => ({ UserDirectory: {} }));
vi.mock('../../../../src/server/middleware/auth.middleware.js', () => ({
  requireAuth: (req, res, next) => next(),
  requireFreshAdmin: (req, res, next) => (req.headers['x-admin'] ? next() : res.status(403).json({ error: 'Forbidden' }))
}));

const { createDashboardRouter } = await import('../../../../src/server/routes/admin/dashboard.routes.js');

const appWith = (deps) => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/dashboard', createDashboardRouter(deps));
  return app;
};

describe('/api/admin/dashboard', () => {
  it('is for admins only', async () => {
    const res = await request(appWith({ dashboard: { read: vi.fn() } })).get('/api/admin/dashboard');
    expect(res.status).toBe(403);
  });

  it('answers the dashboard', async () => {
    const res = await request(appWith({ dashboard: { read: vi.fn(async () => ({ work: { requests: 2 } })) } })).get('/api/admin/dashboard').set('x-admin', '1');
    expect(res.body).toEqual({ work: { requests: 2 } });
  });

  it('sends a message to everyone', async () => {
    const notify = { notify: vi.fn(async ({ userIds }) => userIds.map(userId => ({ userId, pushed: 1 }))) };
    const directory = { all: vi.fn(async () => [{ id: 'u1' }, { id: 'u2' }]) };
    const res = await request(appWith({ notify, directory })).post('/api/admin/dashboard/announce').set('x-admin', '1').send({ title: 'Wartung', body: 'Heute Abend kurz offline.' });
    expect(res.body).toEqual({ recipients: 2, pushed: 2 });
    expect(notify.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'announcement', title: 'Wartung', userIds: ['u1', 'u2'] }));
  });

  it('refuses an empty or too long message', async () => {
    const app = appWith({ notify: { notify: vi.fn() }, directory: { all: vi.fn() } });
    expect((await request(app).post('/api/admin/dashboard/announce').set('x-admin', '1').send({ title: '', body: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/admin/dashboard/announce').set('x-admin', '1').send({ title: 'x', body: 'y'.repeat(301) })).status).toBe(400);
  });
});
