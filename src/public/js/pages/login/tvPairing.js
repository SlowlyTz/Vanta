import { createElement } from '../../utils/dom.js';
import { AuthApi } from '../../api/auth.api.js';
import { authStore } from '../../store/auth.store.js';

const POLL_MS = 2000;

// The TV's way in: a code (and a QR code) to confirm on a phone that is
// signed in. Asks every two seconds; a new code when the old one ran out.
export function createTvPairing({ onUsePassword, scope }) {
  const codeEl = createElement('strong', { className: 'tv-pairing-code' }, '······');
  const qrEl = createElement('div', { className: 'tv-pairing-qr', 'aria-hidden': 'true' });
  const statusEl = createElement('p', { className: 'tv-pairing-status', role: 'status' }, 'Code wird erstellt …');
  const passwordButton = createElement('button', {
    type: 'button',
    className: 'btn-secondary tv-pairing-password',
    'data-tv-autofocus': '',
    onClick: () => onUsePassword?.()
  }, 'Mit Benutzername anmelden');

  const element = createElement('section', { className: 'tv-pairing' },
    createElement('h2', { className: 'tv-pairing-title' }, 'Mit dem Handy anmelden'),
    createElement('p', { className: 'tv-pairing-hint' }, 'Öffne VANTA auf deinem Handy, Einstellungen → Geräte → „Fernseher verbinden“, und gib diesen Code ein. Oder scanne den QR-Code.'),
    createElement('div', { className: 'tv-pairing-body' }, qrEl, codeEl),
    statusEl,
    passwordButton
  );

  let timer = null;
  let stopped = false;
  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
  };
  scope?.onLeave?.(stop);

  const formatCode = code => `${code.slice(0, 3)} ${code.slice(3)}`;

  async function start() {
    if (stopped) return;
    try {
      const { code, expiresAt, qrSvg } = await AuthApi.startPairing();
      codeEl.textContent = formatCode(code);
      qrEl.innerHTML = qrSvg || '';
      statusEl.textContent = 'Warte auf die Bestätigung am Handy …';
      poll(expiresAt);
    } catch (error) {
      statusEl.textContent = error.message || 'Der Code konnte nicht erstellt werden.';
      codeEl.textContent = '––– –––';
      if (error.code !== 'QUICK_CONNECT_DISABLED') timer = window.setTimeout(start, 10_000);
    }
  }

  function poll(expiresAt) {
    timer = window.setTimeout(async () => {
      if (stopped) return;
      try {
        const result = await AuthApi.pairingStatus();
        if (result.state === 'done') {
          stop();
          authStore.setUser(result.user);
          window.location.hash = '#/home';
          return;
        }
        if (result.state === 'expired' || Date.now() > expiresAt) {
          start();
          return;
        }
      } catch (error) {
        statusEl.textContent = error.message || 'Anmeldung fehlgeschlagen.';
        if (error.code === 'BANNED') return stop();
      }
      poll(expiresAt);
    }, POLL_MS);
  }

  start();
  return { element, stop };
}
