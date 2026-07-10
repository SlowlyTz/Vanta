import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../api/auth.api.js';
import { AdminUsersApi } from '../../api/admin-users.api.js';
import { createSettingsDialog } from './settingsDialog.js';

vi.mock('../../api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn().mockResolvedValue({ totalItems: 0 }) }
}));
vi.mock('../../api/requests.api.js', () => ({
  RequestsApi: { getOpenRequests: vi.fn() }
}));
vi.mock('../../api/admin-users.api.js', () => ({
  AdminUsersApi: { listUsers: vi.fn(), listLibraries: vi.fn() }
}));

describe('settingsDialog scroll lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    document.documentElement.classList.remove('settings-modal-open');
    document.body.classList.remove('settings-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    document.documentElement.classList.remove('settings-modal-open');
    document.body.classList.remove('settings-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
  });

  it('locks both html and body, fixing the body at the current scroll position, when opened', () => {
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    expect(document.documentElement.classList.contains('settings-modal-open')).toBe(true);
    expect(document.body.classList.contains('settings-modal-open')).toBe(true);
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-640px');

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('removes the lock classes and body styles, restoring the exact scroll position, when closed', () => {
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsOpen(false);

    expect(document.documentElement.classList.contains('settings-modal-open')).toBe(false);
    expect(document.body.classList.contains('settings-modal-open')).toBe(false);
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 900);

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('is a no-op when toggled to the same open state twice', () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    dialog.setSettingsOpen(true);
    document.body.style.top = '-999px';
    dialog.setSettingsOpen(true);

    expect(document.body.style.top).toBe('-999px');
  });
});

describe('settingsDialog single back button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [{
        id: 'u1', name: 'alice', isAdmin: false, isDisabled: false, isBanned: false, banReason: null,
        maxConcurrentStreams: 1, activeStreams: 0, enableAllFolders: true, enabledFolders: []
      }]
    });
    AdminUsersApi.listLibraries.mockResolvedValue({ libraries: [] });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    document.documentElement.classList.remove('settings-modal-open');
    document.body.classList.remove('settings-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
  });

  it('exposes exactly one back button in the whole dialog header', () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    expect(dialog.settingsDialog.querySelectorAll('[aria-label="Zurück"]')).toHaveLength(1);
    expect(dialog.settingsDialog.querySelectorAll('.admin-view-back-button')).toHaveLength(0);
  });

  it('steps back one level at a time from a user detail view to root settings', async () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    const backButton = dialog.settingsDialog.querySelector('[aria-label="Zurück"]');
    const usersCard = Array.from(dialog.settingsDialog.querySelectorAll('.admin-tool-card'))
      .find(c => c.querySelector('.admin-tool-card-title').textContent === 'Nutzerverwaltung');

    dialog.setSettingsView('admin');
    usersCard.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const usersView = Array.from(dialog.settingsDialog.querySelectorAll('.admin-tool-view'))
      .find(v => v.querySelector('.admin-users-view'));
    usersView.querySelector('.admin-user-action-btn').click();

    expect(usersView.querySelector('.admin-users-detail-slot').hidden).toBe(false);
    expect(dialog.settingsDialog.dataset.view).toBe('admin');

    backButton.click();
    expect(usersView.querySelector('.admin-users-detail-slot').hidden).toBe(true);
    expect(usersView.querySelector('.admin-users-list-view').hidden).toBe(false);
    expect(dialog.settingsDialog.dataset.view).toBe('admin');

    backButton.click();
    expect(dialog.settingsDialog.querySelector('.admin-tools-panel').hidden).toBe(false);
    expect(dialog.settingsDialog.dataset.view).toBe('admin');

    backButton.click();
    expect(dialog.settingsDialog.dataset.view).toBe('root');
  });
});
