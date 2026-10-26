import { createElement } from '../../../utils/dom.js';
import { WatchPartyApi } from '../../../api/watch-party.api.js';
import { appStore } from '../../../store/app.store.js';
import { formatEpisodeCode, getPosterUrl, itemTypeLabel } from './context.js';

export function bindPartyCreation(ctx) {
  ctx.handleSelect = async item => {
    if (item.Type === 'Series') {
      await ctx.showEpisodePicker(item);
      return;
    }
    ctx.showConfirm(item);
  };

  // "Watch Party starten" on a title already is the choice: a film starts
  // at once, a series still needs its episode.
  ctx.startFor = async item => {
    if (item.Type === 'Series') await ctx.showEpisodePicker(item);
    else await ctx.createPartyForItem(item.Id);
  };

  // A title picked in the dialog is confirmed before the party exists, so a misclick does
  // not open a lobby. Zurück restores the list it came from as it was.
  ctx.showConfirm = item => {
    const previous = {
      view: ctx.currentView,
      title: ctx.titleEl.textContent,
      className: ctx.resultsList.className,
      nodes: [...ctx.resultsList.childNodes],
      backHidden: ctx.backButton.hidden,
      searchHidden: ctx.searchInput.hidden,
      tabsHidden: ctx.seasonTabs.hidden
    };
    ctx.restoreBeforeConfirm = () => {
      ctx.currentView = previous.view;
      ctx.titleEl.textContent = previous.title;
      ctx.resultsList.className = previous.className;
      ctx.resultsList.replaceChildren(...previous.nodes);
      ctx.backButton.hidden = previous.backHidden;
      ctx.searchInput.hidden = previous.searchHidden;
      ctx.seasonTabs.hidden = previous.tabsHidden;
      ctx.setStatus('');
    };

    ctx.currentView = 'confirm';
    ctx.titleEl.textContent = 'Watch Party starten';
    ctx.backButton.hidden = false;
    ctx.searchInput.hidden = true;
    ctx.seasonTabs.hidden = true;
    ctx.setStatus('');
    ctx.resultsList.className = 'watch-party-confirm';

    const isEpisode = item.Type === 'Episode';
    const title = isEpisode ? item.SeriesName || item.Name : item.Name;
    const meta = isEpisode
      ? `${formatEpisodeCode(item)} · ${item.Name || ''}`
      : [itemTypeLabel(item), item.ProductionYear].filter(Boolean).join(' · ');
    const start = createElement('button', {
      className: 'ui-button ui-button-primary',
      type: 'button',
      onClick: () => ctx.createPartyForItem(item.Id)
    }, 'Watch Party starten');
    ctx.resultsList.replaceChildren(createElement('li', { className: 'watch-party-confirm-item' },
      createElement('img', { className: 'watch-party-confirm-poster', src: getPosterUrl(isEpisode && item.SeriesId ? { Id: item.SeriesId, ImageTags: { Primary: item.SeriesPrimaryImageTag } } : item), alt: '' }),
      createElement('div', { className: 'watch-party-confirm-text' },
        createElement('strong', { className: 'watch-party-confirm-title' }, title || 'Unbenannt'),
        createElement('span', { className: 'watch-party-confirm-meta' }, meta)
      ),
      createElement('div', { className: 'watch-party-confirm-actions' },
        start,
        createElement('button', { className: 'ui-button ui-button-ghost', type: 'button', onClick: () => ctx.handleBack() }, 'Zurück')
      )
    ));
    start.focus({ preventScroll: true });
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
