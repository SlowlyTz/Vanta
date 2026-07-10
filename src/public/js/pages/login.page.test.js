import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authStore } from '../store/auth.store.js';
import LoginPage from './login.page.js';

vi.mock('../store/auth.store.js', () => ({
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
});
