import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { VAPID_SUBJECT: 'mailto:test@example.com' } }));

const { createPushService, loadVapidKeys, isValidSubscription, isKnownPushEndpoint, MAX_SUBSCRIPTIONS_PER_USER } = await import('../../../src/server/services/push.service.js');

const endpoint = (n) => `https://fcm.googleapis.com/fcm/send/${n}`;
const subscription = (n) => ({ endpoint: endpoint(n), keys: { p256dh: `p${n}`, auth: `a${n}` } });

describe('loadVapidKeys', () => {
  it('prefers .env, else keeps one generated pair', () => {
    expect(loadVapidKeys({ config: { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' } })).toEqual({ publicKey: 'pub', privateKey: 'priv' });

    const store = new Map();
    const settings = { get: k => store.get(k) ?? null, set: (k, v) => store.set(k, v) };
    const generate = vi.fn(() => ({ publicKey: 'gen-pub', privateKey: 'gen-priv' }));
    expect(loadVapidKeys({ settings, generate, config: {} })).toEqual({ publicKey: 'gen-pub', privateKey: 'gen-priv' });
    expect(loadVapidKeys({ settings, generate, config: {} }).publicKey).toBe('gen-pub');
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('PushService', () => {
  let sender;
  let service;

  beforeEach(() => {
    memory.exec('DELETE FROM push_subscriptions;');
    sender = { sendNotification: vi.fn(async () => ({ statusCode: 201 })) };
    service = createPushService({ sender, keys: { publicKey: 'pub', privateKey: 'priv' }, log: { warn: vi.fn() } });
  });

  it('accepts only https subscriptions with keys', () => {
    expect(isValidSubscription(subscription(1))).toBe(true);
    expect(isValidSubscription({ endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } })).toBe(false);
    expect(() => service.subscribe('u1', { endpoint: 'https://x' })).toThrow('Ungültiges Push-Abo');
  });

  it('sends to every device of a user with the VAPID details', async () => {
    service.subscribe('u1', subscription(1), 'Firefox');
    service.subscribe('u1', subscription(2));
    service.subscribe('u2', subscription(3));

    expect(await service.sendToUser('u1', { title: 'Hallo' })).toEqual({ sent: 2, failed: 0 });
    const [target, body, options] = sender.sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: endpoint(1), keys: { p256dh: 'p1', auth: 'a1' } });
    expect(JSON.parse(body)).toEqual({ title: 'Hallo' });
    expect(options.vapidDetails).toEqual({ subject: 'mailto:test@example.com', publicKey: 'pub', privateKey: 'priv' });
  });

  it('drops a subscription the push service no longer knows, or after five failures', async () => {
    service.subscribe('u1', subscription(1));
    service.subscribe('u1', subscription(2));
    sender.sendNotification.mockImplementation(async ({ endpoint }) => {
      throw Object.assign(new Error('x'), { statusCode: endpoint.endsWith('/1') ? 410 : 403 });
    });
    await service.sendToUser('u1', {});
    expect(service.deviceCount('u1')).toBe(1);
    for (let i = 0; i < 4; i++) await service.sendToUser('u1', {});
    expect(service.deviceCount('u1')).toBe(0);
  });

  it('moves a re-used endpoint to the new user and removes only own subscriptions', () => {
    service.subscribe('u1', subscription(1));
    service.subscribe('u2', subscription(1));
    expect(service.deviceCount('u1')).toBe(0);
    expect(service.unsubscribe('u1', endpoint(1))).toBe(false);
    expect(service.unsubscribe('u2', endpoint(1))).toBe(true);
  });

  it('accepts only the push services of the browsers', () => {
    expect(isKnownPushEndpoint('https://fcm.googleapis.com/fcm/send/x')).toBe(true);
    // Chrome's current FCM endpoints.
    expect(isKnownPushEndpoint('https://jmt17.google.com/fcm/send/x')).toBe(true);
    expect(isKnownPushEndpoint('https://google.com.evil.test/x')).toBe(false);
    expect(isKnownPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isKnownPushEndpoint('https://web.push.apple.com/x')).toBe(true);
    expect(isKnownPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
    expect(isKnownPushEndpoint('https://push.example/1')).toBe(false);
    expect(isKnownPushEndpoint('https://fcm.googleapis.com.evil.test/x')).toBe(false);
    expect(isKnownPushEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isKnownPushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isKnownPushEndpoint('https://127.0.0.1/x')).toBe(false);
    expect(() => service.subscribe('u1', { endpoint: 'https://intranet.local/x', keys: { p256dh: 'p', auth: 'a' } })).toThrow('Ungültiges Push-Abo');
  });

  it('keeps at most ten devices per user, replacing the one heard of longest ago', () => {
    for (let n = 1; n <= MAX_SUBSCRIPTIONS_PER_USER; n++) service.subscribe('u1', subscription(n));
    service.subscribe('u1', subscription(1));
    expect(service.deviceCount('u1')).toBe(MAX_SUBSCRIPTIONS_PER_USER);
    service.subscribe('u1', subscription(99));
    expect(service.deviceCount('u1')).toBe(MAX_SUBSCRIPTIONS_PER_USER);
    expect(memory.prepare('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?').get(endpoint(1))).toBeUndefined();
    expect(memory.prepare('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?').get(endpoint(99))).toBeTruthy();
  });

  it('keeps a subscription through push service trouble (429, 5xx, timeouts)', async () => {
    service.subscribe('u1', subscription(1));
    for (const failure of [{ statusCode: 429 }, { statusCode: 503 }, { code: 'ETIMEDOUT' }]) {
      sender.sendNotification.mockRejectedValue(Object.assign(new Error('x'), failure));
      for (let i = 0; i < 6; i++) await service.sendToUser('u1', {});
    }
    expect(service.deviceCount('u1')).toBe(1);
  });

  it('ends the pushes of a session that was signed out or ended', () => {
    service.subscribe('u1', subscription(1), '', 'session-a');
    service.subscribe('u1', subscription(2), '', 'session-b');
    service.subscribe('u1', subscription(3));
    expect(service.removeForSession('u2', 'session-a')).toBe(0);
    expect(service.removeForSession('u1', 'session-a')).toBe(1);
    expect(service.deviceCount('u1')).toBe(2);

    expect(service.rebind('u1', endpoint(2), 'session-c')).toBe(true);
    expect(service.rebind('u2', endpoint(2), 'session-x')).toBe(false);
    expect(service.pruneEndedSessions(new Set(['session-c']))).toBe(0);
    expect(service.pruneEndedSessions(new Set(['session-x']))).toBe(1);
    expect(service.deviceCount('u1')).toBe(1);
  });
});
