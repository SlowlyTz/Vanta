import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { WatchPartyApi } from '../../../api/watch-party.api.js';
import { itemTypeLabel, getPosterUrl } from './context.js';

export function bindSearch(ctx) {
  ctx.renderCards = items => {
    ctx.resultsList.innerHTML = '';
    ctx.resultsList.className = 'watch-party-card-grid';

    if (!items.length) {
      ctx.resultsList.appendChild(createElement('li', { className: 'watch-party-empty-state' }, 'Keine Ergebnisse gefunden.'));
      return;
    }

    items.forEach(item => {
      const card = createElement('li', { className: 'watch-party-card-item' },
        createElement('button', {
          className: 'watch-party-card',
          type: 'button',
          disabled: ctx.creating,
          onClick: () => ctx.handleSelect(item)
        },
          createElement('div', { className: 'watch-party-card-poster' },
            createElement('img', { src: getPosterUrl(item), alt: '', loading: 'lazy' }),
            createElement('span', { className: 'watch-party-card-badge' }, itemTypeLabel(item))
          ),
          createElement('span', { className: 'watch-party-card-title' }, item.Name || item.SeriesName || 'Unbenannt'),
          createElement('span', { className: 'watch-party-card-meta' }, item.ProductionYear ? String(item.ProductionYear) : '')
        )
      );
      ctx.resultsList.appendChild(card);
    });
  };

  ctx.loadSuggestions = async () => {
    const runId = ++ctx.searchRunId;
    ctx.setStatus('Vorschläge werden geladen …');
    ctx.resultsList.innerHTML = '';

    try {
      const { items } = await WatchPartyApi.suggestions(18);
      if (runId !== ctx.searchRunId) return;
      ctx.setStatus(items.length ? '' : 'Keine Vorschläge verfügbar.');
      ctx.renderCards(items);
    } catch (error) {
      if (runId !== ctx.searchRunId) return;
      console.error('[Watch Party Suggestions Error]', error);
      ctx.setStatus('Vorschläge konnten nicht geladen werden.');
    }
  };

  ctx.performSearch = async query => {
    const runId = ++ctx.searchRunId;

    if (!query.trim()) {
      ctx.loadSuggestions();
      return;
    }

    ctx.setStatus('Suche läuft …');
    ctx.resultsList.innerHTML = '';

    try {
      const results = await MediaApi.search(query.trim());
      if (runId !== ctx.searchRunId) return;

      const playable = (results || []).filter(item => ['Movie', 'Series', 'Episode'].includes(item.Type));
      ctx.setStatus(playable.length ? '' : `Keine Ergebnisse für "${query}".`);
      ctx.renderCards(playable);
    } catch (error) {
      if (runId !== ctx.searchRunId) return;
      console.error('[Watch Party Search Error]', error);
      ctx.setStatus('Suche fehlgeschlagen. Bitte versuche es erneut.');
    }
  };

  ctx.showPickMediaView = () => {
    ctx.currentView = 'pick-media';
    ctx.titleEl.textContent = 'Watch Party starten';
    ctx.backButton.hidden = true;
    ctx.searchInput.hidden = false;
    ctx.seasonTabs.hidden = true;
    ctx.seasonTabs.innerHTML = '';
    ctx.searchInput.value = '';
    ctx.loadSuggestions();
    window.requestAnimationFrame(() => ctx.searchInput.focus());
  };

  return ctx;
}
