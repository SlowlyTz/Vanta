import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { pairingInfo: vi.fn(), confirmPairing: vi.fn(), startPairing: vi.fn(), pairingStatus: vi.fn() }
}));
vi.mock('../../../src/public/js/store/auth.store.js', () => ({
  authStore: { getState: () => ({ user: { name: 'alice' } }), setUser: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));

import { AuthApi } from '../../../src/public/js/api/auth.api.js';
import { authStore } from '../../../src/public/js/store/auth.store.js';
import ConnectPage from '../../../src/public/js/pages/connect.page.js';
import { createTvPairing } from '../../../src/public/js/pages/login/tvPairing.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ConnectPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks to sign the waiting TV in and confirms the code from the QR link', async () => {
    window.location.hash = '#/connect?code=123456';
    AuthApi.pairingInfo.mockResolvedValue({ userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) SamsungBrowser/4.0 TV Safari/537.36' });
    AuthApi.confirmPairing.mockResolvedValue({ confirmed: true });
    const page = ConnectPage();
    await flush();
    expect(page.textContent).toContain('Fernseher anmelden als alice?');
    expect(page.textContent).toContain('Samsung TV');
    [...page.querySelectorAll('button')].find(button => button.textContent === 'Ja, anmelden').click();
    await flush();
    expect(AuthApi.confirmPairing).toHaveBeenCalledWith('123456');
    expect(page.textContent).toContain('Der Fernseher meldet sich jetzt an');
  });

  it('shows when the code was made, warns about another network and re-enables the button after an error', async () => {
    window.location.hash = '#/connect?code=123456';
    AuthApi.pairingInfo.mockResolvedValue({ userAgent: 'Mozilla/5.0', createdAt: Date.now() - 2 * 60_000, sameNetwork: false });
    AuthApi.confirmPairing.mockRejectedValue(new Error('Code abgelaufen'));
    const page = ConnectPage();
    await flush();
    expect(page.textContent).toContain('Code erstellt vor 2 Min.');
    expect(page.textContent).toContain('Dieser Fernseher ist nicht in deinem Netzwerk.');
    const confirm = [...page.querySelectorAll('button')].find(button => button.textContent === 'Ja, anmelden');
    confirm.click();
    expect(confirm.disabled).toBe(true);
    await flush();
    expect(confirm.disabled).toBe(false);
  });

  it('does not warn when the TV is in the same network', async () => {
    window.location.hash = '#/connect?code=123456';
    AuthApi.pairingInfo.mockResolvedValue({ userAgent: 'Mozilla/5.0', sameNetwork: true });
    const page = ConnectPage();
    await flush();
    expect(page.querySelector('.connect-warning')).toBeNull();
  });

  it('wants six digits', async () => {
    window.location.hash = '#/connect';
    const page = ConnectPage();
    page.querySelector('input').value = '12';
    page.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(page.textContent).toContain('sechs Ziffern');
    expect(AuthApi.pairingInfo).not.toHaveBeenCalled();
  });
});

describe('createTvPairing', () => {
  it('shows the code and signs in once the phone confirmed', async () => {
    vi.useFakeTimers();
    try {
      AuthApi.startPairing.mockResolvedValue({ code: '482913', expiresAt: Date.now() + 300_000, qrSvg: '<svg></svg>' });
      AuthApi.pairingStatus.mockResolvedValueOnce({ state: 'waiting' }).mockResolvedValueOnce({ state: 'done', user: { id: 'u1', name: 'alice' } });
      const pairing = createTvPairing({ onUsePassword: vi.fn() });
      await vi.advanceTimersByTimeAsync(0);
      expect(pairing.element.querySelector('.tv-pairing-code').textContent).toBe('482 913');
      expect(pairing.element.querySelector('.tv-pairing-qr svg')).toBeTruthy();
      await vi.advanceTimersByTimeAsync(4100);
      expect(authStore.setUser).toHaveBeenCalledWith({ id: 'u1', name: 'alice' });
      expect(window.location.hash).toBe('#/home');
    } finally {
      vi.useRealTimers();
    }
  });
});
