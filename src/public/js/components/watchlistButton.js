import { createElement } from '../utils/dom.js';
import { appStore } from '../store/app.store.js';
import { watchlistStore } from '../store/watchlist.store.js';

export const BOOKMARK_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Adds or removes a title from "Meine Liste" and follows the list when it
// changes elsewhere (a context menu, another card). `scope` ends the
// subscription with the page.
export function createWatchlistButton(item, { scope = null } = {}) {
  if (item?.Type !== 'Movie' && item?.Type !== 'Series') return null;

  const button = createElement('button', { type: 'button', className: 'watchlist-button' });
  let pending = false;

  const render = () => {
    const saved = watchlistStore.has(item.Id);
    const label = saved ? 'In meiner Liste' : 'Meine Liste';
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    // The visible label is hidden on phones and the icons are aria-hidden:
    // the name has to sit on the button itself.
    button.setAttribute('aria-label', label);
    button.innerHTML = `<span class="watchlist-button-icon">${BOOKMARK_ICON}<span class="watchlist-button-mark">${saved ? CHECK_ICON : PLUS_ICON}</span></span><span class="watchlist-button-label" aria-hidden="true">${label}</span>`;
  };

  button.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    try {
      const saved = await watchlistStore.toggle(item.Id);
      appStore.showToast(saved ? 'Zu meiner Liste hinzugefügt' : 'Aus meiner Liste entfernt', 'success');
    } catch (error) {
      appStore.showToast(error.message || 'Meine Liste konnte nicht geändert werden', 'error');
    } finally {
      pending = false;
    }
  });

  render();
  const unsubscribe = watchlistStore.subscribe(render);
  scope?.onLeave?.(unsubscribe);
  return button;
}
