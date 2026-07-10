import { createElement } from '../utils/dom.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { REDIRECT_AFTER_LOGIN_KEY } from '../utils/auth-redirect.js';

const LOGIN_BUTTON_IDLE_TEXT = 'Anmelden';
const LOGIN_BUTTON_BUSY_TEXT = 'Anmeldung läuft…';
const GENERIC_LOGIN_ERROR = 'Login fehlgeschlagen. Bitte überprüfe deine Daten.';

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
      await authStore.login(username, password);
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
    autocomplete: 'username'
  });

  const passwordInput = createElement('input', {
    type: 'password',
    id: 'login-password',
    className: 'form-input',
    placeholder: 'Passwort',
    autocomplete: 'current-password'
  });

  const loginButton = createElement('button', {
    type: 'submit',
    className: 'btn-login'
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
      passwordInput
    ),
    loginButton
  );

  const container = createElement('div', { className: 'login-page' },
    createElement('div', { className: 'login-card' },
      createElement('div', { className: 'login-header' },
        createElement('img', {
          className: 'login-logo',
          src: '/assets/logo-vanta.png',
          alt: 'VANTA'
        }),
        createElement('p', {}, 'Melde dich mit deinem Jellyfin-Konto an')
      ),
      loginForm
    )
  );

  return container;
}
