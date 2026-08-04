import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../../../src/public/js/api/auth.api.js';
import { createSettingsDialog } from '../../../../src/public/js/components/navbar/settingsDialog.js';

vi.mock('../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn().mockResolvedValue({ totalItems: 0 }) }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

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
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
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
  });

  it('returns to the root settings view from the password view', () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsView('password');

    expect(dialog.settingsDialog.dataset.view).toBe('password');

    dialog.settingsDialog.querySelector('[aria-label="Zurück"]').click();

    expect(dialog.settingsDialog.dataset.view).toBe('root');
  });
});

// Die Admin-Verwaltung ist keine Ansicht im Dialog mehr (siehe plan.md, A2):
// Die Kachel "Admin tools" schließt den Dialog und navigiert stattdessen auf
// #/admin, genau wie die bestehende "Profil"-Option.
describe('settingsDialog admin tile navigates to #/admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    window.location.hash = '';
  });

  afterEach(() => {
    document.documentElement.classList.remove('settings-modal-open');
    document.body.classList.remove('settings-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    window.location.hash = '';
  });

  it('closes the dialog and navigates to #/admin when an admin clicks the tile', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: true } });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    dialog.adminOption.querySelector('.settings-option').click();
    await flush();

    expect(dialog.isOpen()).toBe(false);
    expect(window.location.hash).toBe('#/admin');
  });

  it('does nothing for non-admins: the dialog stays open and the hash is untouched', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    window.location.hash = '#/home';

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    dialog.adminOption.querySelector('.settings-option').click();
    await flush();

    expect(dialog.isOpen()).toBe(true);
    expect(window.location.hash).toBe('#/home');
  });

  it('does not render an admin panel in the dialog tree anymore', () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    expect(dialog.settingsDialog.querySelector('.settings-panel-admin')).toBeNull();
    expect(dialog.settingsDialog.querySelector('.admin-tools-grid')).toBeNull();
  });
});
