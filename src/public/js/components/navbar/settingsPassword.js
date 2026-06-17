import { createElement } from '../../utils/dom.js';

export function createPasswordForm(onChangePassword) {
  const currentPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Aktuelles Passwort'
  });

  const newPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort'
  });

  const confirmPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort bestätigen'
  });

  const settingsStatus = createElement('div', {
    className: 'settings-status',
    'aria-live': 'polite'
  });

  const submitBtn = createElement('button', {
    className: 'settings-submit',
    type: 'submit'
  }, 'Passwort speichern');

  const setStatus = (message, type = '') => {
    settingsStatus.textContent = message;
    settingsStatus.className = `settings-status ${type}`.trim();
  };

  const handlePasswordSubmit = async () => {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword) {
      setStatus('Bitte ein neues Passwort eingeben.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('Die neuen Passwörter stimmen nicht überein.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Speichere...');

    try {
      await onChangePassword?.({ currentPassword, newPassword });
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      setStatus('Passwort wurde geändert.', 'success');
    } catch (error) {
      setStatus(error.message || 'Passwort konnte nicht geändert werden.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  };

  const form = createElement('form', {
    className: 'settings-password-form',
    onSubmit: async (event) => {
      event.preventDefault();
      await handlePasswordSubmit();
    }
  },
    currentPasswordInput,
    newPasswordInput,
    confirmPasswordInput,
    submitBtn,
    settingsStatus
  );

  return { form, setStatus };
}
