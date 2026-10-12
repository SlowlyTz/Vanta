import { ensurePageStyles } from '../utils/pageStyles.js';
import { normalizeKey, registerTizenKeys } from './keys.js';
import { createBackHandler } from './back.js';
import { bindFocusEngine, createFocusEngine } from './focusEngine.js';

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
  bindFocusEngine(focus);

  await ensurePageStyles(['tv']);
  return { back, focus };
}
