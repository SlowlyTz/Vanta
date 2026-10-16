import { getTopModal } from '../utils/modal.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { normalizeKey } from './keys.js';

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

// What "Zurück" on a remote does, in this order: close the top dialog, close
// the sidebar, leave the player, ask before leaving VANTA from the home page,
// else go back a page.
export function createBackHandler({
  topModal = getTopModal,
  sidebar = null,
  hash = () => window.location.hash || '#/home',
  history = window.history,
  confirm = confirmDialog,
  exit = exitApp
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

// Back last: a dialog or the player's flyouts that handle the key themselves
// stop it first (preventDefault and stopPropagation). webOS would otherwise
// leave the app on its Back key. Inside the player, vidstack's controls call
// preventDefault on every key without handling Back, so there a prevented key
// that still arrives here is Back for the app.
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
