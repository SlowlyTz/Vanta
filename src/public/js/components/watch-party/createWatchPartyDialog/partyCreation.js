import { createElement } from '../../../utils/dom.js';
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

  ctx.showResumeChoice = snapshot => {
    ctx.currentView = 'resume-choice';
    ctx.titleEl.textContent = 'Watch Party starten';
    ctx.backButton.hidden = true;
    ctx.searchInput.hidden = true;
    ctx.seasonTabs.hidden = true;
    ctx.setStatus('');
    ctx.resultsList.innerHTML = '';
    ctx.resultsList.className = 'watch-party-choice-list';

    ctx.resultsList.appendChild(
      createElement('li', { className: 'watch-party-choice-item' },
        createElement('button', {
          className: 'watch-party-choice-button',
          type: 'button',
          onClick: () => ctx.showPickMediaView()
        },
          createElement('span', { className: 'watch-party-choice-title' }, 'Neue Party starten'),
          createElement('span', { className: 'watch-party-choice-meta' }, 'Film oder Serie auswählen')
        )
      )
    );

    ctx.resultsList.appendChild(
      createElement('li', { className: 'watch-party-choice-item' },
        createElement('button', {
          className: 'watch-party-choice-button',
          type: 'button',
          onClick: () => ctx.handleResume(snapshot)
        },
          createElement('span', { className: 'watch-party-choice-title' }, 'Letzte Party fortsetzen'),
          createElement('span', { className: 'watch-party-choice-meta' }, snapshot.itemSnapshot?.name || '')
        )
      )
    );
  };

  ctx.handleResume = async snapshot => {
    if (ctx.creating) return;
    ctx.creating = true;
    ctx.setStatus('Watch Party wird fortgesetzt …');
    ctx.resultsList.querySelectorAll('button').forEach(button => { button.disabled = true; });

    try {
      const { party } = await WatchPartyApi.resume(snapshot.originalPartyId);
      ctx.setOpen(false);
      window.location.hash = `#/watch-party/${party.id}`;
    } catch (error) {
      console.error('[Watch Party Resume Error]', error);
      appStore.showToast(error.message || 'Watch Party konnte nicht fortgesetzt werden', 'error');
      ctx.showPickMediaView();
    } finally {
      ctx.creating = false;
    }
  };

  return ctx;
}
