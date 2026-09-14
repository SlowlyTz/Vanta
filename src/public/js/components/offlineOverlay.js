import { createElement } from '../utils/dom.js';

const SHOW_DELAY_MS = 1500;
const NETWORK_ERROR_EVENT = 'vanta:network-error';

const WIFI_OFF_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l20 20"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><path d="M5 12.5a10 10 0 0 1 5.2-2.7"></path><path d="M14.5 9.5A10 10 0 0 1 19 12.5"></path><path d="M1.5 8.5A15 15 0 0 1 7 5.6"></path><path d="M11.5 4.5a15 15 0 0 1 11 4"></path><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"></circle></svg>`;

// Full-screen "no connection" notice. Shown when the browser reports it is
// offline or a request fails at the network level, hidden again as soon as the
// connection is back. The show is delayed a little so a brief hiccup during
// playback does not flash the overlay.
export function mountOfflineOverlay({ fetchImpl = (...args) => window.fetch(...args) } = {}) {
  let showTimer = null;
  let checking = false;

  const status = createElement('p', { className: 'offline-status', 'aria-live': 'polite' });
  const retryButton = createElement('button', {
    type: 'button',
    className: 'btn-primary offline-retry',
    onClick: () => { checkConnection(); }
  }, 'Erneut versuchen');

  const icon = createElement('span', { className: 'offline-icon' });
  icon.innerHTML = WIFI_OFF_ICON;

  const overlay = createElement('div', {
    className: 'offline-overlay',
    role: 'alertdialog',
    'aria-modal': 'true',
    'aria-labelledby': 'offline-title',
    'aria-describedby': 'offline-text',
    hidden: true
  },
    createElement('div', { className: 'offline-card' },
      createElement('img', { className: 'offline-logo', src: '/assets/logo-vanta.png', alt: 'VANTA' }),
      icon,
      createElement('h2', { className: 'offline-title', id: 'offline-title' }, 'Kein Internet'),
      createElement('p', { className: 'offline-text', id: 'offline-text' },
        'VANTA braucht eine Verbindung zu deinem Server. Prüfe WLAN oder Mobilfunk und versuch es dann noch einmal.'),
      retryButton,
      status
    )
  );

  // `probe` decides whether a network error really means we are offline; the
  // browser's own offline flag needs no probe.
  const show = ({ probe = false } = {}) => {
    if (showTimer || !overlay.hidden) return;
    showTimer = window.setTimeout(async () => {
      showTimer = null;
      if (navigator.onLine === false) {
        overlay.hidden = false;
        return;
      }
      if (!probe) return;
      if (await isServerReachable()) return;
      overlay.hidden = false;
    }, SHOW_DELAY_MS);
  };

  const hide = () => {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    overlay.hidden = true;
    status.textContent = '';
  };

  const isServerReachable = async () => {
    try {
      const response = await fetchImpl('/', { method: 'HEAD', cache: 'no-store' });
      return Boolean(response && response.ok);
    } catch {
      return false;
    }
  };

  const checkConnection = async () => {
    if (checking) return;
    checking = true;
    retryButton.disabled = true;
    status.textContent = 'Verbindung wird geprüft…';
    if (await isServerReachable()) {
      hide();
    } else {
      status.textContent = 'Immer noch keine Verbindung.';
    }
    checking = false;
    retryButton.disabled = false;
  };

  const onOffline = () => show();
  const onOnline = () => hide();
  const onNetworkError = () => show({ probe: true });

  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  window.addEventListener(NETWORK_ERROR_EVENT, onNetworkError);

  document.body.appendChild(overlay);

  if (typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    overlay.hidden = false;
  }

  return () => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
    window.removeEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    hide();
    overlay.remove();
  };
}

export { NETWORK_ERROR_EVENT };
