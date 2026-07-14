import { WatchPartyApi } from '../../../api/watch-party.api.js';

const SEARCH_DEBOUNCE_MS = 300;

export function bindShell(ctx) {
  ctx.searchInput.addEventListener('input', () => {
    window.clearTimeout(ctx.debounceTimer);
    ctx.debounceTimer = window.setTimeout(() => ctx.performSearch(ctx.searchInput.value), SEARCH_DEBOUNCE_MS);
  });

  ctx.setOpen = async nextOpen => {
    if (ctx.open === nextOpen) return;
    ctx.open = nextOpen;

    if (ctx.open) {
      ctx.lastFocusedElement = document.activeElement;
      ctx.backdrop.classList.add('open');
      ctx.backdrop.setAttribute('aria-hidden', 'false');

      try {
        const { party: snapshot } = await WatchPartyApi.resumable();
        if (!ctx.open) return;
        if (snapshot) ctx.showResumeChoice(snapshot);
        else ctx.showPickMediaView();
      } catch (error) {
        console.error('[Watch Party Resumable Check Error]', error);
        if (ctx.open) ctx.showPickMediaView();
      }
    } else {
      ctx.backdrop.classList.remove('open');
      ctx.backdrop.setAttribute('aria-hidden', 'true');
      window.clearTimeout(ctx.debounceTimer);
      ctx.lastFocusedElement?.focus?.();
      ctx.lastFocusedElement = null;
    }
  };

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ctx.open) ctx.setOpen(false);
  });

  return ctx;
}
