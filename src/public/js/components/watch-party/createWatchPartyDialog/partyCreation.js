import { WatchPartyApi } from '../../../api/watch-party.api.js';
import { appStore } from '../../../store/app.store.js';

export function bindPartyCreation(ctx) {
  ctx.handleSelect = async item => {
    if (item.Type === 'Series') {
      await ctx.showEpisodePicker(item);
      return;
    }
    await ctx.createPartyForItem(item.Id);
  };

  ctx.createPartyForItem = async itemId => {
    if (ctx.creating) return;
    ctx.creating = true;
    ctx.setStatus('Watch Party wird vorbereitet …');
    ctx.resultsList.querySelectorAll('button').forEach(button => { button.disabled = true; });

    try {
      const { party } = await WatchPartyApi.create(itemId);
      ctx.setOpen(false);
      window.location.hash = `#/watch-party/${party.id}`;
    } catch (error) {
      console.error('[Watch Party Create Error]', error);
      appStore.showToast(error.message || 'Watch Party konnte nicht erstellt werden', 'error');
      ctx.setStatus('Erstellung fehlgeschlagen. Bitte versuche es erneut.');
      ctx.resultsList.querySelectorAll('button').forEach(button => { button.disabled = false; });
    } finally {
      ctx.creating = false;
    }
  };

  return ctx;
}
