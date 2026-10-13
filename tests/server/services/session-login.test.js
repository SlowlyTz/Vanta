import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));
vi.mock('../../../src/server/services/known-users.service.js', () => ({ KnownUsersService: { remember: vi.fn() } }));

const { startUserSession } = await import('../../../src/server/services/session-login.js');
const { publicSessionId } = await import('../../../src/server/db/session-store.js');

const login = (userId) => ({ AccessToken: `tok-${userId}`, User: { Id: userId, Name: userId, Policy: {} } });

// A request whose session gets a new id on regenerate, like express-session.
const requestWith = (session) => {
  const req = { sessionID: 'old', session: { cookie: {}, ...session }, get: () => 'Firefox' };
  req.session.regenerate = (done) => {
    req.sessionID = 'new';
    req.session = { cookie: {} };
    done();
  };
  return req;
};

describe('startUserSession', () => {
  it('drops the push subscription of the account this device leaves', async () => {
    const push = { unsubscribe: vi.fn(), rebind: vi.fn() };
    const req = requestWith({ userId: 'u1', pushEndpoint: 'https://fcm.googleapis.com/fcm/send/1' });
    await startUserSession(req, login('u2'), 'device', { loadPush: async () => push });
    expect(push.unsubscribe).toHaveBeenCalledWith('u1', 'https://fcm.googleapis.com/fcm/send/1');
    expect(push.rebind).not.toHaveBeenCalled();
    expect(req.session.pushEndpoint).toBeUndefined();
    expect(req.session.userId).toBe('u2');
  });

  it('keeps it for the same account, bound to the new session', async () => {
    const push = { unsubscribe: vi.fn(), rebind: vi.fn(() => true) };
    const req = requestWith({ userId: 'u1', pushEndpoint: 'https://fcm.googleapis.com/fcm/send/1' });
    await startUserSession(req, login('u1'), 'device', { loadPush: async () => push });
    expect(push.rebind).toHaveBeenCalledWith('u1', 'https://fcm.googleapis.com/fcm/send/1', publicSessionId('new'));
    expect(req.session.pushEndpoint).toBe('https://fcm.googleapis.com/fcm/send/1');
  });

  it('does not touch push without a subscription', async () => {
    const loadPush = vi.fn();
    await startUserSession(requestWith({}), login('u1'), 'device', { loadPush });
    expect(loadPush).not.toHaveBeenCalled();
  });
});
