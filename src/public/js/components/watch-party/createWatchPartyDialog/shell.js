// Watch party dialog shell: opening and closing via openModal, plus the debounced search input.
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

      // A party the user is still part of: "Weiterschauen" first.
      const parties = await ctx.loadRecentParties();
      if (!ctx.open) return;
      if (parties.length > 0) {
        ctx.showContinueChoice(item);
        return;
      }
      ctx.showPickMediaView();
      if (item) await ctx.startFor(item);
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
