// The remote's Back key in TV mode, and leaving the app.
import { getTopModal } from '../utils/modal.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { normalizeKey } from '../shared/remoteKeys.js';

// Leaves VANTA the way the TV knows: Samsung's runtime ends the app, webOS
// hands Back to the system. A plain browser tab cannot be closed by a page,
// so there nothing happens.
export function exitApp(win = window) {
  try {
    const app = win.tizen?.application?.getCurrentApplication?.();
    if (app) {
      app.exit();
      return true;
    }
    if (typeof win.webOS?.platformBack === 'function') {
      win.webOS.platformBack();
      return true;
    }
  } catch {
    // not a TV runtime
  }
  return false;
}

// A page can take one Back step for itself (a filter panel it closes): it
// cancels this event.
export const TV_BACK_EVENT = 'vanta:tv-back';

// What "Zurück" on a remote does, in this order: close the top dialog, close
// the sidebar, a step of the page itself, leave the player, ask before
// leaving VANTA from the home page, else go back a page.
export function createBackHandler({
  topModal = getTopModal,
  sidebar = null,
  hash = () => window.location.hash || '#/home',
  history = window.history,
  confirm = confirmDialog,
  exit = exitApp,
  win = window
} = {}) {
  let asking = false;
  return async function back() {
    const modal = topModal();
    if (modal) {
      if (modal.back?.()) return 'modal-step';
      modal.close();
      return 'modal';
    }
    if (sidebar?.isOpen?.()) {
      sidebar.close();
      return 'sidebar';
    }
    if (!win.dispatchEvent(new CustomEvent(TV_BACK_EVENT, { cancelable: true }))) return 'page-step';
    const current = hash();
    if (current.startsWith('#/player/')) {
      history.back();
      return 'player';
    }
    if (current === '#/home' || current === '#/' || current === '' || current === '#/login') {
      if (asking) return 'asking';
      asking = true;
      try {
        const leave = await confirm({ title: 'VANTA verlassen?', message: 'Möchtest du die App schließen?', confirmLabel: 'Verlassen', cancelLabel: 'Bleiben', focusCancel: true });
        if (leave) exit();
        return leave ? 'exit' : 'stay';
      } finally {
        asking = false;
      }
    }
    history.back();
    return 'history';
  };
}

// Back runs last: dialogs and player flyouts that handle the key stop it
// first, else webOS would leave the app. Inside the player vidstack prevents
// every key without handling Back, so a prevented Back there is still ours.
export function bindBackKey(back, win = window) {
  const onKeydown = event => {
    if (normalizeKey(event) !== 'back') return;
    if (event.defaultPrevented && !event.target?.closest?.('media-player, .vanta-player-root')) return;
    event.preventDefault();
    back();
  };
  win.addEventListener('keydown', onKeydown);
  return () => win.removeEventListener('keydown', onKeydown);
}
