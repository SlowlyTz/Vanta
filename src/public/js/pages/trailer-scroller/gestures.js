// Trailer scroller: keyboard/remote navigation, intersection tracking and window listeners.

import { getTopModal } from '../../utils/modal.js';

// On a TV the remote's up/down always change the trailer (the focus sits on
// the trailer's buttons, which would otherwise keep the keys), and the focus
// follows onto the new trailer's "Details".
const isTv = () => document.documentElement.classList.contains('tv-mode');

export function bindGestures(ctx) {
  const focusActiveTrailer = () => {
    const button = ctx.track.querySelector('.trailer-slide.is-active .trailer-action-detail');
    button?.focus({ preventScroll: true });
  };

  ctx.handleKeydown = event => {
    if (ctx.shareModal && event.key === 'Escape') {
      event.preventDefault();
      ctx.closeShareModal();
      return;
    }

    if (ctx.state.introOpen) return;
    // An open dialog (settings, watch party, a card's actions) keeps its keys.
    if (!ctx.shareModal && getTopModal()) return;
    if (isTv() && !ctx.shareModal && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.keyCode === 40 || event.keyCode === 38)) {
      if (document.activeElement?.closest?.('.tv-sidebar')) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === 'ArrowUp' || event.keyCode === 38 ? -1 : 1;
      Promise.resolve(ctx.navigateRelative(direction)).then(() => window.setTimeout(focusActiveTrailer, 60));
      return;
    }
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;

    switch (event.key) {
      case 'ArrowDown':
      case ' ':
        event.preventDefault();
        ctx.navigateRelative(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        ctx.navigateRelative(-1);
        break;
      case 'l':
      case 'L':
        {
          const trailer = ctx.state.trailers[ctx.state.activeIndex];
          if (trailer) ctx.toggleWatchlist(trailer.itemId);
        }
        break;
      case 'Enter':
        {
          const trailer = ctx.state.trailers[ctx.state.activeIndex];
          if (trailer) {
            ctx.navigateToDetail(trailer);
          }
        }
        break;
    }
  };

  ctx.intersectionObserver = new IntersectionObserver(entries => {
    if (ctx.suppressIntersectionUpdates) return;

    let bestEntry = null;
    entries.forEach(entry => {
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
        bestEntry = entry;
      }
    });

    if (bestEntry && bestEntry.isIntersecting && bestEntry.intersectionRatio >= 0.5) {
      const index = parseInt(bestEntry.target.dataset.index, 10);
      if (!Number.isNaN(index) && index !== ctx.state.activeIndex) {
        ctx.setActive(index, { scroll: false });
      }
    }
  }, { threshold: [0.5, 0.75, 1] });

  ctx.onCleanup(() => {
    if (ctx.intersectionObserver) ctx.intersectionObserver.disconnect();
    window.removeEventListener('keydown', ctx.handleKeydown, true);
    window.removeEventListener('hashchange', ctx.handleHashChange);
    window.removeEventListener('pageshow', ctx.resyncActivePlayer);
    window.removeEventListener('focus', ctx.resyncActivePlayer);
    document.removeEventListener('visibilitychange', ctx.handleVisibilityChange);
  });

  // Capture: ahead of the TV focus engine, which would move the focus instead.
  window.addEventListener('keydown', ctx.handleKeydown, true);
  window.addEventListener('hashchange', ctx.handleHashChange);
  window.addEventListener('pageshow', ctx.resyncActivePlayer);
  window.addEventListener('focus', ctx.resyncActivePlayer);
  document.addEventListener('visibilitychange', ctx.handleVisibilityChange);

  return ctx;
}
