// The single modal helper of the admin area (overlay, close button, Escape,
// backdrop click), shared by the confirmation dialogs and the user detail view.
import { createElement } from '../../utils/dom.js';
import { createCloseIcon } from '../navbar/icons.js';
import { bindSheetSwipe } from '../../utils/sheetSwipe.js';
import { openModal } from '../../utils/modal.js';

// Every open overlay lives on document.body, which the router never clears.
// The registry lets a page close whatever is still open when it goes away.
const openModals = new Set();

export function closeAllAdminModals() {
  for (const modal of [...openModals]) modal.close();
}

// `variant` adds an overlay class for width and stacking: the detail view is
// wider and must sit below the confirmations opened from it.
export function openAdminModal(contentEl, { variant = '', onClose } = {}) {
  const overlay = createElement('div', {
    className: `admin-user-dialog-overlay${variant ? ` ${variant}` : ''}`
  });

  const closeBtn = createElement('button', {
    className: 'admin-user-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: () => modal.close()
  }, createCloseIcon());

  const card = createElement('div', { className: 'admin-user-dialog' }, closeBtn, contentEl);
  overlay.appendChild(card);

  let unbindSwipe = null;
  const handle = { close: () => modal.close(), element: overlay };

  const modal = openModal({
    overlay,
    dialog: card,
    // The dialog itself takes focus: its first control may be a destructive one.
    initialFocus: card,
    onClose: () => {
      unbindSwipe?.();
      openModals.delete(handle);
      onClose?.();
    }
  });

  // On a phone the dialog is a sheet: swiping it down closes it.
  unbindSwipe = bindSheetSwipe({ sheet: card, onDismiss: () => modal.close() });
  openModals.add(handle);

  return handle;
}
