import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/public/js/api/auth.api.js', () => ({ AuthApi: { getCurrentUser: vi.fn() } }));

const { AuthApi } = await import('../../../src/public/js/api/auth.api.js');
const { authStore } = await import('../../../src/public/js/store/auth.store.js');

describe('authStore.checkAuth', () => {
  it('answers true with a user and false when the server says no session', async () => {
    AuthApi.getCurrentUser.mockResolvedValueOnce({ user: { id: 'u1' } });
    expect(await authStore.checkAuth()).toBe(true);

    AuthApi.getCurrentUser.mockRejectedValueOnce(Object.assign(new Error('Nicht angemeldet'), { status: 401 }));
    expect(await authStore.checkAuth()).toBe(false);
    expect(authStore.getState().user).toBeNull();
  });

  it('answers null and keeps the user when the server cannot be reached', async () => {
    AuthApi.getCurrentUser.mockResolvedValueOnce({ user: { id: 'u1' } });
    await authStore.checkAuth();

    AuthApi.getCurrentUser.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await authStore.checkAuth()).toBeNull();
    expect(authStore.getState().user).toEqual({ id: 'u1' });
  });
});
