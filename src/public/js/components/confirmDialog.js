import { createElement } from '../utils/dom.js';

// Small yes/no question in the app's dialog style. Resolves true for the
// confirm button, false for "Nein", Escape or a click on the backdrop.
export function confirmDialog({ title, message, confirmLabel = 'Ja', cancelLabel = 'Nein' }) {
  return new Promise((resolve) => {
    let settled = false;
    const previouslyFocused = document.activeElement;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      previouslyFocused?.focus?.();
      resolve(result);
    };

    const onKeydown = (event) => {
      if (event.key === 'Escape') finish(false);
    };

    const cancelButton = createElement('button', {
      type: 'button',
      className: 'btn-secondary confirm-dialog-cancel',
      onClick: () => finish(false)
    }, cancelLabel);

    const confirmButton = createElement('button', {
      type: 'button',
      className: 'btn-primary confirm-dialog-confirm',
      onClick: () => finish(true)
    }, confirmLabel);

    const card = createElement('div', {
      className: 'confirm-dialog',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-dialog-title',
      'aria-describedby': message ? 'confirm-dialog-message' : null
    },
      createElement('h3', { className: 'confirm-dialog-title', id: 'confirm-dialog-title' }, title),
      message ? createElement('p', { className: 'confirm-dialog-message', id: 'confirm-dialog-message' }, message) : null,
      createElement('div', { className: 'confirm-dialog-actions' }, cancelButton, confirmButton)
    );

    const overlay = createElement('div', {
      className: 'confirm-dialog-overlay',
      onClick: (event) => { if (event.target === overlay) finish(false); }
    }, card);

    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);
    window.requestAnimationFrame?.(() => confirmButton.focus());
  });
}
