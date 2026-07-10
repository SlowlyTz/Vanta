import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JellyfinAdminUsersService } from './admin-users.service.js';

vi.mock('./client.js', () => ({
  jellyfinJson: vi.fn(),
  jellyfinFetch: vi.fn()
}));

import { jellyfinJson, jellyfinFetch } from './client.js';

describe('JellyfinAdminUsersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('fetches /Users with the admin token', async () => {
      jellyfinJson.mockResolvedValue([{ Id: '1', Name: 'alice' }]);

      const result = await JellyfinAdminUsersService.listUsers('admin-token');

      expect(jellyfinJson).toHaveBeenCalledWith('/Users', { token: 'admin-token' });
      expect(result).toEqual([{ Id: '1', Name: 'alice' }]);
    });

    it('returns an empty array when Jellyfin responds with a non-array payload', async () => {
      jellyfinJson.mockResolvedValue(null);
      expect(await JellyfinAdminUsersService.listUsers('admin-token')).toEqual([]);
    });
  });

  describe('listLibraries', () => {
    it('fetches /Library/VirtualFolders with the admin token', async () => {
      jellyfinJson.mockResolvedValue([{ ItemId: 'lib-1', Name: 'Movies' }]);

      const result = await JellyfinAdminUsersService.listLibraries('admin-token');

      expect(jellyfinJson).toHaveBeenCalledWith('/Library/VirtualFolders', { token: 'admin-token' });
      expect(result).toEqual([{ ItemId: 'lib-1', Name: 'Movies' }]);
    });
  });

  describe('getUser', () => {
    it('fetches a single user by id', async () => {
      jellyfinJson.mockResolvedValue({ Id: 'user-1', Name: 'alice' });

      const result = await JellyfinAdminUsersService.getUser('user-1', 'admin-token');

      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user-1', { token: 'admin-token' });
      expect(result).toEqual({ Id: 'user-1', Name: 'alice' });
    });
  });

  describe('updateUserName', () => {
    it('loads the user, updates Name, and posts the full user object back', async () => {
      jellyfinJson.mockResolvedValue({ Id: 'user-1', Name: 'alice', Policy: { IsAdministrator: false } });
      jellyfinFetch.mockResolvedValue({ ok: true });

      const result = await JellyfinAdminUsersService.updateUserName('user-1', 'admin-token', 'alice2');

      expect(jellyfinFetch).toHaveBeenCalledWith('/Users/user-1', {
        token: 'admin-token',
        method: 'POST',
        body: { Id: 'user-1', Name: 'alice2', Policy: { IsAdministrator: false } }
      });
      expect(result.Name).toBe('alice2');
    });

    it('rejects an empty name without calling Jellyfin', async () => {
      await expect(JellyfinAdminUsersService.updateUserName('user-1', 'admin-token', '   '))
        .rejects.toThrow(/name/i);

      expect(jellyfinJson).not.toHaveBeenCalled();
      expect(jellyfinFetch).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('sends a DELETE request for the user', async () => {
      jellyfinFetch.mockResolvedValue({ ok: true });

      const result = await JellyfinAdminUsersService.deleteUser('user-1', 'admin-token');

      expect(jellyfinFetch).toHaveBeenCalledWith('/Users/user-1', {
        token: 'admin-token',
        method: 'DELETE'
      });
      expect(result).toBe(true);
    });
  });

  describe('setPassword', () => {
    it('sets a new password via the query-based endpoint without ResetPassword', async () => {
      jellyfinFetch.mockResolvedValue({ ok: true });

      await JellyfinAdminUsersService.setPassword('user-1', 'admin-token', 'new-secret');

      expect(jellyfinFetch).toHaveBeenCalledWith('/Users/Password', {
        token: 'admin-token',
        method: 'POST',
        query: { userId: 'user-1' },
        body: { CurrentPw: '', NewPw: 'new-secret' }
      });
      expect(jellyfinFetch).toHaveBeenCalledTimes(1);
    });

    it('never sends ResetPassword: true', async () => {
      jellyfinFetch.mockResolvedValue({ ok: true });

      await JellyfinAdminUsersService.setPassword('user-1', 'admin-token', 'new-secret');

      const [, options] = jellyfinFetch.mock.calls[0];
      expect(options.body).not.toHaveProperty('ResetPassword');
    });

    it('falls back to the legacy per-user endpoint when the query-based one is missing (404/405)', async () => {
      const notFound = new Error('Not Found');
      notFound.status = 404;
      jellyfinFetch.mockRejectedValueOnce(notFound).mockResolvedValueOnce({ ok: true });

      await JellyfinAdminUsersService.setPassword('user-1', 'admin-token', 'new-secret');

      expect(jellyfinFetch).toHaveBeenNthCalledWith(1, '/Users/Password', {
        token: 'admin-token',
        method: 'POST',
        query: { userId: 'user-1' },
        body: { CurrentPw: '', NewPw: 'new-secret' }
      });
      expect(jellyfinFetch).toHaveBeenNthCalledWith(2, '/Users/user-1/Password', {
        token: 'admin-token',
        method: 'POST',
        body: { CurrentPw: '', NewPw: 'new-secret' }
      });
    });

    it('falls back on 405 Method Not Allowed as well', async () => {
      const notAllowed = new Error('Method Not Allowed');
      notAllowed.status = 405;
      jellyfinFetch.mockRejectedValueOnce(notAllowed).mockResolvedValueOnce({ ok: true });

      await JellyfinAdminUsersService.setPassword('user-1', 'admin-token', 'new-secret');

      expect(jellyfinFetch).toHaveBeenCalledTimes(2);
    });

    it('propagates other upstream errors without falling back', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.status = 500;
      jellyfinFetch.mockRejectedValue(serverError);

      await expect(JellyfinAdminUsersService.setPassword('user-1', 'admin-token', 'new-secret'))
        .rejects.toMatchObject({ status: 500 });
      expect(jellyfinFetch).toHaveBeenCalledTimes(1);
    });

    it('rejects a missing password without calling Jellyfin', async () => {
      await expect(JellyfinAdminUsersService.setPassword('user-1', 'admin-token', ''))
        .rejects.toThrow(/password/i);
      expect(jellyfinFetch).not.toHaveBeenCalled();
    });
  });

  describe('updatePolicy', () => {
    it('merges the patch into the existing policy and preserves other fields', async () => {
      jellyfinJson.mockResolvedValue({
        Id: 'user-1',
        Policy: {
          IsAdministrator: true,
          EnableAllFolders: true,
          EnabledFolders: [],
          SomeOtherFlag: 'keep-me'
        }
      });
      jellyfinFetch.mockResolvedValue({ ok: true });

      const result = await JellyfinAdminUsersService.updatePolicy('user-1', 'admin-token', {
        EnableAllFolders: false,
        EnabledFolders: ['lib-1', 'lib-2']
      });

      expect(jellyfinFetch).toHaveBeenCalledWith('/Users/user-1/Policy', {
        token: 'admin-token',
        method: 'POST',
        body: {
          IsAdministrator: true,
          EnableAllFolders: false,
          EnabledFolders: ['lib-1', 'lib-2'],
          SomeOtherFlag: 'keep-me'
        }
      });
      expect(result.IsAdministrator).toBe(true);
      expect(result.SomeOtherFlag).toBe('keep-me');
    });

    it('handles a user with no existing policy', async () => {
      jellyfinJson.mockResolvedValue({ Id: 'user-1' });
      jellyfinFetch.mockResolvedValue({ ok: true });

      await JellyfinAdminUsersService.updatePolicy('user-1', 'admin-token', { EnableAllFolders: true });

      expect(jellyfinFetch).toHaveBeenCalledWith('/Users/user-1/Policy', {
        token: 'admin-token',
        method: 'POST',
        body: { EnableAllFolders: true }
      });
    });
  });

  describe('error propagation', () => {
    it('propagates status codes and messages from Jellyfin failures', async () => {
      const upstreamError = new Error('Users/user-1 failed: Not Found');
      upstreamError.status = 404;
      jellyfinJson.mockRejectedValue(upstreamError);

      await expect(JellyfinAdminUsersService.getUser('user-1', 'admin-token')).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining('Not Found')
      });
    });
  });
});
