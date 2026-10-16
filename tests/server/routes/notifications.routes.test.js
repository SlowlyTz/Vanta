import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { VAPID_SUBJECT: 'mailto:test@example.com' } }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: { sendToUser: vi.fn() } }));

const { createNotificationsRouter, TEST_PUSH_INTERVAL_MS } = await import('../../../src/server/routes/notifications.routes.js');
const { publicSessionId } = await import('../../../src/server/db/session-store.js');

// `jellyfinAdmin`: what Jellyfin says now (default: what the session says).
const appWith = ({ notify, push, isAdmin = false, jellyfinAdmin = isAdmin, session = {}, now }) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.sessionID = 'sid-1'; req.session = Object.assign(session, { userId: 'u1', accessToken: 't', isAdmin }); next(); });
  app.use('/api/notifications', createNotificationsRouter({ notify, push, now, adminCheck: async () => jellyfinAdmin }));
  return app;
};

describe('/api/notifications', () => {
  let push;
  let notify;
  beforeEach(() => {
    memory.exec('DELETE FROM notification_preferences;');
    push = {
      publicKey: () => 'pub',
      subscribe: vi.fn(),
      unsubscribe: vi.fn(() => true),
      deviceCount: () => 2,
      sendToUser: vi.fn(async () => ({ sent: 1, failed: 0 }))
    };
    notify = { feed: vi.fn(() => ({ items: [], unread: 0 })), markRead: vi.fn(() => 0) };
  });

  it('answers the preferences with the device count, admin kinds only for admins', async () => {
    const res = await request(appWith({ notify, push })).get('/api/notifications/preferences');
    expect(res.body.devices).toBe(2);
    expect(res.body.kinds.some(k => k.kind === 'admin_new_request')).toBe(false);
    const admin = await request(appWith({ notify, push, isAdmin: true })).get('/api/notifications/preferences');
    expect(admin.body.kinds.some(k => k.kind === 'admin_new_request')).toBe(true);
  });

  it('no admin kinds for a session from before a demotion in Jellyfin', async () => {
    const res = await request(appWith({ notify, push, isAdmin: true, jellyfinAdmin: false })).get('/api/notifications/preferences');
    expect(res.body.kinds.some(k => k.kind.startsWith('admin_'))).toBe(false);
  });

  it('saves preferences', async () => {
    const res = await request(appWith({ notify, push })).put('/api/notifications/preferences').send({ push: false });
    expect(res.body.push).toBe(false);
  });

  it('subscribes this device and remembers it in the session', async () => {
    const session = {};
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'p', auth: 'a' } };
    const res = await request(appWith({ notify, push, session })).post('/api/notifications/subscriptions').send({ subscription });
    expect(res.status).toBe(201);
    expect(push.subscribe).toHaveBeenCalledWith('u1', subscription, undefined, publicSessionId('sid-1'));
    expect(session.pushEndpoint).toBe('https://fcm.googleapis.com/fcm/send/1');

    await request(appWith({ notify, push, session })).delete('/api/notifications/subscriptions').send({});
    expect(push.unsubscribe).toHaveBeenCalledWith('u1', 'https://fcm.googleapis.com/fcm/send/1');
    expect(session.pushEndpoint).toBeUndefined();
  });

  it('refuses a broken subscription', async () => {
    push.subscribe.mockImplementation(() => { throw Object.assign(new Error('Ungültiges Push-Abo'), { status: 400 }); });
    const res = await request(appWith({ notify, push })).post('/api/notifications/subscriptions').send({});
    expect(res.status).toBe(400);
  });

  it('sends a test push, and says so when no device took it', async () => {
    expect((await request(appWith({ notify, push })).post('/api/notifications/test')).body).toEqual({ sent: 1, failed: 0 });
    push.sendToUser.mockResolvedValue({ sent: 0, failed: 0 });
    expect((await request(appWith({ notify, push })).post('/api/notifications/test')).status).toBe(409);
  });

  it('names why the push service refused, and allows one retry right after', async () => {
    let time = 1_000;
    const app = appWith({ notify, push, now: () => time });
    push.sendToUser.mockResolvedValue({ sent: 0, failed: 1, errors: [{ status: 403, host: 'fcm.googleapis.com' }] });
    const refused = await request(app).post('/api/notifications/test');
    expect(refused.status).toBe(409);
    expect(refused.body.error).toContain('fcm.googleapis.com: 403');
    push.sendToUser.mockResolvedValue({ sent: 1, failed: 0 });
    expect((await request(app).post('/api/notifications/test?retry=1')).status).toBe(200);
    // Not a way around the wait: a second retry waits again.
    expect((await request(app).post('/api/notifications/test?retry=1')).status).toBe(429);
  });

  it('says when no device of the account is signed up for push', async () => {
    push.sendToUser.mockResolvedValue({ sent: 0, failed: 0, errors: [] });
    const res = await request(appWith({ notify, push })).post('/api/notifications/test');
    expect(res.body.error).toBe('Für dieses Konto ist kein Gerät für Push angemeldet.');
  });

  it('sends at most one test push per user in a while', async () => {
    let time = 1_000;
    const app = appWith({ notify, push, now: () => time });
    expect((await request(app).post('/api/notifications/test')).status).toBe(200);
    const again = await request(app).post('/api/notifications/test');
    expect(again.status).toBe(429);
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
    time += TEST_PUSH_INTERVAL_MS;
    expect((await request(app).post('/api/notifications/test')).status).toBe(200);
  });

  it('serves the feed and marks read', async () => {
    await request(appWith({ notify, push })).get('/api/notifications/feed');
    await request(appWith({ notify, push })).post('/api/notifications/read').send({ id: 4 });
    await request(appWith({ notify, push })).post('/api/notifications/read').send({});
    expect(notify.markRead.mock.calls).toEqual([['u1', 4], ['u1', null]]);
  });

  it('hands out the public key', async () => {
    expect((await request(appWith({ notify, push })).get('/api/notifications/push-key')).body).toEqual({ publicKey: 'pub' });
  });
});
