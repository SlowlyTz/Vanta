import { getBackdropUrlFor, cssUrl } from '../utils/image.js';

const DELAY_MS = 300;

// TV home and lists: the backdrop of the focused card fades in behind the
// page, a moment after the focus settled (not on every step through a row).
// A page opts in with [data-tv-backdrop] on its root.
export function bindFocusBackdrop({ doc = document, win = window } = {}) {
  const layer = doc.createElement('div');
  layer.className = 'tv-focus-backdrop';
  layer.setAttribute('aria-hidden', 'true');
  doc.body.prepend(layer);
  let timer = null;
  let shownId = null;

  const show = (card) => {
    // OK pressed before the delay ran out: the card is gone with its page.
    if (!card.isConnected || !card.closest('[data-tv-backdrop]')) return;
    const { backdropId: id, backdropTag: tag } = card.dataset;
    if (!id || !tag || id === shownId) return;
    shownId = id;
    const next = doc.createElement('div');
    next.className = 'tv-focus-backdrop-image';
    next.style.backgroundImage = cssUrl(getBackdropUrlFor({ Id: id, BackdropImageTags: [tag] }, Math.min(win.innerWidth, 1280) / (win.devicePixelRatio || 1)));
    layer.appendChild(next);
    win.requestAnimationFrame(() => next.classList.add('is-visible'));
    [...layer.children].slice(0, -1).forEach(old => win.setTimeout(() => old.remove(), 600));
  };

  const clear = () => {
    shownId = null;
    [...layer.children].forEach(old => {
      old.classList.remove('is-visible');
      win.setTimeout(() => old.remove(), 600);
    });
  };
  // Only pages that ask for it (home, lists, search) show it, and only while
  // a card has the focus.
  const onFocus = event => {
    const card = event.target.closest?.('.media-card[data-item-id]');
    win.clearTimeout(timer);
    if (!card || !card.closest('[data-tv-backdrop]')) {
      if (!event.target.closest?.('.tv-sidebar')) clear();
      return;
    }
    timer = win.setTimeout(() => show(card), DELAY_MS);
  };
  const onPage = () => {
    win.clearTimeout(timer);
    clear();
  };
  doc.addEventListener('focusin', onFocus);
  win.addEventListener('vanta:page-shown', onPage);
  return () => {
    doc.removeEventListener('focusin', onFocus);
    win.removeEventListener('vanta:page-shown', onPage);
    layer.remove();
  };
}
