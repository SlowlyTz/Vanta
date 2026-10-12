import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/config/session.js', () => ({ sessionStore: {} }));
vi.mock('../../../src/server/services/jellyfin/auth.service.js', () => ({ AuthService: {} }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: {} }));
const { createSessionsRouter } = await import('../../../src/server/routes/sessions.routes.js');
const { publicSessionId } = await import('../../../src/server/db/session-store.js');

const appWith = (store, auth = { logout: vi.fn(async () => {}) }) => {
  const appSockets = { endSession: vi.fn() };
  const push = { removeForSession: vi.fn() };
  const app = express();
  app.use((req, res, next) => { req.sessionID = 'mine'; req.session = { userId: 'u1', accessToken: 't' }; next(); });
  app.use('/api/sessions', createSessionsRouter({ store, auth, appSockets, loadPush: async () => push }));
  return { app, auth, appSockets, push };
};

describe('/api/sessions', () => {
  it('lists the devices with this one first, without session ids', async () => {
    const store = { listByUserId: vi.fn(async () => [
      { id: 'x', sid: 'other', loginAt: 9 },
      { id: publicSessionId('mine'), sid: 'mine', loginAt: 1 }
    ]) };
    const res = await request(appWith(store).app).get('/api/sessions');
    expect(res.body.sessions).toEqual([
      { id: publicSessionId('mine'), loginAt: 1, current: true },
      { id: 'x', loginAt: 9, current: false }
    ]);
  });

  it('signs out another device: its Jellyfin token, open app and pushes', async () => {
    const store = { destroyOne: vi.fn(async () => ({ accessToken: 'tok' })) };
    const { app, auth, appSockets, push } = appWith(store);
    const res = await request(app).delete('/api/sessions/x');
    expect(res.body).toEqual({ ended: true });
    expect(store.destroyOne).toHaveBeenCalledWith('u1', 'x');
    expect(auth.logout).toHaveBeenCalledWith('tok');
    expect(appSockets.endSession).toHaveBeenCalledWith('u1', 'x', expect.objectContaining({ code: 'SIGNED_OUT' }));
    expect(push.removeForSession).toHaveBeenCalledWith('u1', 'x');
  });

  it('refuses this device and unknown ones', async () => {
    const store = { destroyOne: vi.fn(async () => null) };
    expect((await request(appWith(store).app).delete(`/api/sessions/${publicSessionId('mine')}`)).status).toBe(400);
    expect((await request(appWith(store).app).delete('/api/sessions/nope')).status).toBe(404);
  });
});

describe('/api/sessions sign out all others', () => {
  it('ends every session but this one in one pass', async () => {
    const store = {
      destroyOthers: vi.fn(async () => [{ id: 'x', session: { accessToken: 'tok-x' } }, { id: 'y', session: { accessToken: 'tok-y' } }])
    };
    const { app, auth, appSockets, push } = appWith(store);
    const res = await request(app).delete('/api/sessions');
    expect(res.body).toEqual({ ended: 2 });
    expect(store.destroyOthers).toHaveBeenCalledWith('u1', { keep: publicSessionId('mine') });
    expect(auth.logout.mock.calls.map(call => call[0])).toEqual(['tok-x', 'tok-y']);
    expect(appSockets.endSession.mock.calls.map(call => call[1])).toEqual(['x', 'y']);
    expect(push.removeForSession.mock.calls.map(call => call[1])).toEqual(['x', 'y']);
  });
});
