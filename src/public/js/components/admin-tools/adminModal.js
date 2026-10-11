import { createElement } from '../../utils/dom.js';
import { createCloseIcon } from '../navbar/icons.js';
import { bindSheetSwipe } from '../../utils/sheetSwipe.js';
import { openModal } from '../../utils/modal.js';

// Einziger Modal-Helfer des Admin-Bereichs: Overlay, Schließen-Button, Escape
// und Backdrop-Klick. Wird sowohl von den Bestätigungsdialogen (Sperren,
// Löschen) als auch von der Nutzer-Detailansicht genutzt, damit es nicht zwei
// Implementierungen mit auseinanderlaufendem Verhalten gibt.
//
// `variant` hängt eine Zusatzklasse ans Overlay, über die Breite und
// Stapelreihenfolge gesteuert werden — die Detailansicht braucht deutlich mehr
// Platz als eine Rückfrage und muss unter den Bestätigungsdialogen liegen, die
// aus ihr heraus geöffnet werden.

// Every open overlay lives on document.body, which the router never clears.
// The registry lets a page close whatever is still open when it goes away.
const openModals = new Set();

export function closeAllAdminModals() {
  for (const modal of [...openModals]) modal.close();
}

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
