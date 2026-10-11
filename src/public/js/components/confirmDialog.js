import { createElement } from '../utils/dom.js';
import { openModal } from '../utils/modal.js';

// Small yes/no question in the app's dialog style. Resolves true for the
// confirm button, false for "Nein", Escape, a click on the backdrop or when
// the page is left.
export function confirmDialog({ title, message, confirmLabel = 'Ja', cancelLabel = 'Nein' }) {
  return new Promise((resolve) => {
    let result = false;

    const cancelButton = createElement('button', {
      type: 'button',
      className: 'btn-secondary confirm-dialog-cancel',
      onClick: () => modal.close()
    }, cancelLabel);

    const confirmButton = createElement('button', {
      type: 'button',
      className: 'btn-primary confirm-dialog-confirm',
      onClick: () => {
        result = true;
        modal.close();
      }
    }, confirmLabel);

    const card = createElement('div', {
      className: 'confirm-dialog',
      role: 'alertdialog',
      'aria-labelledby': 'confirm-dialog-title',
      'aria-describedby': message ? 'confirm-dialog-message' : null
    },
      createElement('h3', { className: 'confirm-dialog-title', id: 'confirm-dialog-title' }, title),
      message ? createElement('p', { className: 'confirm-dialog-message', id: 'confirm-dialog-message' }, message) : null,
      createElement('div', { className: 'confirm-dialog-actions' }, cancelButton, confirmButton)
    );

    const overlay = createElement('div', { className: 'confirm-dialog-overlay' }, card);

    const modal = openModal({
      overlay,
      dialog: card,
      initialFocus: confirmButton,
      onClose: () => resolve(result)
    });
  });
}
