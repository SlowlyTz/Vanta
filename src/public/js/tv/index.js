import { ensurePageStyles } from '../utils/pageStyles.js';
import { normalizeKey, registerTizenKeys } from './keys.js';
import { createBackHandler } from './back.js';
import { bindFocusEngine, createFocusEngine } from './focusEngine.js';
import { bindFocusBackdrop } from './focusBackdrop.js';

// Everything the 10-foot interface needs on top of the normal app; loaded
// only in TV mode (see app.js).
export async function startTvMode({ sidebar = null } = {}) {
  document.documentElement.classList.add('tv-mode');
  registerTizenKeys();
  const back = createBackHandler({ sidebar });

  // Back last: a dialog or the player's flyouts that handle Escape themselves
  // stop it first. webOS would otherwise leave the app on its Back key.
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || normalizeKey(event) !== 'back') return;
    event.preventDefault();
    back();
  });

  const focus = createFocusEngine();
  bindFocusEngine(focus, {
    openKeyboard: input => import('../components/tv/OnScreenKeyboard.js').then(module => module.openKeyboardFor(input)),
    openActions: card => import('../components/mediaActions.js').then(module => {
      const rect = card.getBoundingClientRect();
      module.openMediaActions(card, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, source: 'remote' });
    })
  });
  bindFocusBackdrop();

  // A pointer remote (LG Magic Remote) shows its cursor while it moves; the
  // arrow keys hide it again.
  const root = document.documentElement;
  window.addEventListener('pointermove', () => root.classList.add('tv-pointer'), { passive: true });
  window.addEventListener('keydown', () => root.classList.remove('tv-pointer'), true);

  await ensurePageStyles(['tv']);
  return { back, focus };
}
