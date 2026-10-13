import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', VAPID_SUBJECT: 'mailto:test@example.com' } }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: { sendToUser: vi.fn() } }));

const { createNotifyService, readPreferences, writePreferences, MAX_PER_USER, NOTIFY_BATCH } = await import('../../../src/server/services/notify.service.js');

describe('notification preferences', () => {
  beforeEach(() => memory.exec('DELETE FROM notification_preferences;'));

  it('starts from the defaults of each kind, admin kinds only for admins', () => {
    const user = readPreferences('u1');
    expect(user.push).toBe(true);
    expect(user.kinds.find(k => k.kind === 'request_update')).toEqual({ kind: 'request_update', push: true, inApp: true });
    expect(user.kinds.find(k => k.kind === 'new_content')).toEqual({ kind: 'new_content', push: false, inApp: false });
    expect(user.kinds.some(k => k.kind === 'admin_new_request')).toBe(false);
    expect(readPreferences('a1', { isAdmin: true }).kinds.some(k => k.kind === 'admin_new_request')).toBe(true);
  });

  it('stores changes per kind and the main switch, ignoring unknown and admin kinds', () => {
    const prefs = writePreferences('u1', {
      push: false,
      kinds: [{ kind: 'new_content', push: true }, { kind: 'admin_new_request', push: false }, { kind: 'bogus', push: true }]
    });
    expect(prefs.push).toBe(false);
    expect(prefs.kinds.find(k => k.kind === 'new_content')).toEqual({ kind: 'new_content', push: true, inApp: false });
    expect(readPreferences('u1', { isAdmin: true }).kinds.find(k => k.kind === 'admin_new_request').push).toBe(true);
  });
});

describe('NotifyService', () => {
  let push;
  let sockets;
  let service;
  let time;

  beforeEach(() => {
    memory.exec('DELETE FROM notification_preferences; DELETE FROM notifications;');
    time = 1_000;
    push = { sendToUser: vi.fn(async () => ({ sent: 1, failed: 0 })) };
    sockets = { sendToUser: vi.fn() };
    service = createNotifyService({ push, sockets, now: () => time, log: { warn: vi.fn() } });
  });

  it('keeps the entry, pushes and tells the open apps', async () => {
    const [result] = await service.notify({ userIds: ['u1'], kind: 'request_update', title: 'Anfrage angenommen', body: 'Dune', url: '/#/requests', imageItemId: 'm1' });
    expect(result).toEqual({ userId: 'u1', inApp: true, pushed: 1 });
    expect(push.sendToUser).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Anfrage angenommen', url: '/#/requests', tag: 'request_update' }));
    expect(sockets.sendToUser).toHaveBeenCalledWith('u1', { type: 'NOTIFICATIONS_CHANGED' });
    // Open apps of a browser without a push service show it themselves.
    expect(sockets.sendToUser).toHaveBeenCalledWith('u1', { type: 'NOTIFICATION_PUSH', notification: expect.objectContaining({ title: 'Anfrage angenommen', body: 'Dune', url: '/#/requests', tag: 'request_update' }) });
    expect(service.feed('u1')).toMatchObject({ unread: 1, items: [{ title: 'Anfrage angenommen', read: false, imageItemId: 'm1' }] });
  });

  it('respects what the user switched off', async () => {
    writePreferences('u1', { push: false });
    writePreferences('u2', { kinds: [{ kind: 'request_update', inApp: false }] });
    await service.notify({ userIds: ['u1', 'u2', 'u2'], kind: 'request_update', title: 't', body: 'b' });
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
    expect(push.sendToUser).toHaveBeenCalledWith('u2', expect.anything());
    expect(service.feed('u1').items).toHaveLength(1);
    expect(service.feed('u2').items).toHaveLength(0);
  });

  it('does not send kinds that are off by default', async () => {
    await service.notify({ userIds: ['u1'], kind: 'new_content', title: 't', body: 'b' });
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(service.feed('u1').items).toHaveLength(0);
  });

  it('never throws into the action that caused it', async () => {
    push.sendToUser.mockRejectedValue(new Error('push down'));
    const [result] = await service.notify({ userIds: ['u1'], kind: 'request_update', title: 't', body: 'b' });
    expect(result.error).toBe('push down');
  });

  it('marks read, one or all, and forgets old entries', async () => {
    await service.notify({ userIds: ['u1'], kind: 'request_update', title: 'a', body: 'b' });
    time = 2_000;
    await service.notify({ userIds: ['u1'], kind: 'report_update', title: 'c', body: 'd' });
    const [newest, oldest] = service.feed('u1').items;
    expect(newest.title).toBe('c');
    expect(service.markRead('u1', oldest.id)).toBe(1);
    expect(service.markRead('u1')).toBe(0);

    time = 1_000 + 91 * 24 * 60 * 60 * 1000;
    expect(service.prune()).toBe(2);
  });

  it('keeps only the newest entries of a user', async () => {
    for (let i = 0; i < MAX_PER_USER + 3; i++) {
      time = 1_000 + i;
      await service.notify({ userIds: ['u1'], kind: 'request_update', title: `n${i}`, body: 'b' });
    }
    await service.notify({ userIds: ['u2'], kind: 'request_update', title: 'other', body: 'b' });
    expect(memory.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?').get('u1').n).toBe(MAX_PER_USER);
    expect(memory.prepare("SELECT COUNT(*) AS n FROM notifications WHERE title = 'n0'").get().n).toBe(0);
    expect(service.feed('u1').items[0].title).toBe(`n${MAX_PER_USER + 2}`);
  });

  it('reaches many users a batch at a time', async () => {
    let open = 0;
    let most = 0;
    push.sendToUser.mockImplementation(async () => {
      open += 1;
      most = Math.max(most, open);
      await new Promise(resolve => setTimeout(resolve, 1));
      open -= 1;
      return { sent: 1, failed: 0 };
    });
    const userIds = Array.from({ length: NOTIFY_BATCH * 2 + 5 }, (_, n) => `user-${n}`);
    const results = await service.notify({ userIds, kind: 'announcement', title: 't', body: 'b' });
    expect(results).toHaveLength(userIds.length);
    expect(results.every(result => result.pushed === 1)).toBe(true);
    expect(most).toBeLessThanOrEqual(NOTIFY_BATCH);
  });

  it('refuses an unknown kind', async () => {
    await expect(service.notify({ userIds: ['u1'], kind: 'spam', title: 't', body: 'b' })).rejects.toThrow('Unknown notification kind');
  });
});
