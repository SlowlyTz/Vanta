import { WatchPartyApi } from '../../../api/watch-party.api.js';
import { openModal } from '../../../utils/modal.js';

const SEARCH_DEBOUNCE_MS = 300;

export function bindShell(ctx) {
  ctx.searchInput.addEventListener('input', () => {
    window.clearTimeout(ctx.debounceTimer);
    ctx.debounceTimer = window.setTimeout(() => ctx.performSearch(ctx.searchInput.value), SEARCH_DEBOUNCE_MS);
  });

  ctx.setOpen = async (nextOpen, { item = null } = {}) => {
    if (ctx.open === nextOpen) return;
    ctx.open = nextOpen;

    if (ctx.open) {
      ctx.backdrop.classList.add('open');
      ctx.backdrop.setAttribute('aria-hidden', 'false');
      // Focus, Escape, the scroll lock and closing with the page: openModal.
      ctx.modal = openModal({
        overlay: ctx.backdrop,
        dialog: ctx.dialog,
        initialFocus: ctx.searchInput,
        removeOnClose: false,
        closeOnBackdrop: false,
        onClose: () => ctx.setOpen(false)
      });

      void ctx.loadRecentParties?.();
      try {
        const { party: snapshot } = await WatchPartyApi.resumable();
        if (!ctx.open) return;
        if (snapshot) ctx.showResumeChoice(snapshot);
        else ctx.showPickMediaView();
        if (!snapshot && item) await ctx.handleSelect(item);
      } catch (error) {
        console.error('[Watch Party Resumable Check Error]', error);
        if (ctx.open) ctx.showPickMediaView();
      }
    } else {
      ctx.backdrop.classList.remove('open');
      ctx.backdrop.setAttribute('aria-hidden', 'true');
      window.clearTimeout(ctx.debounceTimer);
      const modal = ctx.modal;
      ctx.modal = null;
      modal?.close();
    }
  };

  return ctx;
}
