import { createElement } from '../../../utils/dom.js';

function openDialog(contentEl) {
  let closed = false;

  const overlay = createElement('div', { className: 'admin-user-dialog-overlay' });

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  const closeBtn = createElement('button', {
    className: 'admin-user-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: close
  }, '×');

  const card = createElement('div', {
    className: 'admin-user-dialog',
    role: 'dialog',
    'aria-modal': 'true'
  }, closeBtn, contentEl);

  overlay.appendChild(card);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);

  return { close };
}

export function openBanDialog({ user, onConfirm }) {
  let dialog;

  const reasonInput = createElement('textarea', {
    className: 'settings-input admin-user-dialog-textarea',
    placeholder: 'Grund für die Sperre...',
    rows: 3
  });
  const errorEl = createElement('div', { className: 'admin-user-dialog-error hidden' });

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  };

  const confirmBtn = createElement('button', {
    className: 'btn-primary',
    type: 'button',
    onClick: async () => {
      const reason = reasonInput.value.trim();
      if (!reason) {
        showError('Ein Grund ist erforderlich.');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-busy', 'true');
      errorEl.classList.add('hidden');

      try {
        await onConfirm(reason);
        dialog.close();
      } catch (error) {
        showError(error.message || 'Sperren fehlgeschlagen.');
        confirmBtn.disabled = false;
        confirmBtn.removeAttribute('aria-busy');
      }
    }
  }, 'Sperren');

  const cancelBtn = createElement('button', {
    className: 'btn-secondary',
    type: 'button',
    onClick: () => dialog.close()
  }, 'Abbrechen');

  const content = createElement('div', { className: 'admin-user-dialog-content' },
    createElement('h3', {}, `${user.name} sperren`),
    createElement('p', { className: 'admin-user-dialog-hint' }, 'Der Nutzer kann sich danach nicht mehr anmelden, bis die Sperre aufgehoben wird.'),
    createElement('label', { className: 'admin-user-field-label' }, 'Grund'),
    reasonInput,
    errorEl,
    createElement('div', { className: 'admin-user-dialog-actions' }, cancelBtn, confirmBtn)
  );

  dialog = openDialog(content);
  reasonInput.focus();
  return dialog;
}

export function openDeleteDialog({ user, onConfirm }) {
  let dialog;

  const confirmInput = createElement('input', {
    className: 'settings-input',
    type: 'text',
    placeholder: user.name,
    autocomplete: 'off'
  });
  const errorEl = createElement('div', { className: 'admin-user-dialog-error hidden' });

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  };

  const confirmBtn = createElement('button', {
    className: 'btn-primary admin-user-dialog-danger',
    type: 'button',
    onClick: async () => {
      if (confirmInput.value !== user.name) {
        showError('Der eingegebene Name stimmt nicht überein.');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-busy', 'true');
      errorEl.classList.add('hidden');

      try {
        await onConfirm();
        dialog.close();
      } catch (error) {
        showError(error.message || 'Löschen fehlgeschlagen.');
        confirmBtn.disabled = false;
        confirmBtn.removeAttribute('aria-busy');
      }
    }
  }, 'Endgültig löschen');

  const cancelBtn = createElement('button', {
    className: 'btn-secondary',
    type: 'button',
    onClick: () => dialog.close()
  }, 'Abbrechen');

  const content = createElement('div', { className: 'admin-user-dialog-content' },
    createElement('h3', {}, `${user.name} löschen`),
    createElement('p', { className: 'admin-user-dialog-hint' },
      `Diese Aktion kann nicht rückgängig gemacht werden. Gib "${user.name}" ein, um zu bestätigen.`),
    confirmInput,
    errorEl,
    createElement('div', { className: 'admin-user-dialog-actions' }, cancelBtn, confirmBtn)
  );

  dialog = openDialog(content);
  confirmInput.focus();
  return dialog;
}
