import { createElement } from '../../utils/dom.js';
import { createCloseIcon } from '../navbar/icons.js';
import { bindSheetSwipe } from '../../utils/sheetSwipe.js';

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
  let closed = false;
  const previouslyFocused = document.activeElement;

  const overlay = createElement('div', {
    className: `admin-user-dialog-overlay${variant ? ` ${variant}` : ''}`
  });

  let unbindSwipe = null;

  const close = () => {
    if (closed) return;
    closed = true;
    unbindSwipe?.();
    openModals.delete(handle);
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    previouslyFocused?.focus?.();
    onClose?.();
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  const closeBtn = createElement('button', {
    className: 'admin-user-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: close
  }, createCloseIcon());

  const card = createElement('div', {
    className: 'admin-user-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1'
  }, closeBtn, contentEl);

  overlay.appendChild(card);
  // On a phone the dialog is a sheet: swiping it down closes it.
  unbindSwipe = bindSheetSwipe({ sheet: card, onDismiss: close });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);
  window.requestAnimationFrame?.(() => card.focus?.());

  const handle = { close, element: overlay };
  openModals.add(handle);

  return handle;
}
