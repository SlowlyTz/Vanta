import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUsersApi } from './admin-users.api.js';

vi.mock('./client.js', () => ({
  request: vi.fn()
}));

import { request } from './client.js';

describe('AdminUsersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue({});
  });

  it('listUsers requests GET /api/admin/users', () => {
    AdminUsersApi.listUsers();
    expect(request).toHaveBeenCalledWith('/api/admin/users');
  });

  it('listLibraries requests GET /api/admin/users/libraries', () => {
    AdminUsersApi.listLibraries();
    expect(request).toHaveBeenCalledWith('/api/admin/users/libraries');
  });

  it('renameUser sends a PATCH with the new name', () => {
    AdminUsersApi.renameUser('u1', 'bob');
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1', {
      method: 'PATCH',
      body: { name: 'bob' }
    });
  });

  it('setPassword sends a POST with the new password', () => {
    AdminUsersApi.setPassword('u1', 'secret');
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1/password', {
      method: 'POST',
      body: { newPassword: 'secret' }
    });
  });

  it('deleteUser sends a DELETE', () => {
    AdminUsersApi.deleteUser('u1');
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1', { method: 'DELETE' });
  });

  it('banUser sends a POST with reason and username', () => {
    AdminUsersApi.banUser('u1', 'Account geteilt', 'alice');
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1/ban', {
      method: 'POST',
      body: { reason: 'Account geteilt', username: 'alice' }
    });
  });

  it('unbanUser sends a DELETE to the ban endpoint', () => {
    AdminUsersApi.unbanUser('u1');
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1/ban', { method: 'DELETE' });
  });

  it('setLibraryAccess sends a PATCH with folder access', () => {
    AdminUsersApi.setLibraryAccess('u1', false, ['lib-1']);
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1/libraries', {
      method: 'PATCH',
      body: { enableAllFolders: false, enabledFolders: ['lib-1'] }
    });
  });

  it('setStreamLimit sends a PATCH with the new limit', () => {
    AdminUsersApi.setStreamLimit('u1', 2);
    expect(request).toHaveBeenCalledWith('/api/admin/users/u1/stream-limit', {
      method: 'PATCH',
      body: { maxConcurrentStreams: 2 }
    });
  });

  it('propagates a clean error message without exposing raw upstream details', async () => {
    const error = new Error('Nutzer konnte nicht umbenannt werden');
    error.status = 404;
    request.mockRejectedValue(error);

    await expect(AdminUsersApi.renameUser('u1', 'bob')).rejects.toMatchObject({
      message: 'Nutzer konnte nicht umbenannt werden',
      status: 404
    });
  });
});
