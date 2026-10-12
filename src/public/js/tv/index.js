import { ensurePageStyles } from '../utils/pageStyles.js';

// Everything the 10-foot interface needs on top of the normal app; loaded
// only in TV mode (see app.js).
export async function startTvMode() {
  document.documentElement.classList.add('tv-mode');
  await ensurePageStyles(['tv']);
}
