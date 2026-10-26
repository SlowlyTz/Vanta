// Login page: the password form with lockout countdown, and on a TV the
// phone-code pairing first; also the desktop/TV view toggle.
import { createElement } from '../utils/dom.js';
import { authStore } from '../store/auth.store.js';
import { REDIRECT_AFTER_LOGIN_KEY } from '../utils/auth-redirect.js';
import { formatClock } from '../shared/time.js';
import { takeSessionNotice } from '../utils/sessionNotice.js';
import { createTvPairing } from './login/tvPairing.js';
import { setTvChoice } from '../utils/tvMode.js';
import { confirmDialog } from '../components/confirmDialog.js';

const LOGIN_BUTTON_IDLE_TEXT = 'Anmelden';
const LOGIN_BUTTON_BUSY_TEXT = 'Anmeldung läuft…';
const GENERIC_LOGIN_ERROR = 'Login fehlgeschlagen. Bitte überprüfe deine Daten.';
const PASSWORD_SHOW_LABEL = 'Passwort anzeigen';
const PASSWORD_HIDE_LABEL = 'Passwort verbergen';
const REMEMBER_HINT_TEXT = 'Du bleibst auf diesem Gerät 14 Tage angemeldet, auch wenn du den Browser schließt. Auf geteilten Geräten besser nicht aktivieren.';

const INFO_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><circle cx="12" cy="8" r="0.6" fill="currentColor"></circle></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;

const EYE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"></path><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.4-.9"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>`;

export default function LoginPage(params, pageScope) {
  const showLoginError = (message, reason) => {
    errorBanner.innerHTML = '';
    errorBanner.appendChild(createElement('p', { className: 'login-error-message' }, message));
    if (reason) {
      errorBanner.appendChild(createElement('p', { className: 'login-error-reason' }, reason));
    }
    errorBanner.classList.remove('hidden');
  };

  const hideLoginError = () => {
    errorBanner.classList.add('hidden');
    errorBanner.innerHTML = '';
  };

  const resetLoginButton = () => {
    loginButton.disabled = false;
    loginButton.removeAttribute('aria-busy');
    loginButton.textContent = LOGIN_BUTTON_IDLE_TEXT;
  };

  // After too many wrong passwords the server refuses logins for a while; the
  // button stays off and counts down until the next try is allowed.
  let lockTimer = null;
  const stopLockCountdown = () => {
    if (lockTimer) window.clearInterval(lockTimer);
    lockTimer = null;
  };

  const startLockCountdown = (message, retryAfterMs) => {
    stopLockCountdown();
    const unlockAt = Date.now() + retryAfterMs;
    const countdown = createElement('p', { className: 'login-error-reason' });

    const tick = () => {
      const left = unlockAt - Date.now();
      if (left <= 0 || (lockTimer && !container.isConnected)) {
        stopLockCountdown();
        if (container.isConnected) {
          hideLoginError();
          resetLoginButton();
        }
        return;
      }
      loginButton.disabled = true;
      loginButton.textContent = `Gesperrt · ${formatClock(Math.ceil(left / 1000))}`;
      countdown.textContent = `Nächster Versuch in ${formatClock(Math.ceil(left / 1000))}`;
    };

    errorBanner.innerHTML = '';
    errorBanner.appendChild(createElement('p', { className: 'login-error-message' }, message));
    errorBanner.appendChild(countdown);
    errorBanner.classList.remove('hidden');
    loginButton.removeAttribute('aria-busy');
    tick();
    lockTimer = window.setInterval(tick, 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
      showLoginError('Bitte gib deinen Benutzernamen ein.');
      usernameInput.focus();
      return;
    }

    hideLoginError();
    if (passwordInput.type !== 'password') passwordToggle.click();
    loginButton.disabled = true;
    loginButton.setAttribute('aria-busy', 'true');
    loginButton.textContent = LOGIN_BUTTON_BUSY_TEXT;

    try {
      await authStore.login(username, password, rememberCheckbox.checked);
      let redirectHash = '#/home';
      try {
        redirectHash = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || redirectHash;
        sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      } catch {
        // ignore
      }
      window.location.hash = redirectHash;
    } catch (error) {
      const message = error.message || GENERIC_LOGIN_ERROR;
      if (error.status === 429 && Number(error.retryAfterMs) > 0) {
        startLockCountdown(message, Number(error.retryAfterMs));
        return;
      }
      showLoginError(message, error.reason);
      resetLoginButton();
    }
  };

  // name/autocomplete pairs and a real form action are what password
  // managers key on to offer and save credentials.
  const usernameInput = createElement('input', {
    type: 'text',
    id: 'login-username',
    name: 'username',
    className: 'form-input',
    placeholder: 'Benutzername',
    required: true,
    autocomplete: 'username',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    inputmode: 'text',
    enterkeyhint: 'next',
    dataset: { autofocus: '' }
  });

  const passwordInput = createElement('input', {
    type: 'password',
    id: 'login-password',
    name: 'password',
    className: 'form-input',
    placeholder: 'Passwort',
    autocomplete: 'current-password',
    enterkeyhint: 'go'
  });

  const passwordToggle = createElement('button', {
    type: 'button',
    className: 'form-input-toggle',
    'aria-label': PASSWORD_SHOW_LABEL,
    'aria-pressed': 'false',
    'aria-controls': 'login-password',
    onClick: () => {
      const reveal = passwordInput.type === 'password';
      passwordInput.type = reveal ? 'text' : 'password';
      passwordToggle.setAttribute('aria-pressed', String(reveal));
      passwordToggle.setAttribute('aria-label', reveal ? PASSWORD_HIDE_LABEL : PASSWORD_SHOW_LABEL);
      passwordToggle.innerHTML = reveal ? EYE_OFF_ICON : EYE_ICON;
    }
  });
  passwordToggle.innerHTML = EYE_ICON;

  const rememberCheckbox = createElement('input', {
    type: 'checkbox',
    id: 'login-remember',
    name: 'rememberMe',
    className: 'login-checkbox-input'
  });

  const checkmark = createElement('span', { className: 'login-checkbox-box', 'aria-hidden': 'true' });
  checkmark.innerHTML = CHECK_ICON;

  // The hint opens on hover/focus (desktop) and on tap (touch); Escape or a
  // click elsewhere closes the tapped state again.
  const hintBubble = createElement('div', {
    className: 'login-hint-bubble',
    id: 'login-remember-hint',
    role: 'tooltip'
  }, REMEMBER_HINT_TEXT);

  const hintTrigger = createElement('button', {
    type: 'button',
    className: 'login-hint-trigger',
    'aria-label': 'Was bedeutet „Angemeldet bleiben“?',
    'aria-describedby': 'login-remember-hint',
    'aria-expanded': 'false',
    onClick: (event) => {
      event.stopPropagation();
      setHintOpen(!hint.classList.contains('open'));
    }
  });
  hintTrigger.innerHTML = INFO_ICON;

  const hint = createElement('div', { className: 'login-hint' }, hintTrigger, hintBubble);

  // The document listeners only exist while the bubble is open, so nothing
  // is left behind when the router swaps the page.
  const closeHintOnOutsideClick = (event) => {
    if (!hint.contains(event.target)) setHintOpen(false);
  };
  const closeHintOnEscape = (event) => {
    if (event.key === 'Escape') setHintOpen(false);
  };

  function setHintOpen(open) {
    if (hint.classList.contains('open') === open) return;
    hint.classList.toggle('open', open);
    hintTrigger.setAttribute('aria-expanded', String(open));
    if (open) {
      document.addEventListener('click', closeHintOnOutsideClick);
      document.addEventListener('keydown', closeHintOnEscape);
    } else {
      document.removeEventListener('click', closeHintOnOutsideClick);
      document.removeEventListener('keydown', closeHintOnEscape);
    }
  }

  const rememberRow = createElement('div', { className: 'login-remember' },
    createElement('label', { className: 'login-checkbox', for: 'login-remember' },
      rememberCheckbox,
      checkmark,
      createElement('span', { className: 'login-checkbox-label' }, 'Angemeldet bleiben')
    ),
    hint
  );

  const loginButton = createElement('button', {
    type: 'submit',
    className: 'btn-primary btn-login'
  }, LOGIN_BUTTON_IDLE_TEXT);

  const errorBanner = createElement('div', { className: 'login-error hidden', role: 'alert' });

  // novalidate: VANTA's own German message instead of the browser's tooltip.
  const loginForm = createElement('form', {
    className: 'login-form',
    method: 'post',
    action: '/api/auth/login',
    novalidate: true,
    onSubmit: handleLogin
  },
    errorBanner,
    createElement('div', { className: 'form-group' },
      createElement('label', { for: 'login-username' }, 'Benutzername'),
      usernameInput
    ),
    createElement('div', { className: 'form-group' },
      createElement('label', { for: 'login-password' }, 'Passwort'),
      createElement('div', { className: 'form-input-wrap' },
        passwordInput,
        passwordToggle
      )
    ),
    rememberRow,
    loginButton
  );

  const backdropImage = createElement('img', {
    className: 'login-visual-img',
    src: '/assets/login-backdrop.webp',
    alt: '',
    decoding: 'async',
    fetchpriority: 'high'
  });

  const container = createElement('div', { className: 'login-page' },
    createViewToggle(),
    createElement('section', { className: 'login-panel' },
      createElement('div', { className: 'login-panel-inner' },
        createElement('header', { className: 'login-header' },
          createElement('img', {
            className: 'login-logo',
            src: '/assets/logo-vanta.png',
            alt: 'VANTA'
          }),
          createElement('h1', { className: 'login-title' }, 'Willkommen zurück'),
          createElement('p', { className: 'login-subtitle' }, 'Melde dich mit deinem Jellyfin-Konto an')
        ),
        loginForm
      )
    ),
    createElement('aside', { className: 'login-visual', 'aria-hidden': 'true' },
      backdropImage,
      createElement('div', { className: 'login-visual-overlay' })
    )
  );

  // A session the server ended (a ban) left its reason for this page.
  const notice = takeSessionNotice();
  if (notice) showLoginError(notice.message, notice.reason);

  // TV: the phone code first, the form with the on-screen keyboard on request.
  if (document.documentElement.classList.contains('tv-mode')) {
    container.classList.add('is-tv-login');
    loginForm.classList.add('is-hidden-for-pairing');
    const pairing = createTvPairing({
      scope: pageScope,
      onUsePassword: () => {
        pairing.stop();
        pairing.element.remove();
        loginForm.classList.remove('is-hidden-for-pairing');
        loginForm.appendChild(backToCode);
        // The field has the focus first, so closing the keyboard returns to
        // it; VANTA's keyboard, not the TV's (which a focused field would open).
        usernameInput.focus({ preventScroll: true });
        import('../components/tv/OnScreenKeyboard.js').then(module => module.openKeyboardFor(usernameInput));
      }
    });
    // Back to the phone code: the page anew, with a fresh code.
    const backToCode = createElement('button', {
      type: 'button',
      className: 'btn-secondary login-back-to-code',
      onClick: () => window.location.reload()
    }, 'Mit Code anmelden');
    loginForm.before(pairing.element);
  }

  return container;
}

const MONITOR_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
const TV_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="2"/><path d="m8 2 4 3 4-3M7 21h10"/></svg>';

// Top right: the other view for this device, in case VANTA guessed wrong
// (a desktop that once got ?tv=1, a TV it did not recognise). It reloads,
// without a ?tv= in the address, which would set the old view again.
export function createViewToggle({ win = window, doc = document } = {}) {
  const tv = doc.documentElement.classList.contains('tv-mode');
  const label = tv ? 'Normale Ansicht' : 'TV-Ansicht';
  const button = createElement('button', {
    type: 'button',
    className: 'login-view-toggle',
    'aria-label': tv ? 'Zur normalen Ansicht wechseln' : 'Zur TV-Ansicht wechseln',
    onClick: async () => {
      // On a TV the other view is hard to leave again with a remote.
      if (tv && !(await confirmDialog({ title: 'Normale Ansicht?', message: 'Sie ist für Maus und Touch gedacht und mit der Fernbedienung schwer zu bedienen.', confirmLabel: 'Wechseln', cancelLabel: 'Abbrechen', focusCancel: true }))) return;
      setTvChoice(tv ? 'off' : 'on');
      const params = new URLSearchParams(win.location.search);
      params.delete('tv');
      const search = params.toString();
      // replaceState drops ?tv= without loading anything, so reload explicitly.
      win.history.replaceState(win.history.state, '', `${win.location.pathname}${search ? `?${search}` : ''}${win.location.hash}`);
      win.location.reload();
    }
  });
  button.innerHTML = tv ? MONITOR_ICON : TV_ICON;
  button.appendChild(createElement('span', {}, label));
  return button;
}

