import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/config/session.js', () => ({ sessionStore: {} }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: {} }));
vi.mock('../../../src/server/realtime/watch-party.socket.js', () => ({ watchPartySocketHub: {} }));

import { revokeUserAccess, accountDeletedPayload } from '../../../src/server/services/session-revocation.service.js';

const setup = () => ({
  store: { destroyByUserId: vi.fn(async () => [{ accessToken: 't1' }, { accessToken: 't2' }, {}]) },
  auth: { logout: vi.fn(async () => {}) },
  appSockets: { endUserSessions: vi.fn() },
  partySockets: { closeAllUserConnections: vi.fn() },
  push: { removeAllFor: vi.fn() },
  log: { error: vi.fn(), warn: vi.fn() }
});

const withPush = (deps) => ({ ...deps, loadPush: async () => deps.push });

describe('revokeUserAccess', () => {
  it('ends the sessions, revokes their tokens and closes the sockets with the reason', async () => {
    const deps = setup();
    const result = await revokeUserAccess('u1', { reason: 'Account geteilt' }, withPush(deps));

    expect(deps.store.destroyByUserId).toHaveBeenCalledWith('u1');
    expect(deps.auth.logout.mock.calls.map(call => call[0])).toEqual(['t1', 't2']);
    expect(deps.appSockets.endUserSessions).toHaveBeenCalledWith('u1', {
      error: 'Dein Konto wurde gesperrt.',
      code: 'BANNED',
      reason: 'Account geteilt'
    });
    expect(deps.partySockets.closeAllUserConnections).toHaveBeenCalledWith('u1');
    expect(deps.push.removeAllFor).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ sessions: 3 });
  });

  it('still closes the sockets when Jellyfin or the store fail', async () => {
    const deps = setup();
    deps.store.destroyByUserId.mockRejectedValue(new Error('disk'));
    await revokeUserAccess('u1', null, withPush(deps));
    expect(deps.appSockets.endUserSessions).toHaveBeenCalled();

    const again = setup();
    again.auth.logout.mockRejectedValue(new Error('down'));
    await revokeUserAccess('u1', null, withPush(again));
    expect(again.partySockets.closeAllUserConnections).toHaveBeenCalledWith('u1');
  });

  it('tells a deleted account why instead of naming a ban', async () => {
    const deps = setup();
    await revokeUserAccess('u1', null, { ...withPush(deps), payload: accountDeletedPayload() });
    expect(deps.appSockets.endUserSessions).toHaveBeenCalledWith('u1', {
      error: 'Dein Konto wurde gelöscht.',
      code: 'ACCOUNT_DELETED',
      reason: null
    });
    expect(deps.store.destroyByUserId).toHaveBeenCalledWith('u1');
  });
});
