import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../../../src/public/js/api/auth.api.js';
import { createSettingsDialog } from '../../../../src/public/js/components/navbar/settingsDialog.js';
import { closeAllModals } from '../../../../src/public/js/utils/modal.js';
import { APP_VERSION } from '../../../../src/public/js/shared/version.js';

vi.mock('../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn().mockResolvedValue({ totalItems: 0 }) }
}));
vi.mock('../../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: {
    getPreferences: vi.fn(async () => ({ push: true, kinds: [{ kind: 'request_update', push: true, inApp: true }], devices: 0 })),
    savePreferences: vi.fn(async patch => ({ push: true, kinds: [{ kind: 'request_update', push: false, inApp: true }] }))
  }
}));
vi.mock('../../../../src/public/js/api/sessions.api.js', () => ({
  SessionsApi: { list: vi.fn(async () => ({ sessions: [{ id: 'a', current: true, userAgent: 'Firefox/128.0 (X11; Linux)' }, { id: 'b', current: false }] })), end: vi.fn(async () => ({})) }
}));
vi.mock('../../../../src/public/js/api/preferences.api.js', () => ({
  PreferencesApi: { get: vi.fn(), update: vi.fn(async patch => patch) }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('settingsDialog scroll lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    closeAllModals();
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
  });

  it('locks both html and body, fixing the body at the current scroll position, when opened', () => {
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);

    expect(document.documentElement.classList.contains('modal-open')).toBe(true);
    expect(document.body.classList.contains('modal-open')).toBe(true);
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-640px');

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('removes the lock classes and body styles, restoring the exact scroll position, when closed', () => {
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });

    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsOpen(false);

    expect(document.documentElement.classList.contains('modal-open')).toBe(false);
    expect(document.body.classList.contains('modal-open')).toBe(false);
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
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
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
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
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

describe('settingsDialog version', () => {
  it('shows the app release to every user', () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    expect(dialog.element.querySelector('.settings-version').textContent).toBe(`VANTA · Version ${APP_VERSION}`);
  });
});

describe('settingsDialog hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    closeAllModals();
    document.body.style.position = '';
    document.body.style.top = '';
  });

  const flushAll = () => new Promise(resolve => setTimeout(resolve, 0));

  it('groups the areas and shows a status on each row', async () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    await flushAll();

    const titles = [...dialog.settingsDialog.querySelectorAll('.settings-panel-root .settings-section-title')].map(el => el.textContent);
    expect(titles).toEqual(['Konto', 'App', 'Verwaltung']);
    const statuses = Object.fromEntries([...dialog.settingsDialog.querySelectorAll('.settings-panel-root .settings-option')]
      .map(row => [row.querySelector('.settings-option-label').textContent, row.querySelector('.settings-option-status')?.textContent]));
    expect(statuses.Geräte).toBe('2 Geräte');
    expect(statuses.Wiedergabe).toBe('Autoplay an');
    expect(statuses.Benachrichtigungen).toBe('Aus');
  });

  it('opens an area as its own page with a back button', async () => {
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsView('devices');
    await flushAll();

    expect(dialog.settingsDialog.querySelector('.settings-dialog-title').textContent).toBe('Geräte');
    const panel = dialog.settingsDialog.querySelector('.settings-panel-devices');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Firefox auf Linux');
    expect(panel.querySelectorAll('.settings-device-row .settings-inline-button')).toHaveLength(1);
    expect(panel.textContent).toContain('Alle anderen abmelden');
    dialog.settingsDialog.querySelector('[aria-label="Zurück"]').click();
    expect(dialog.settingsDialog.dataset.view).toBe('root');
  });

  it('follows a link out of an area to its page instead of bouncing back (Code eingeben)', async () => {
    window.location.hash = '#/home';
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    await flushAll();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      window.setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate')), 0);
    });
    const devicesRow = [...dialog.settingsDialog.querySelectorAll('.settings-option')]
      .find(row => row.querySelector('.settings-option-label')?.textContent === 'Geräte');
    devicesRow.click();
    await flushAll();

    dialog.settingsDialog.querySelector('a[href="#/connect"]').click();
    expect(back).toHaveBeenCalledTimes(1);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(window.location.hash).toBe('#/connect');
    expect(dialog.settingsBackdrop?.classList?.contains('open') ?? false).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(window.location.hash).toBe('#/connect');
    back.mockRestore();
    window.location.hash = '';
  });

  it('saves a notification choice per kind', async () => {
    const { NotificationsApi } = await import('../../../../src/public/js/api/notifications.api.js');
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsView('notifications');
    await flushAll();

    const pushSwitch = dialog.settingsDialog.querySelector('.settings-kind-row .settings-switch-input');
    pushSwitch.checked = false;
    pushSwitch.dispatchEvent(new Event('change'));
    expect(NotificationsApi.savePreferences).toHaveBeenCalledWith({ kinds: [{ kind: 'request_update', push: false }] });
  });

  it('keeps playback settings for the account', async () => {
    const { PreferencesApi } = await import('../../../../src/public/js/api/preferences.api.js');
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    dialog.setSettingsOpen(true);
    dialog.setSettingsView('playback');

    const option = [...dialog.settingsDialog.querySelectorAll('.settings-panel-playback .settings-segmented-option')].find(button => button.textContent === '720p');
    option.click();
    await flushAll();
    expect(PreferencesApi.update).toHaveBeenCalledWith({ defaultQuality: '720p' });
  });
});

describe('settingsDialog on a TV', () => {
  afterEach(() => {
    closeAllModals();
    document.documentElement.classList.remove('tv-mode');
  });

  it('shows an area beside the list as soon as its row has the focus', () => {
    document.documentElement.classList.add('tv-mode');
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {} }));
    const dialog = createSettingsDialog({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    document.body.appendChild(dialog.element);
    dialog.setSettingsOpen(true);
    expect(dialog.settingsDialog.dataset.view).toBe('playback');
    const appearance = [...dialog.settingsDialog.querySelectorAll('.settings-option')].find(row => /Darstellung/.test(row.textContent));
    appearance.focus();
    expect(dialog.settingsDialog.dataset.view).toBe('appearance');
    // Push and the password are not offered on a TV.
    const hidden = [...dialog.settingsDialog.querySelectorAll('.settings-option')].filter(row => row.hidden).map(row => row.textContent);
    expect(hidden.join(' ')).toMatch(/Benachrichtigungen/);
    expect(hidden.join(' ')).toMatch(/Passwort/);
    dialog.element.remove();
  });
});
