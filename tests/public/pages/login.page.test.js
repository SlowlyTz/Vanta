import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authStore } from '../../../src/public/js/store/auth.store.js';
import LoginPage from '../../../src/public/js/pages/login.page.js';

vi.mock('../../../src/public/js/store/auth.store.js', () => ({
  authStore: { login: vi.fn() }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.location.hash = '#/login';
  });

  it('disables the login button and marks it busy while the form and logo stay visible', async () => {
    let resolveLogin;
    authStore.login.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));

    const container = LoginPage();
    container.querySelector('#login-username').value = 'alice';
    container.querySelector('.login-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const button = container.querySelector('.btn-login');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toBe('Anmeldung läuft…');
    expect(container.querySelector('.login-logo')).toBeTruthy();
    expect(container.querySelector('.login-form')).toBeTruthy();

    resolveLogin();
    await flush();

    expect(window.location.hash).toBe('#/home');
  });

  it('restores the idle button state after a failed login', async () => {
    authStore.login.mockRejectedValue(new Error('Falsches Passwort'));

    const container = LoginPage();
    container.querySelector('#login-username').value = 'alice';
    container.querySelector('.login-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const button = container.querySelector('.btn-login');
    expect(button.disabled).toBe(true);

    await flush();

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.textContent).toBe('Anmelden');
  });

  it('shows a visible ban notice with the reason when the account is locked', async () => {
    const error = new Error('Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.');
    error.status = 403;
    error.reason = 'Account geteilt';
    authStore.login.mockRejectedValue(error);

    const container = LoginPage();
    container.querySelector('#login-username').value = 'alice';
    container.querySelector('.login-form').dispatchEvent(new Event('submit', { cancelable: true }));

    await flush();

    const banner = container.querySelector('.login-error');
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(banner.querySelector('.login-error-message').textContent).toBe('Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.');
    expect(banner.querySelector('.login-error-reason').textContent).toBe('Account geteilt');
  });

  it('hides the ban notice again once a new login attempt starts', async () => {
    const error = new Error('Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.');
    error.reason = 'Account geteilt';
    authStore.login.mockRejectedValueOnce(error);

    const container = LoginPage();
    container.querySelector('#login-username').value = 'alice';
    container.querySelector('.login-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();

    expect(container.querySelector('.login-error').classList.contains('hidden')).toBe(false);

    let resolveLogin;
    authStore.login.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    container.querySelector('.login-form').dispatchEvent(new Event('submit', { cancelable: true }));

    expect(container.querySelector('.login-error').classList.contains('hidden')).toBe(true);
    resolveLogin();
    await flush();
  });
});
