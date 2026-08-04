import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../../../../src/public/js/api/auth.api.js';
import { createAdminToolsPanel } from '../../../../src/public/js/components/admin-tools/AdminToolsPanel.js';

vi.mock('../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));

// Die Admin-Verwaltung ist eine eigene Seite (#/admin, siehe
// src/public/js/pages/admin.page.js). Dieses Modul ist seit dem Umbau auf
// reine Sichtbarkeits-/Navigationslogik für die Kachel im
// Einstellungen-Dialog reduziert — kein Panel- oder Tool-Grid mehr.
describe('createAdminToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the "Admin tools" tile, with no grid or tool views', () => {
    const { adminOption } = createAdminToolsPanel({ onOpen: vi.fn() });

    expect(adminOption.querySelector('.settings-option')).toBeTruthy();
    expect(adminOption.querySelectorAll('.admin-tool-card')).toHaveLength(0);
    expect(adminOption.querySelectorAll('.admin-tools-grid')).toHaveLength(0);
  });

  it('shows the tile only for admin users', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: true } });
    const { adminOption, loadAdminVisibility } = createAdminToolsPanel({ onOpen: vi.fn() });

    await loadAdminVisibility();
    expect(adminOption.hidden).toBe(false);

    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    await loadAdminVisibility();
    expect(adminOption.hidden).toBe(true);
  });

  it('hides the tile when the visibility check fails', async () => {
    AuthApi.getCurrentUser.mockRejectedValue(new Error('network error'));
    const { adminOption, loadAdminVisibility } = createAdminToolsPanel({ onOpen: vi.fn() });

    await loadAdminVisibility();
    expect(adminOption.hidden).toBe(true);
  });

  it('calls onOpen only when the current user is confirmed to be an admin', async () => {
    const onOpen = vi.fn();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: true } });

    const { adminOption } = createAdminToolsPanel({ onOpen });
    adminOption.querySelector('.settings-option').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpen for a non-admin, even if the tile was somehow clicked', async () => {
    const onOpen = vi.fn();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });

    const { adminOption } = createAdminToolsPanel({ onOpen });
    adminOption.querySelector('.settings-option').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onOpen).not.toHaveBeenCalled();
  });
});
