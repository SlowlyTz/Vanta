import { createElement } from '../utils/dom.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { REDIRECT_AFTER_LOGIN_KEY } from '../utils/auth-redirect.js';

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

export default function LoginPage() {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
      appStore.showToast('Bitte Benutzernamen eingeben', 'error');
      return;
    }

    hideLoginError();
    loginButton.disabled = true;
    loginButton.setAttribute('aria-busy', 'true');
    loginButton.textContent = LOGIN_BUTTON_BUSY_TEXT;

    try {
      await authStore.login(username, password, rememberCheckbox.checked);
      appStore.showToast('Erfolgreich angemeldet!', 'success');
      let redirectHash = '#/home';
      try {
        redirectHash = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || redirectHash;
        sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      } catch {
        // ignore
      }
      window.location.hash = redirectHash;
    } catch (error) {
      console.error(error);
      const message = error.message || GENERIC_LOGIN_ERROR;
      showLoginError(message, error.reason);
      appStore.showToast(message, 'error');
      loginButton.disabled = false;
      loginButton.removeAttribute('aria-busy');
      loginButton.textContent = LOGIN_BUTTON_IDLE_TEXT;
    }
  };

  const usernameInput = createElement('input', {
    type: 'text',
    id: 'login-username',
    className: 'form-input',
    placeholder: 'Benutzername',
    required: true,
    autocomplete: 'username',
    dataset: { autofocus: '' }
  });

  const passwordInput = createElement('input', {
    type: 'password',
    id: 'login-password',
    className: 'form-input',
    placeholder: 'Passwort',
    autocomplete: 'current-password'
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

  const loginForm = createElement('form', {
    className: 'login-form',
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

  return container;
}
