export function bindGestures(ctx) {
  ctx.handleKeydown = event => {
    if (ctx.shareModal && event.key === 'Escape') {
      event.preventDefault();
      ctx.closeShareModal();
      return;
    }

    if (ctx.state.introOpen) return;
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
          if (trailer) ctx.toggleFavorite(trailer.itemId);
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
    window.removeEventListener('keydown', ctx.handleKeydown);
    window.removeEventListener('hashchange', ctx.handleHashChange);
    window.removeEventListener('pageshow', ctx.resyncActivePlayer);
    window.removeEventListener('focus', ctx.resyncActivePlayer);
    document.removeEventListener('visibilitychange', ctx.handleVisibilityChange);
  });

  window.addEventListener('keydown', ctx.handleKeydown);
  window.addEventListener('hashchange', ctx.handleHashChange);
  window.addEventListener('pageshow', ctx.resyncActivePlayer);
  window.addEventListener('focus', ctx.resyncActivePlayer);
  document.addEventListener('visibilitychange', ctx.handleVisibilityChange);

  return ctx;
}
