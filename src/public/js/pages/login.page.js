import { createElement } from '../utils/dom.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';

export default function LoginPage() {
  const handleLogin = async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
      appStore.showToast('Bitte Benutzernamen eingeben', 'error');
      return;
    }

    appStore.setLoading(true);
    try {
      await authStore.login(username, password);
      appStore.showToast('Erfolgreich angemeldet!', 'success');
      window.location.hash = '#/home';
    } catch (error) {
      console.error(error);
      appStore.showToast(error.message || 'Login fehlgeschlagen. Bitte überprüfe deine Daten.', 'error');
    } finally {
      appStore.setLoading(false);
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

  const loginForm = createElement('form', {
    className: 'login-form',
    onSubmit: handleLogin
  },
    createElement('div', { className: 'form-group' },
      createElement('label', { for: 'login-username' }, 'Benutzername'),
      usernameInput
    ),
    createElement('div', { className: 'form-group' },
      createElement('label', { for: 'login-password' }, 'Passwort'),
      passwordInput
    ),
    createElement('button', {
      type: 'submit',
      className: 'btn-login'
    }, 'Anmelden')
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
